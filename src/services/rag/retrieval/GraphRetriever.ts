// src/services/rag/retrieval/GraphRetriever.ts

import { EntityGraphStore, GraphTraversalResult } from '../graph/EntityGraphStore';
import { QueryAnalysis, RetrievalResult, RAGConfiguration } from '../types';

export interface GraphRetrievalResult {
  hasGraphContext: boolean;
  graphContextText: string;
  traversal: GraphTraversalResult;
}

export class GraphRetriever {
  private graphStore = new EntityGraphStore();

  /**
   * Retrieves relational knowledge graph context for a query and search candidates.
   */
  async retrieveGraphContext(
    orgId: string,
    queryAnalysis: QueryAnalysis,
    candidates: RetrievalResult[],
    config: RAGConfiguration
  ): Promise<GraphRetrievalResult> {
    // 1. Identify starting entities from:
    // a) Keywords extracted by QueryAnalyzer
    // b) Document titles in the top retrieved candidates
    const startEntities = new Set<string>();

    // Add high-signal query keywords (length > 2)
    queryAnalysis.keywords.forEach((k) => {
      if (k.length > 2) startEntities.add(k.trim());
    });

    // Add titles/entities from top candidate chunks
    candidates.slice(0, 5).forEach((c) => {
      if (c.title && c.title !== 'Untitled Document') {
        startEntities.add(c.title.replace(/\.[^/.]+$/, '').trim()); // Strip file extension
      }
    });

    if (startEntities.size === 0) {
      return {
        hasGraphContext: false,
        graphContextText: '',
        traversal: { startEntities: [], nodes: [], edges: [], depthReached: 0 },
      };
    }

    // 2. Perform BFS graph traversal (up to 2 hops)
    const traversal = await this.graphStore.traverseGraph(
      orgId,
      Array.from(startEntities),
      2
    );

    // 3. Format graph relations into Markdown text for LLM
    const graphContextText = this.graphStore.formatGraphContext(traversal);

    return {
      hasGraphContext: traversal.edges.length > 0,
      graphContextText,
      traversal,
    };
  }
}
