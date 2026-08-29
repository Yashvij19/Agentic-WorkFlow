// src/services/rag/retrieval/ContextExpander.ts

import { prisma } from '../../../utils/db';
import { RetrievalResult, RAGConfiguration } from '../types';

export class ContextExpander {
  /**
   * Expands retrieved chunks based on the configured context strategy.
   */
  async expandContext(
    candidates: RetrievalResult[],
    config: RAGConfiguration
  ): Promise<RetrievalResult[]> {
    if (candidates.length === 0) return [];

    const strategy = config.context?.strategy || 'top_chunks';

    switch (strategy) {
      case 'parent_child':
        return await this.expandParentChild(candidates);
      case 'neighbors':
        return await this.expandNeighbors(candidates);
      case 'top_chunks':
      default:
        return candidates;
    }
  }

  /**
   * 1. Parent-Child Expansion:
   * Replaces child chunk search hits with their full parent chunk text.
   */
  private async expandParentChild(candidates: RetrievalResult[]): Promise<RetrievalResult[]> {
    const parentIdToScoreMap = new Map<string, { score: number; child: RetrievalResult }>();
    const standaloneCandidates: RetrievalResult[] = [];

    // Collect all parent IDs from candidates metadata or chunk parentId
    for (const item of candidates) {
      const parentId = item.metadata?.parentId || item.metadata?.parentTempId;

      if (parentId) {
        if (!parentIdToScoreMap.has(parentId)) {
          parentIdToScoreMap.set(parentId, { score: item.score, child: item });
        } else {
          // If multiple children hit the same parent, retain highest score
          const existing = parentIdToScoreMap.get(parentId)!;
          if (item.score > existing.score) {
            existing.score = item.score;
          }
        }
      } else {
        // Fallback for standalone chunks that don't have a parent
        standaloneCandidates.push(item);
      }
    }

    const parentIds = Array.from(parentIdToScoreMap.keys());
    if (parentIds.length === 0) {
      return candidates;
    }

    // Fetch full parent chunks from DB
    const dbParents = await prisma.chunk.findMany({
      where: {
        id: { in: parentIds },
      },
      include: {
        document: {
          select: {
            name: true,
            source: true,
          },
        },
      },
    });

    const expandedParents: RetrievalResult[] = dbParents.map((parent) => {
      const match = parentIdToScoreMap.get(parent.id);

      return {
        chunkId: parent.id,
        documentId: parent.documentId,
        content: parent.content,
        score: match ? match.score : 0.8,
        retrievalMethod: match ? match.child.retrievalMethod : 'hybrid',
        metadata: {
          expandedFromChildId: match?.child.chunkId,
          isParentExpanded: true,
        },
        source: parent.document.source || 'Local Upload',
        title: parent.document.name || 'Untitled Document',
      };
    });

    // Merge expanded parents with any standalone chunks and sort by score
    const combined = [...expandedParents, ...standaloneCandidates];
    return combined.sort((a, b) => b.score - a.score);
  }

  /**
   * 2. Neighbor Window Expansion:
   * Stitches adjacent chunks (sequenceIndex - 1 and sequenceIndex + 1) to restore conversational flow.
   */
  private async expandNeighbors(candidates: RetrievalResult[]): Promise<RetrievalResult[]> {
    const expandedResults: RetrievalResult[] = [];

    for (const candidate of candidates) {
      const sequenceIndex = candidate.metadata?.sequenceIndex;

      if (sequenceIndex === undefined || sequenceIndex === null) {
        // No sequence metadata found, keep as is
        expandedResults.push(candidate);
        continue;
      }

      // Fetch all sequenceIndex metadata records for this specific document
      const docMetadata = await prisma.chunkMetadata.findMany({
        where: {
          key: 'sequenceIndex',
          chunk: {
            documentId: candidate.documentId,
          },
        },
      });

      // Filter in memory for contiguous neighbor chunks: [N - 1, N, N + 1]
      const targetSeqSet = new Set([sequenceIndex - 1, sequenceIndex, sequenceIndex + 1]);
      const neighborMeta = docMetadata.filter((m) => {
        const val = typeof m.value === 'number' ? m.value : Number(m.value);
        return targetSeqSet.has(val);
      });

      if (neighborMeta.length <= 1) {
        expandedResults.push(candidate);
        continue;
      }

      const neighborChunkIds = neighborMeta.map((m) => m.chunkId);

      // Fetch the actual chunk records
      const neighborChunks = await prisma.chunk.findMany({
        where: {
          id: { in: neighborChunkIds },
        },
      });

      // Map chunkId to its sequence number for proper chronological sorting
      const seqMap = new Map<string, number>();
      neighborMeta.forEach((m) => {
        const val = typeof m.value === 'number' ? m.value : Number(m.value);
        seqMap.set(m.chunkId, val);
      });

      // Sort neighbor chunks in ascending order
      neighborChunks.sort((a, b) => (seqMap.get(a.id) || 0) - (seqMap.get(b.id) || 0));

      // Stitch neighbor chunk contents together
      const stitchedContent = neighborChunks.map((n) => n.content.trim()).join('\n\n');

      expandedResults.push({
        ...candidate,
        content: stitchedContent,
        metadata: {
          ...candidate.metadata,
          isNeighborStitched: true,
          neighborCount: neighborChunks.length,
        },
      });
    }

    return expandedResults;
  }
}
