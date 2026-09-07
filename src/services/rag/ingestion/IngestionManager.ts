// src/services/rag/ingestion/IngestionManager.ts

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { prisma } from '../../../utils/db';
import { IngestionInput, NormalizedDocument, RAGConfiguration } from '../types';
import { NativeParser } from './NativeParser';
import { HierarchicalChunker } from './chunking/HierarchicalChunker';
import { OKFParser } from './parsers/OKFParser';
import { GeminiEmbedder } from '../embeddings/GeminiEmbedder';

/**
 * Sanitizes strings before database insertion into PostgreSQL:
 * - Strips null bytes (\0 or \u0000) which violate PostgreSQL UTF-8 text encoding rules (error code 22021).
 * - Strips lone Unicode surrogates (U+D800 to U+DFFF) which cause UTF-8 serialization errors.
 */
export function sanitizePgText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\0/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .trim();
}

export class IngestionManager {
  private nativeParser = new NativeParser();
  private hierarchicalChunker = new HierarchicalChunker();
  private okfParser = new OKFParser();

  /**
   * Orchestrates the parsing, chunking, embedding, and database indexing of a document.
   */
  async ingestDocument(
    orgId: string,
    input: IngestionInput,
    config: RAGConfiguration,
    knowledgeSourceId?: string
  ): Promise<string> {
    // 1. Determine Ingestion Strategy (Parser Selection)
    const useMarkItDown = this.shouldUseMarkItDown(input, config);
    let parsedDoc: NormalizedDocument;

    if (useMarkItDown) {
      try {
        parsedDoc = await this.parseWithMarkItDown(input, config.ingestion.chunkSize, config.ingestion.chunkOverlap);
      } catch (markitdownErr: any) {
        console.warn(`⚠️ [IngestionManager] MarkItDown parser failed (${markitdownErr.message}). Gracefully falling back to NativeParser.`);
        parsedDoc = await this.nativeParser.parse(input, {
          chunkSize: config.ingestion.chunkSize,
          chunkOverlap: config.ingestion.chunkOverlap,
        });
      }
    } else {
      parsedDoc = await this.nativeParser.parse(input, {
        chunkSize: config.ingestion.chunkSize,
        chunkOverlap: config.ingestion.chunkOverlap,
      });
    }

    const rawDocText = sanitizePgText(parsedDoc.rawContent || '');
    const cleanNormalized = sanitizePgText(parsedDoc.normalizedContent || '');

    // 2. Phase 4: OKF YAML Frontmatter & Graph Relation Extraction
    const okfResult = this.okfParser.parse(rawDocText, input.name);
    const documentContent = sanitizePgText(okfResult.cleanContent || cleanNormalized || rawDocText);

    // 3. Pre-compute hierarchical chunks and ML embeddings OUTSIDE of the DB transaction
    const isHierarchical =
      config.ingestion.chunkStrategy === 'hierarchical' ||
      config.context?.strategy === 'parent_child';

    let parentChunks: Array<{
      content: string;
      children: Array<{ content: string; sequenceIndex: number }>;
    }> = [];
    let childEmbeddings: number[][] = [];

    if (isHierarchical) {
      parentChunks = this.hierarchicalChunker.chunkDocument(documentContent);
      const allChildTexts: string[] = [];
      parentChunks.forEach((p) => {
        p.children.forEach((c) => allChildTexts.push(c.content));
      });
      childEmbeddings =
        allChildTexts.length > 0 ? await this.generateEmbeddingsBatch(allChildTexts, orgId) : [];
    } else {
      // If flat chunks from the parser don't have embeddings, batch-generate them via GeminiEmbedder
      const missingEmbeddings = parsedDoc.chunks.some((c) => !c.embedding);
      if (missingEmbeddings && parsedDoc.chunks.length > 0) {
        const chunkTexts = parsedDoc.chunks.map((c) => c.content);
        const embeddings = await this.generateEmbeddingsBatch(chunkTexts, orgId);
        parsedDoc.chunks.forEach((c, idx) => {
          c.embedding = embeddings[idx];
        });
      }
    }

    // 4. Perform Database Transaction purely for fast SQL writes
    return await prisma.$transaction(
      async (tx) => {
        // Find if a document with this name already exists under the same organization
        const existingDoc = await tx.document.findFirst({
          where: {
            name: input.name,
            organizationId: orgId,
            knowledgeSourceId: knowledgeSourceId || null,
          },
        });

        if (existingDoc) {
          // Idempotency: Clean up old chunks and sections to prevent duplicates
          await tx.chunk.deleteMany({
            where: { documentId: existingDoc.id },
          });
          await tx.documentSection.deleteMany({
            where: { documentId: existingDoc.id },
          });
          await tx.document.delete({
            where: { id: existingDoc.id },
          });
        }

        // Save the Document record
        const docName = sanitizePgText(okfResult.title || input.name);
        const docSource = sanitizePgText(input.source || 'Direct Upload');

        const document = await tx.document.create({
          data: {
            name: docName,
            mimeType: input.mimeType,
            source: docSource,
            rawContent: rawDocText,
            normalizedContent: documentContent,
            organizationId: orgId,
            knowledgeSourceId: knowledgeSourceId || null,
          },
        });

        if (isHierarchical) {
          let childEmbeddingIndex = 0;

          for (const parent of parentChunks) {
            const dbParent = await tx.chunk.create({
              data: {
                content: sanitizePgText(parent.content),
                documentId: document.id,
                organizationId: orgId,
              },
            });

            for (const child of parent.children) {
              const embedding = childEmbeddings[childEmbeddingIndex++];

              const dbChild = await tx.chunk.create({
                data: {
                  content: sanitizePgText(child.content),
                  embeddingJson: embedding ? JSON.stringify(embedding) : null,
                  parentId: dbParent.id,
                  documentId: document.id,
                  organizationId: orgId,
                },
              });

              // Metadata tagging for neighbor window & parent tracking
              const metadataItems: Array<{ key: string; value: any }> = [
                { key: 'sequenceIndex', value: JSON.stringify(child.sequenceIndex) },
                { key: 'parentId', value: JSON.stringify(dbParent.id) },
                { key: 'filename', value: JSON.stringify(docName) },
              ];

              // Phase 4: Attach OKF Frontmatter attributes to metadata
              if (okfResult.hasFrontmatter) {
                metadataItems.push({
                  key: 'entityType',
                  value: JSON.stringify(sanitizePgText(okfResult.entityType)),
                });
                metadataItems.push({
                  key: 'entityName',
                  value: JSON.stringify(sanitizePgText(okfResult.entityName)),
                });
              }

              // Phase 4: Index OKF directed graph relations
              for (const relation of okfResult.relations) {
                metadataItems.push({
                  key: 'relation',
                  value: JSON.stringify(relation),
                });
              }

              await tx.chunkMetadata.createMany({
                data: metadataItems.map((m) => ({
                  chunkId: dbChild.id,
                  key: sanitizePgText(m.key),
                  value: sanitizePgText(typeof m.value === 'string' ? m.value : JSON.stringify(m.value)),
                  organizationId: orgId,
                })),
              });
            }
          }
        } else {
          // Standard Flat Chunking
          let seq = 0;
          for (const chunk of parsedDoc.chunks) {
            seq++;
            const dbChunk = await tx.chunk.create({
              data: {
                content: sanitizePgText(chunk.content),
                embeddingJson: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
                documentId: document.id,
                organizationId: orgId,
              },
            });

            const metadataItems: Array<{ key: string; value: any }> = Object.entries({
              ...chunk.metadata,
              sequenceIndex: seq,
            }).map(([key, val]) => ({
              key: sanitizePgText(key),
              value: sanitizePgText(typeof val === 'string' ? val : JSON.stringify(val)),
            }));

            // Phase 4: Index OKF directed graph relations
            for (const relation of okfResult.relations) {
              metadataItems.push({
                key: 'relation',
                value: sanitizePgText(JSON.stringify(relation)),
              });
            }

            if (metadataItems.length > 0) {
              await tx.chunkMetadata.createMany({
                data: metadataItems.map((m) => ({
                  chunkId: dbChunk.id,
                  key: m.key,
                  value: m.value,
                  organizationId: orgId,
                })),
              });
            }
          }
        }

        return document.id;
      },
      {
        timeout: 30000,
        maxWait: 10000,
      }
    );
  }

