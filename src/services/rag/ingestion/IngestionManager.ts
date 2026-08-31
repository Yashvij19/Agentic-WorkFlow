// src/services/rag/ingestion/IngestionManager.ts

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { prisma } from '../../../utils/db';
import { IngestionInput, NormalizedDocument, RAGConfiguration } from '../types';
import { NativeParser } from './NativeParser';
import { HierarchicalChunker } from './chunking/HierarchicalChunker';
import { OKFParser } from './parsers/OKFParser';

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
      parsedDoc = await this.parseWithMarkItDown(input, config.ingestion.chunkSize, config.ingestion.chunkOverlap);
    } else {
      parsedDoc = await this.nativeParser.parse(input, {
        chunkSize: config.ingestion.chunkSize,
        chunkOverlap: config.ingestion.chunkOverlap,
      });
    }

    const rawDocText = parsedDoc.rawContent || '';

    // 2. Phase 4: OKF YAML Frontmatter & Graph Relation Extraction
    const okfResult = this.okfParser.parse(rawDocText, input.name);
    const documentContent = okfResult.cleanContent || parsedDoc.normalizedContent || rawDocText;

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
        allChildTexts.length > 0 ? await this.generateEmbeddingsBatch(allChildTexts) : [];
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
        const document = await tx.document.create({
          data: {
            name: okfResult.title || input.name,
            mimeType: input.mimeType,
            source: input.source,
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
                content: parent.content,
                documentId: document.id,
                organizationId: orgId,
              },
            });

            for (const child of parent.children) {
              const embedding = childEmbeddings[childEmbeddingIndex++];

              const dbChild = await tx.chunk.create({
                data: {
                  content: child.content,
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
                { key: 'filename', value: JSON.stringify(input.name) },
              ];

              // Phase 4: Attach OKF Frontmatter attributes to metadata
              if (okfResult.hasFrontmatter) {
                metadataItems.push({
                  key: 'entityType',
                  value: JSON.stringify(okfResult.entityType),
                });
                metadataItems.push({
                  key: 'entityName',
                  value: JSON.stringify(okfResult.entityName),
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
                  key: m.key,
                  value: m.value,
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
                content: chunk.content,
                embeddingJson: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
                documentId: document.id,
                organizationId: orgId,
              },
            });

            const metadataItems: Array<{ key: string; value: any }> = Object.entries({
              ...chunk.metadata,
              sequenceIndex: seq,
            }).map(([key, val]) => ({
              key,
              value: JSON.stringify(val),
            }));

            // Phase 4: Index OKF directed graph relations
            for (const relation of okfResult.relations) {
              metadataItems.push({
                key: 'relation',
                value: JSON.stringify(relation),
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
   * Generates vector embeddings for an array of strings in batches using embed_worker.py.
   */
  private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const scriptPath = path.resolve(__dirname, 'parsers', 'embed_worker.py');
    return new Promise((resolve, reject) => {
      const child = spawn('python', [scriptPath]);
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
            new Error(`Batch embedding worker failed with code ${code}. Stderr: ${stderrData}`)
          );
        }
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch (err: any) {
          reject(new Error(`Failed to parse batch embeddings: ${err.message}. Raw: ${stdoutData}`));
        }
      });
      child.stdin.write(JSON.stringify(texts));
      child.stdin.end();
    });
  }

  /**
   * Router rules deciding between Native and MarkItDown parsing.
   */
  private shouldUseMarkItDown(input: IngestionInput, config: RAGConfiguration): boolean {
    if (config.ingestion.parser === 'markitdown') return true;
    if (config.ingestion.parser === 'native') return false;

    const ext = path.extname(input.name).toLowerCase();
    const binaryExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.ppt', '.zip'];
    return binaryExtensions.includes(ext) || !this.nativeParser.canParse(input.mimeType);
  }

  /**
   * Spawns the python rag_worker.py CLI process to run MarkItDown.
   */
  private async parseWithMarkItDown(
    input: IngestionInput,
    chunkSize: number,
    chunkOverlap: number
  ): Promise<NormalizedDocument> {
    let tempFilePath = '';
    const isTempFile = !!input.contentBuffer;

    try {
      if (isTempFile && input.contentBuffer) {
        const tempDir = path.join(__dirname, 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        tempFilePath = path.join(tempDir, `ingest_temp_${Date.now()}_${input.name}`);
        await fs.writeFile(tempFilePath, input.contentBuffer);
      } else {
        tempFilePath = input.source;
      }

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
      if (isTempFile && tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (err) {
          console.error(`Failed to clean up temp file ${tempFilePath}:`, err);
        }
      }
    }
  }
}
