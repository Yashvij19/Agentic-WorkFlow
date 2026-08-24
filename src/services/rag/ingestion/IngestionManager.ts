// src/services/rag/ingestion/IngestionManager.ts
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { prisma } from '../../../utils/db';
import { IngestionInput, NormalizedDocument, RAGConfiguration } from '../types';
import { NativeParser } from './NativeParser';

export class IngestionManager {
  private nativeParser = new NativeParser();

  /**
   * Orchestrates the parsing, chunking, and database indexing of a document.
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

    // 2. Perform Database Transaction (Clean existing records + Save new)
    return await prisma.$transaction(async (tx) => {
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
          name: input.name,
          mimeType: input.mimeType,
          source: input.source,
          rawContent: parsedDoc.rawContent,
          //rawContent: The raw, unformatted text extracted directly from the file (e.g., text with messy line breaks, random spaces, or raw HTML tags).
          // normalizedContent: Clean, structured Markdown (formatted with headers #, lists -, and clean tables |---|).
          // if the custom parser dont genrate the normalized content we gracefully send the rawcontent as normalized since in oour 
          // databse both are not null feild it work as safety net
          normalizedContent:  parsedDoc.normalizedContent || (parsedDoc as any).normalized_content || parsedDoc.rawContent || '',
          organizationId: orgId,
          knowledgeSourceId: knowledgeSourceId || null,
        },
      });

      // Index chunks, embeddings, and metadata
      for (const chunk of parsedDoc.chunks) {
        // Create Chunk record
        const dbChunk = await tx.chunk.create({
          data: {
            content: chunk.content,
            // embeddings are converted to a JSON string array of floats for CPU fallback calculations
            embeddingJson: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
            documentId: document.id,
            organizationId: orgId,
          },
        });

        // Add chunk index and filename metadata
        const metadataItems = Object.entries(chunk.metadata).map(([key, val]) => ({
          chunkId: dbChunk.id,
          key,
          value: JSON.stringify(val), // Stored as Json type in DB
          organizationId: orgId,
        }));

        if (metadataItems.length > 0) {
          await tx.chunkMetadata.createMany({
            data: metadataItems,
          });
        }
      }

      return document.id;
    });
  }

  /**
   * Router rules deciding between Native and MarkItDown parsing.
   */
  private shouldUseMarkItDown(input: IngestionInput, config: RAGConfiguration): boolean {
    if (config.ingestion.parser === 'markitdown') return true;
    if (config.ingestion.parser === 'native') return false;

    // "auto" mode: PDF, docx, pptx, xlsx require Python MarkItDown
    const ext = path.extname(input.name).toLowerCase();
    const binaryExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.ppt', '.zip'];
    return binaryExtensions.includes(ext) || !this.nativeParser.canParse(input.mimeType);
  }

  /**
   * Spawns the python rag_worker.py CLI process to run MarkItDown and generate embeddings.
   */
  private async parseWithMarkItDown(
    input: IngestionInput,
    chunkSize: number,
    chunkOverlap: number
  ): Promise<NormalizedDocument> {
    let tempFilePath = '';


    //The !! operator is a double NOT — it forces any value into a strict true or false boolean.
    // 1st ! Inverts the truthiness → false if truthy, true if falsy
    // 2nd ! Inverts again → back to boolean true or false
    
    const isTempFile = !!input.contentBuffer; 

    try {
      if (isTempFile && input.contentBuffer) {
        // Write the buffer to a temporary file on disk so the Python script can read it
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
            return reject(new Error(`Python MarkItDown worker failed (exit code ${code}). Error: ${stderrData}`));
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
      // Clean up the temporary file if it was created
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
