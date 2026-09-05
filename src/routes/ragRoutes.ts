import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from '../utils/db';
import { IngestionManager } from "../services/rag/ingestion/IngestionManager";
import { RAGEngine } from "../services/rag/RAGEngine";
import { IngestionInput, RAGConfiguration } from '../services/rag/types';
import { workflowService } from "../services/workflowService";

export async function ragRoutes(server: FastifyInstance) {
    const ingestionManager = new IngestionManager();
    const ragEngine = new RAGEngine();

    // Enforce JWT authentication across all RAG endpoints
    server.addHook('preValidation', server.authenticate);

    // ==========================================
    // 1. KNOWLEDGE BASE CONTAINERS (CRUD & RBAC)
    // ==========================================

    /**
     * POST /api/rag/knowledge-bases
     * Creates a new Organization or Personal Knowledge Base container.
     */
    server.post('/api/rag/knowledge-bases', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { name, description, scope = 'ORGANIZATION' } = request.body as {
            name: string;
            description?: string;
            scope?: 'ORGANIZATION' | 'PERSONAL';
        };

        const trimmedName = name?.trim();
        if (!trimmedName) {
            return reply.code(400).send({ error: 'Knowledge Base name is required.' });
        }

        try {
            const { role, permissions } = await workflowService.getUserAccess(userId);

            let targetScope = scope;
            let targetCreatedBy: string | null = userId;

            if (role === 'SINGLE') {
                targetScope = 'PERSONAL';
                targetCreatedBy = userId;
            } else if (role === 'ADMIN') {
                if (targetScope === 'ORGANIZATION') {
                    targetCreatedBy = null;
                }
            } else if (role === 'MEMBER') {
                if (targetScope === 'ORGANIZATION') {
                    return reply.code(403).send({
                        error: 'Access Denied: Only administrators can create organization-level knowledge bases.'
                    });
                }
                if (permissions.canCreatePersonalKnowledgeBase !== true) {
                    return reply.code(403).send({
                        error: 'Access Denied: You do not have permission to create personal knowledge bases.'
                    });
                }
                targetScope = 'PERSONAL';
                targetCreatedBy = userId;
            }

            // Check duplicate name inside the same scope
            const existing = await prisma.knowledgeSource.findFirst({
                where: {
                    organizationId: orgId,
                    name: { equals: trimmedName, mode: 'insensitive' },
                    scope: targetScope,
                    ...(targetScope === 'PERSONAL' ? { createdByUserId: targetCreatedBy } : {})
                }
            });

            if (existing) {
                return reply.code(400).send({
                    error: `A ${targetScope.toLowerCase()} knowledge base named "${trimmedName}" already exists.`
                });
            }

            const kb = await prisma.knowledgeSource.create({
                data: {
                    name: trimmedName,
                    description: description?.trim() || null,
                    scope: targetScope,
                    organizationId: orgId,
                    createdByUserId: targetScope === 'PERSONAL' ? targetCreatedBy : null,
                    status: 'PROCESSED',
                    type: 'FILE'
                }
            });

            return reply.code(201).send({
                success: true,
                message: `Knowledge Base "${trimmedName}" created successfully.`,
                knowledgeBase: kb
            });
        } catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    });

    /**
     * GET /api/rag/knowledge-bases
     * Lists all accessible Knowledge Bases (Org KBs + User's Personal KBs).
     */
    server.get('/api/rag/knowledge-bases', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { scope } = request.query as { scope?: string };

        try {
            const { role } = await workflowService.getUserAccess(userId);

            let whereClause: any = { organizationId: orgId };

            if (role === 'SINGLE') {
                whereClause.createdByUserId = userId;
            } else if (role === 'ADMIN') {
                if (scope === 'ORGANIZATION') whereClause.scope = 'ORGANIZATION';
                else if (scope === 'PERSONAL') whereClause.scope = 'PERSONAL';
            } else if (role === 'MEMBER') {
                if (scope === 'ORGANIZATION') {
                    whereClause.scope = 'ORGANIZATION';
                } else if (scope === 'PERSONAL') {
                    whereClause.scope = 'PERSONAL';
                    whereClause.createdByUserId = userId;
                } else {
                    whereClause.OR = [
                        { scope: 'ORGANIZATION' },
                        { scope: 'PERSONAL', createdByUserId: userId }
                    ];
                }
            }

            const knowledgeBases = await prisma.knowledgeSource.findMany({
                where: whereClause,
                include: {
                    _count: {
                        select: { documents: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return reply.code(200).send(knowledgeBases);
        } catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    });

    /**
     * DELETE /api/rag/knowledge-bases/:id
     * Deletes a Knowledge Base and its cascading documents and chunks.
     */
    server.delete('/api/rag/knowledge-bases/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { id } = request.params as { id: string };

        try {
            const { role } = await workflowService.getUserAccess(userId);

            const kb = await prisma.knowledgeSource.findFirst({
                where: { id, organizationId: orgId }
            });

            if (!kb) {
                return reply.code(404).send({ error: 'Knowledge Base not found.' });
            }

            if (role === 'MEMBER') {
                if (kb.scope === 'ORGANIZATION') {
                    return reply.code(403).send({
                        error: 'Access Denied: Only administrators can delete organization-level knowledge bases.'
                    });
                }
                if (kb.scope === 'PERSONAL' && kb.createdByUserId !== userId) {
                    return reply.code(403).send({
                        error: 'Access Denied: You can only delete your own personal knowledge bases.'
                    });
                }
            }

            await prisma.knowledgeSource.delete({
                where: { id }
            });

            return reply.code(200).send({
                success: true,
                message: `Knowledge Base "${kb.name}" deleted successfully.`
            });
        } catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ==========================================
    // 2. DOCUMENT INGESTION & SEARCH
    // ==========================================

    /**
     * POST /api/rag/ingest
     * Ingests a new document into the knowledge base with RBAC verification.
     */
    server.post('/api/rag/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const body = request.body as {
            name: string;
            mimeType: string;
            source?: string;
            content?: string; // Raw text or base64
            base64Buffer?: string;
            config?: Partial<RAGConfiguration>;
            knowledgeSourceId?: string;
        };

        if (!body.name || (!body.content && !body.base64Buffer && !body.source)) {
            return reply.code(400).send({
                error: 'Document name and content (or source) are required for ingestion.',
            });
        }

        try {
            const { role, permissions } = await workflowService.getUserAccess(userId);

            // Verify Knowledge Base Permissions
            if (body.knowledgeSourceId) {
                const kb = await prisma.knowledgeSource.findFirst({
                    where: { id: body.knowledgeSourceId, organizationId: orgId }
                });

                if (!kb) {
                    return reply.code(404).send({ error: 'Target Knowledge Base not found.' });
                }

                if (role === 'MEMBER') {
                    if (kb.scope === 'ORGANIZATION' && permissions.canChangeOrgKnowledgeBase !== true) {
                        return reply.code(403).send({
                            error: 'Access Denied: You do not have permission to upload documents to organization knowledge bases.'
                        });
                    }
                    if (kb.scope === 'PERSONAL' && kb.createdByUserId !== userId) {
                        return reply.code(403).send({
                            error: 'Access Denied: You cannot upload documents to another member\'s personal knowledge base.'
                        });
                    }
                }
            }

            const input: IngestionInput = {
                name: body.name,
                mimeType: body.mimeType || 'text/plain',
                source: body.source || 'Direct Upload',
                contentBuffer: body.base64Buffer
                    ? Buffer.from(body.base64Buffer, 'base64')
                    : body.content
                        ? Buffer.from(body.content, 'utf-8')
                        : undefined,
            };

            const defaultRAGConfig: RAGConfiguration = {
                mode: 'simple',
                useCaseProfile: 'GENERAL_QA',
                ingestion: {
                    parser: 'auto',
                    chunkSize: 800,
                    chunkOverlap: 100,
                    chunkStrategy: 'recursive',
                },
                retrieval: {
                    mode: 'hybrid',
                    topK: 10,
                    vectorWeight: 0.7,
                    keywordWeight: 0.3,
                    minScore: 0.3,
                },
                reranker: {
                    provider: 'none',
                    topN: 5,
                },
                context: {
                    strategy: 'top_chunks',
                    maxTokens: 4000,
                    citationMode: 'inline',
                },
                generation: {
                    enabled: true,
                    provider: 'gemini',
                    model: 'gemini-2.5-flash',
                    temperature: 0.2,
                    systemPrompt: '',
                },
                ...(body.config || {}),
            };

            const documentId = await ingestionManager.ingestDocument(
                orgId,
                input,
                defaultRAGConfig,
                body.knowledgeSourceId
            );

            return reply.code(201).send({
                success: true,
                message: `Document "${body.name}" successfully indexed.`,
                documentId,
            });
        } catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    });

     /**
     * POST /api/rag/query
     * Interactive test endpoint to query the RAG system.
     */

     server.post('/api/rag/query', async (request: FastifyRequest, reply: FastifyReply) => {

        const orgId = request.user.organizationId;
        const { query, config, executionId, nodeId, metadataFilters } = request.body as {
            query: string;
            config?: RAGConfiguration;
            executionId: string;
            nodeId?: string;
            metadataFilters?: Record<string, string>;
        };

        if (!query) {
            return reply.code(400).send({ error: 'Search query is required.' });
        }

        try{
            const activeConfig: RAGConfiguration = {
                mode: 'simple',
                useCaseProfile: 'GENERAL_QA',
                ingestion: {
                    parser: 'auto',
                    chunkSize: 800,
                    chunkOverlap: 100,
                    chunkStrategy: 'recursive',
                },
                retrieval: {
                    mode: 'hybrid',
                    topK: 10,
                    vectorWeight: 0.7,
                    keywordWeight: 0.3,
                    minScore: 0.3,
                },
                reranker: {
                    provider: 'none',
                    topN: 5,
                },
                context: {
                    strategy: 'top_chunks',
                    maxTokens: 4000,
                    citationMode: 'inline',
                },
                generation: {
                    enabled: true,
                    provider: 'gemini',
                    model: 'gemini-2.5-flash',
                    temperature: 0.2,
                    systemPrompt: '',
                },
                ...(config || {}),
            };

             const result = await ragEngine.execute({
                orgId,
                query,
                config: activeConfig,
                executionId,
                nodeId,
                metadataFilters,
            });

             return reply.code(200).send(result);
        }catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
     });



    /**
     * GET /api/rag/documents
     * Returns all accessible indexed documents for the organization/user.
     */
    server.get('/api/rag/documents', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { knowledgeSourceId } = request.query as { knowledgeSourceId?: string };

        try {
            const { role } = await workflowService.getUserAccess(userId);

            const whereClause: any = { organizationId: orgId };

            if (knowledgeSourceId) {
                whereClause.knowledgeSourceId = knowledgeSourceId;
            }

            // Restrict members to accessible knowledge sources
            if (role === 'MEMBER') {
                whereClause.OR = [
                    { knowledgeSourceId: null },
                    { knowledgeSource: { scope: 'ORGANIZATION' } },
                    { knowledgeSource: { scope: 'PERSONAL', createdByUserId: userId } }
                ];
            } else if (role === 'SINGLE') {
                whereClause.OR = [
                    { knowledgeSourceId: null },
                    { knowledgeSource: { createdByUserId: userId } }
                ];
            }

            const documents = await prisma.document.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    mimeType: true,
                    source: true,
                    format: true,
                    knowledgeSourceId: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { chunks: true },
                    },
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            return reply.code(200).send({ documents });
        } catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    });

    /**
     * DELETE /api/rag/documents/:id
     * Deletes a document and its cascading chunks & metadata with RBAC verification.
     */
    server.delete('/api/rag/documents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const { id } = request.params as { id: string };

        try {
            const { role, permissions } = await workflowService.getUserAccess(userId);

            const doc = await prisma.document.findFirst({
                where: { id, organizationId: orgId },
                include: { knowledgeSource: true }
            });

            if (!doc) {
                return reply.code(404).send({ error: 'Document not found or access denied.' });
            }

            // Verify Permissions
            if (role === 'MEMBER' && doc.knowledgeSource) {
                if (doc.knowledgeSource.scope === 'ORGANIZATION' && permissions.canChangeOrgKnowledgeBase !== true) {
                    return reply.code(403).send({
                        error: 'Access Denied: You do not have permission to delete documents from organization knowledge bases.'
                    });
                }
                if (doc.knowledgeSource.scope === 'PERSONAL' && doc.knowledgeSource.createdByUserId !== userId) {
                    return reply.code(403).send({
                        error: 'Access Denied: You cannot delete documents from another member\'s personal knowledge base.'
                    });
                }
            }

            await prisma.document.delete({
                where: { id },
            });

            return reply.code(200).send({
                success: true,
                message: `Document "${doc.name}" deleted successfully.`,
            });
        } catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    });

    /**
   * GET /api/rag/traces/:executionId/:nodeId
   * Retrieves telemetry trace for an executed RAG node with tenant isolation.
   */
    server.get(
        '/api/rag/traces/:executionId/:nodeId',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const orgId = request.user.organizationId;
            const { executionId, nodeId } = request.params as { executionId: string, nodeId: string };
            try {
                const trace = await prisma.ragTrace.findFirst({
                    where: { 
                        executionId, 
                        nodeId,
                        execution: {
                            organizationId: orgId
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                if (!trace) {
                    return reply.code(404).send({ error: 'RAG Trace not found.' });
                }
                return reply.code(200).send({
                    trace
                });
            } catch (err: any) {
                server.log.error(err);
                return reply.code(500).send({ error: err.message });
            }
        });

    /**
   * GET /api/rag/trace/:traceId
   * Retrieves telemetry trace directly by traceId with tenant isolation.
   */
    server.get(
        '/api/rag/trace/:traceId',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const orgId = request.user.organizationId;
            const { traceId } = request.params as { traceId: string };
            try {
                const trace = await prisma.ragTrace.findFirst({
                    where: { 
                        id: traceId,
                        execution: {
                            organizationId: orgId
                        }
                    },
                });
                if (!trace) {
                    return reply.code(404).send({ error: 'RAG Trace not found.' });
                }
                return reply.code(200).send({
                    trace
                });
            } catch (err: any) {
                server.log.error(err);
                return reply.code(500).send({ error: err.message });
            }
        });

    /**
   * GET /api/rag/traces/node/:nodeId
   * Retrieves the latest telemetry trace for a node in the organization.
   */
    server.get(
        '/api/rag/traces/node/:nodeId',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const orgId = request.user.organizationId;
            const { nodeId } = request.params as { nodeId: string };
            try {
                const trace = await prisma.ragTrace.findFirst({
                    where: {
                        nodeId,
                        execution: {
                            organizationId: orgId
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                if (!trace) {
                    return reply.code(404).send({ error: 'RAG Trace not found for this node.' });
                }
                return reply.code(200).send({ trace });
            } catch (err: any) {
                server.log.error(err);
                return reply.code(500).send({ error: err.message });
            }
        });



    /**
* GET /api/rag/export/:documentId
* Exports a document in Open Knowledge Format (OKF) Markdown representation.
*/

    server.get('/api/rag/export/:documentId', async (request: FastifyRequest, reply: FastifyReply) => {

        const orgId = request.user.organizationId;
        const userId = request.user.id;
        const role = request.user.role;
        const { documentId } = request.params as { documentId: string };
        try {
            const doc = await prisma.document.findFirst({
                where: { id: documentId, organizationId: orgId },
                include: {
                    knowledgeSource: true,
                    chunks: {
                        include: {
                            metadata: true
                        },
                    },
                },
            });
            if (!doc) {
                return reply.code(404).send({ error: 'Document not found.' });
            }

            // Verify member personal knowledge base privacy
            if (role === 'MEMBER' && doc.knowledgeSource) {
                if (doc.knowledgeSource.scope === 'PERSONAL' && doc.knowledgeSource.createdByUserId !== userId) {
                    return reply.code(403).send({ error: 'Access Denied: You cannot export documents from another member\'s personal knowledge base.' });
                }
            }

            const yamlHeader = `---
title: "${doc.name}"
id: "${doc.id}"
mimeType: "${doc.mimeType || 'text/markdown'}"
source: "${doc.source || 'Local Upload'}"
chunkCount: ${doc.chunks.length}
exportedAt: "${new Date().toISOString()}"
---
`;
            const okfContent = `${yamlHeader}${doc.normalizedContent || doc.rawContent}`;

            reply.header('Content-Type', 'text/markdown; charset=utf-8');
            reply.header('Content-Disposition', `attachment; filename="${doc.name}.md"`);
            return reply.code(200).send(okfContent);
        } catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    });
}