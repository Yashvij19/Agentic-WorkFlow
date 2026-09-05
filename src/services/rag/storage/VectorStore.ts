import * as path from 'path';
import { prisma } from '../../../utils/db';
import { RetrievalResult } from '../types';
import { GeminiEmbedder } from '../embeddings/GeminiEmbedder';

export class VectorStore {

    /**
   * Performs vector similarity search over chunks belonging to a specific organization.
   */

    /**
   * Performs vector similarity search over chunks belonging to a specific organization.
   */
    async search(
        orgId: string,
        query: string,
        topK: number,
        minScore: number,
        filters?: Record<string, string>
    ): Promise<RetrievalResult[]> {
        // 1. Convert search query text to a vector embedding
        const queryVector = await this.getQueryEmbedding(query, orgId);
        // 2. Fetch candidate chunks from DB
        const whereClause: any = {
            organizationId: orgId,
        };
        if (filters && filters.documentId) {
            whereClause.documentId = filters.documentId;
        }
        if (filters && filters.knowledgeSourceId) {
            whereClause.document = { knowledgeSourceId: filters.knowledgeSourceId };
        }
        const dbChunks = await prisma.chunk.findMany({
            where: whereClause,
            include: {
                document: {
                    select: {
                        name: true,
                        source: true,
                    },
                },
            },
        });
        // 3. Compute dot-product similarity in memory
        const candidates: RetrievalResult[] = [];
        for (const chunk of dbChunks) {
            if (!chunk.embeddingJson) continue;
            try {
                const chunkVector: number[] = JSON.parse(chunk.embeddingJson);
                const score = this.cosineSimilarity(queryVector, chunkVector);
                if (score >= minScore) {
                    candidates.push({
                        chunkId: chunk.id,
                        documentId: chunk.documentId,
                        content: chunk.content,
                        score,
                        retrievalMethod: 'vector',
                        metadata: {
                            sectionId: chunk.sectionId,
                            parentId: chunk.parentId,
                        },
                        source: chunk.document.source || 'Local Upload',
                        title: chunk.document.name,
                    });
                }
            } catch (err) {
                console.error(`Failed to calculate similarity for chunk ${chunk.id}:`, err);
            }
        }
        // 4. Sort results descending by score and slice to topK
        return candidates.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    /**
   * Helper computing the dot product between two float vectors.
   * Since BAAI/bge-m3 outputs unit-normalized vectors, the dot product
   * is mathematically equivalent to the cosine similarity.
   */

    private cosineSimilarity(vecA: number[], vecB: number[]): number {

        if (vecA.length !== vecB.length) {
            throw new Error(`Vector dimension mismatch: query (${vecA.length}) vs chunk (${vecB.length})`);
        }

        let dotProduct = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
        }

        return dotProduct;
    }


    /**
     * Converts the text query to a unit-normalized float vector using GeminiEmbedder.
     */
    private async getQueryEmbedding(query: string, orgId?: string): Promise<number[]> {
        return await GeminiEmbedder.getQueryEmbedding(query, orgId);
    }

    /**
  * Performs Keyword (BM25 / Exact Term) Search over stored chunks.
  */
    async searchKeyword(
        orgId: string,
        query: string,
        topK: number,
        filters?: Record<string, string>
    ): Promise<RetrievalResult[]> {

        // Extract search terms (skip short words)

        const terms = query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')     // Replace ALL non-word chars with space 
            .split(/\s+/)
            .filter((t) => t.length > 2);

        if (terms.length === 0) {
            return [];
        }

        const whereClause: any = {
            organizationId: orgId,
            OR: terms.map((term) => ({
                content: {
                    contains: term,
                    mode: 'insensitive',
                },
            })),
        };

        if (filters && filters.documentId) {
            whereClause.documentId = filters.documentId;
        }
        if (filters && filters.knowledgeSourceId) {
            whereClause.document = { knowledgeSourceId: filters.knowledgeSourceId };
        }

        const dbChunks = await prisma.chunk.findMany({
            where: whereClause,
            include: {
                document: {
                    select: {
                        name: true,
                        source: true,
                    },
                },
            },
            take: topK * 3, // Overfetch candidates for ranking
        });

        // Score chunks by term occurrence density

        const scoredCandidates: RetrievalResult[] = dbChunks.map((chunk) => {
            const lowerContent = chunk.content.toLocaleLowerCase();
            let matchCount = 0;
            for (const term of terms) {
                // Count occurrences of term in content

                const regex = new RegExp(`\\b${term}\\b`, 'gi');
                const matches = lowerContent.match(regex);
                if (matches) {
                    matchCount += matches.length;
                } else if (lowerContent.includes(term)) {
                    matchCount += 0.5; // partial substring match
                }
            }

            // Normalize score between 0 and 1
            const normalizedScore = Math.min(1.0, matchCount / (terms.length * 2));

            return {
                chunkId: chunk.id,
                documentId: chunk.documentId,
                content: chunk.content,
                score: Number(normalizedScore.toFixed(4)),
                retrievalMethod: 'keyword',
                metadata: {
                    sectionId: chunk.sectionId,
                    parentId: chunk.parentId,
                },
                source: chunk.document.source || 'Local Upload',
                title: chunk.document.name,
            };


        });



        return scoredCandidates.sort((a, b) => b.score - a.score).slice(0, topK);


    }

}