  /**
   * Generates vector embeddings for an array of strings in batches using GeminiEmbedder.
   */
  private async generateEmbeddingsBatch(texts: string[], orgId?: string): Promise<number[][]> {
    return await GeminiEmbedder.getEmbeddings(texts, orgId);
  }

  /**
   * Router rules deciding between Native and MarkItDown parsing.
   */
  private shouldUseMarkItDown(input: IngestionInput, config: RAGConfiguration): boolean {
    if (config.ingestion.parser === 'markitdown') return true;
    if (config.ingestion.parser === 'native') return false;

    const ext = path.extname(input.name).toLowerCase();
    const textExtensions = ['.txt', '.md', '.markdown', '.json', '.csv', '.yaml', '.yml', '.js', '.ts', '.html'];
    if (textExtensions.includes(ext)) return false;

    // In production (Render), default to nativeParser (pdf-parse) for PDFs for instant speed & zero Python/pip dependency
    if (process.env.NODE_ENV === 'production' && ext === '.pdf') {
      return false;
    }

    const binaryExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.ppt', '.zip'];
    return binaryExtensions.includes(ext) || !this.nativeParser.canParse(input.mimeType, input.name);
  }

  /**
   * Spawns the python rag_worker.py CLI process to run MarkItDown.
   */
  private async parseWithMarkItDown(
    input: IngestionInput,
    chunkSize: number,
    chunkOverlap: number
  ): Promise<NormalizedDocument> {
    if (!input.contentBuffer) {
      throw new Error(
        'Ingestion security error: Direct server file path parsing is disabled. A file content buffer is required.'
      );
    }

    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Sanitize filename to prevent path traversal (e.g., ../../etc/passwd)
    const safeBasename = path.basename(input.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempFilePath = path.join(tempDir, `ingest_temp_${Date.now()}_${safeBasename}`);

    try {
      await fs.writeFile(tempFilePath, input.contentBuffer);

      const scriptPath = path.join(__dirname, 'parsers', 'rag_worker.py');

      const parsedData = await new Promise<NormalizedDocument>((resolve, reject) => {
        const child = spawn('python', [
          scriptPath,
          tempFilePath,
          chunkSize.toString(),
          chunkOverlap.toString(),
        ]);

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (data) => {
          stdoutData += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderrData += data.toString();
        });

        child.on('close', (code) => {
          if (code !== 0) {
            return reject(
              new Error(`Python MarkItDown worker failed (exit code ${code}). Error: ${stderrData}`)
            );
          }
          try {
            const result = JSON.parse(stdoutData.trim());
            if (result.error) {
              return reject(new Error(result.error));
            }
            resolve(result);
          } catch (err) {
            reject(new Error(`Failed to parse Python worker stdout JSON. Raw: ${stdoutData}`));
          }
        });
      });

      return parsedData;
    } finally {
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (err) {
          console.error(`Failed to clean up temp file ${tempFilePath}:`, err);
        }
      }
    }
  }
}
