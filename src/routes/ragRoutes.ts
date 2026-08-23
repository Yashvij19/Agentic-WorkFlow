import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from '../utils/db';
import { IngestionManager } from "../services/rag/ingestion/IngestionManager";
import { RAGEngine } from "../services/rag/RAGEngine";
import { IngestionInput, RAGConfiguration } from '../services/rag/types';
import { request } from "http";
import { error } from "console";


export async function ragRoutes(server: FastifyInstance) {
    const ingestionManager = new IngestionManager();
    const ragEngine = new RAGEngine();

    // Enforce JWT authentication across all RAG endpoints
    server.addHook('preValidation', server.authenticate);

    /**
   * POST /api/rag/ingest
   * Ingests a new document into the knowledge base.
   */
    server.post('/api/rag/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
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
            }
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
   * Returns all indexed documents for the organization.
   */
    server.get('/api/rag/documents', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        try {
            const documents = await prisma.document.findMany({
                where: {
                    organizationId: orgId
                },
                select: {
                    id: true,
                    name: true,
                    mimeType: true,
                    source: true,
                    format: true,
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
 * Deletes a document and its cascading chunks & metadata.
 */

    server.delete('/api/rag/documents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const orgId = request.user.organizationId;
        const { id } = request.params as { id: string };

        try {
            const doc = await prisma.document.findFirst({
                where: {
                    id, organizationId: orgId
                },
            });

            if (!doc) {
                return reply.code(404).send({ error: 'Document not found or access denied.' });
            }

            await prisma.document.delete({
                where: { id },
            });

            return reply.code(200).send({
                success: true,
                message: `Document "${doc.name}" deleted successfully.`,
            });
        }
        catch (err: any) {
            server.log.error(err);
            return reply.code(500).send({ error: err.message });
        }
    })

    /**
  * GET /api/rag/traces/:executionId/:nodeId
  * Retrieves telemetry trace for an executed RAG node.
  */

    server.get(
        '/api/rag/traces/:executionId/:nodeId',
        async (request: FastifyRequest, reply: FastifyReply) => {

            const { executionId, nodeId } = request.params as { executionId: string, nodeId: string };
            try {
                const trace = await prisma.ragTrace.findFirst({
                    where: { executionId, nodeId },
                });
                if (!trace) {
                    return reply.code(404).send({ error: 'RAG Trace not found. ' })
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
* GET /api/rag/export/:documentId
* Exports a document in Open Knowledge Format (OKF) Markdown representation.
*/

    server.get('/api/rag/export/:documentId', async (request: FastifyRequest, reply: FastifyReply) => {

        const orgId = request.user.organizationId;
        const { documentId } = request.params as { documentId: string };
        try {
            const doc = await prisma.document.findFirst({
                where: { id: documentId, organizationId: orgId },
                include: {
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