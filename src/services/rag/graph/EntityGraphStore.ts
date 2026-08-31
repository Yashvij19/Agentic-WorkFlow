// src/services/rag/graph/EntityGraphStore.ts

import { prisma } from '../../../utils/db';
import { EntityRelation } from '../ingestion/parsers/OKFParser';

export interface GraphNode {
  name: string;
  type?: string;
  documentId?: string;
  properties?: Record<string, any>;
}

export interface GraphTraversalResult {
  startEntities: string[];
  nodes: GraphNode[];
  edges: EntityRelation[];
  depthReached: number;
}

export class EntityGraphStore {
  /**
   * Traverses the entity relation graph up to maxDepth hops using Breadth-First Search (BFS).
   * Optimized: Single DB query hoisted outside the loop + O(1) Set lookups.
   */
  async traverseGraph(
    orgId: string,
    startEntities: string[],
    maxDepth: number = 2
  ): Promise<GraphTraversalResult> {
    if (startEntities.length === 0) {
      return { startEntities: [], nodes: [], edges: [], depthReached: 0 };
    }

    const visitedEntities = new Set<string>(startEntities.map((e) => e.toLowerCase()));
    const discoveredEdges: EntityRelation[] = [];
    const discoveredNodes = new Map<string, GraphNode>();
    const seenEdgeKeys = new Set<string>();

    startEntities.forEach((name) => {
      discoveredNodes.set(name.toLowerCase(), { name });
    });

    // 1. OPTIMIZATION: Fetch all organization relations ONCE outside the loop
    const metadataRecords = await prisma.chunkMetadata.findMany({
      where: {
        organizationId: orgId,
        key: 'relation',
      },
    });

    if (metadataRecords.length === 0) {
      return {
        startEntities,
        nodes: Array.from(discoveredNodes.values()),
        edges: [],
        depthReached: 0,
      };
    }

    // 2. Pre-parse and index relations in memory as an Adjacency List for O(1) traversal
    const parsedRelations: EntityRelation[] = [];
    for (const record of metadataRecords) {
      try {
        const relation: EntityRelation =
          typeof record.value === 'string'
            ? JSON.parse(record.value)
            : (record.value as any);

        if (relation && relation.sourceEntity && relation.targetEntity) {
          parsedRelations.push(relation);
        }
      } catch {
        // Skip invalid JSON entries
      }
    }

    let currentLevelSet = new Set<string>(startEntities.map((e) => e.toLowerCase()));
    let depth = 0;

    // 3. BFS Traversal using Set.has() O(1) lookups
    while (currentLevelSet.size > 0 && depth < maxDepth) {
      depth++;
      const nextLevelSet = new Set<string>();

      for (const relation of parsedRelations) {
        const srcLower = relation.sourceEntity.toLowerCase();
        const tgtLower = relation.targetEntity.toLowerCase();

        const isSourceInLevel = currentLevelSet.has(srcLower);
        const isTargetInLevel = currentLevelSet.has(tgtLower);

        if (isSourceInLevel || isTargetInLevel) {
          const edgeKey = `${srcLower}->${relation.relationType.toLowerCase()}->${tgtLower}`;

          if (!seenEdgeKeys.has(edgeKey)) {
            seenEdgeKeys.add(edgeKey);
            discoveredEdges.push(relation);
          }

          // Expand to target node if newly discovered
          if (!visitedEntities.has(tgtLower)) {
            visitedEntities.add(tgtLower);
            discoveredNodes.set(tgtLower, { name: relation.targetEntity });
            nextLevelSet.add(tgtLower);
          }

          // Expand to source node if newly discovered (bi-directional context)
          if (!visitedEntities.has(srcLower)) {
            visitedEntities.add(srcLower);
            discoveredNodes.set(srcLower, { name: relation.sourceEntity });
            nextLevelSet.add(srcLower);
          }
        }
      }

      currentLevelSet = nextLevelSet;
    }

    return {
      startEntities,
      nodes: Array.from(discoveredNodes.values()),
      edges: discoveredEdges,
      depthReached: depth,
    };
  }

  /**
   * Formats graph nodes and relation edges into a clean markdown reference block for LLM prompts.
   */
  formatGraphContext(traversal: GraphTraversalResult): string {
    if (traversal.edges.length === 0 && traversal.nodes.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('=== STRUCTURED KNOWLEDGE GRAPH ===');

    if (traversal.edges.length > 0) {
      lines.push('Direct Entity Relationships:');
      const seenRels = new Set<string>();
      for (const edge of traversal.edges) {
        const edgeKey = `${edge.sourceEntity}-${edge.relationType}-${edge.targetEntity}`;
        if (!seenRels.has(edgeKey)) {
          seenRels.add(edgeKey);
          lines.push(`• (${edge.sourceEntity}) --[${edge.relationType}]--> (${edge.targetEntity})`);
        }
      }
    }

    lines.push('=================================');
    return lines.join('\n');
  }
}
