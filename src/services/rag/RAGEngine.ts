// src/services/rag/RAGEngine.ts

import { prisma } from '../../utils/db';
import { executeAiAgent } from '../../utils/aiAgent';
import { QueryAnalyzer } from './retrieval/QueryAnalyzer';
import { RetrievalPlanner } from './retrieval/RetrievalPlanner';
import { VectorStore } from './storage/VectorStore';
import { ContextBuilder, BuiltContext } from './retrieval/ContextBuilder';
import { RerankerFactory } from './reranker/Reranker';
import { ContextExpander } from './retrieval/ContextExpander';

import {
  RAGConfiguration,
  RetrievalResult,
  QueryAnalysis,
  RetrievalPlan,
} from './types';

export interface RAGQueryResult {
  answer: string;
  context: BuiltContext;
  analysis: QueryAnalysis;
  plan: RetrievalPlan;
  retrievedCount: number;
  fusedCount: number;
  rerankedCount: number;
  latencyMs: number;
  traceId?: string;
}

export class RAGEngine {
  private queryAnalyzer = new QueryAnalyzer();
  private retrievalPlanner = new RetrievalPlanner();
  private contextBuilder = new ContextBuilder();
  private vectorStore = new VectorStore();
  private contextExpander = new ContextExpander();

  /**
   * Main RAG execution flow:
   * 1. Analyze -> 2. Plan -> 3. Retrieve (Vector + Keyword) -> 4. RRF Fusion ->
   * 5. Cross-Encoder Reranker -> 6. Context Expander (Parent-Child / Neighbors) ->
   * 7. Context Builder -> 8. LLM Generate -> 9. Trace Telemetry
   */
  async execute(params: {
    orgId: string;
    query: string;
    config: RAGConfiguration;
    executionId: string;
    nodeId?: string;
    metadataFilters?: Record<string, string>;
  }): Promise<RAGQueryResult> {
    const startTime = Date.now();
    const { orgId, query, config, executionId, nodeId, metadataFilters } = params;

    // 1. Query Analysis
    const analysis = await this.queryAnalyzer.analyze(orgId, query, metadataFilters);

    // 2. Retrieval Planning
    const plan = this.retrievalPlanner.plan(analysis, config);

    // 3. Multi-Retriever Execution
    const shouldRunVector =
      plan.strategies.includes('vector') || plan.strategies.includes('hybrid');
    const shouldRunKeyword =
      plan.strategies.includes('keyword') || plan.strategies.includes('hybrid');

    const [vectorCandidates, keywordCandidates] = await Promise.all([
      shouldRunVector
        ? this.vectorStore.search(
            orgId,
            analysis.normalizedQuery,
            plan.topK,
            plan.minScore,
            plan.metadataFilters
          )
        : Promise.resolve([]),
      shouldRunKeyword
        ? this.vectorStore.searchKeyword(
            orgId,
            analysis.originalQuery,
            plan.topK,
            plan.metadataFilters
          )
        : Promise.resolve([]),
    ]);

    const allRetrieved = [...vectorCandidates, ...keywordCandidates];

    // 4. Reciprocal Rank Fusion (RRF)
    const fusedCandidates = this.reciprocalRankFusion(
      vectorCandidates,
      keywordCandidates,
      plan.topK,
      plan.vectorWeight,
      plan.keywordWeight
    );

    // 5. Phase 2: Reranking Strategy Execution (Cross-Encoder)
    const rerankerProvider = config.reranker?.provider || 'none';
    const rerankerTopN = config.reranker?.topN || 5;
    const reranker = RerankerFactory.get(rerankerProvider);

    let rerankedCandidates: RetrievalResult[] = [];
    try {
      rerankedCandidates = await reranker.rerank(query, fusedCandidates, {
        topN: rerankerTopN,
        minScore: config.reranker?.minScore,
      });
    } catch (rerankErr) {
      console.warn('Reranker execution failed, falling back to fused results:', rerankErr);
      rerankedCandidates = fusedCandidates.slice(0, rerankerTopN);
    }

    // 6. Phase 3: Context Expansion (Parent-Child & Neighbor Window Stitching)
    const expandedCandidates = await this.contextExpander.expandContext(
      rerankedCandidates,
      config
    );

    // 7. Context Building & Deduplication & Token Budgeting
    const builtContext = this.contextBuilder.buildContext(expandedCandidates, config);

    // 8. LLM Answer Generation (if enabled)
    let answer = '';
    if (config.generation.enabled) {
      answer = await this.generateAnswer(orgId, query, builtContext.contextText, config);
    } else {
      // If generation is disabled, output context directly
      answer = builtContext.contextText;
    }

    const latencyMs = Date.now() - startTime;

    // 9. Observability & Telemetry Trace Recording
    let traceId: string | undefined;
    if (executionId && nodeId) {
      try {
        const trace = await prisma.ragTrace.create({
          data: {
            executionId,
            nodeId,
            query,
            analysisJson: analysis as any,
            planJson: plan as any,
            retrievedJson: allRetrieved as any,
            fusedJson: fusedCandidates as any,
            rerankedJson: rerankedCandidates as any,
            contextString: builtContext.contextText,
            answerString: answer,
            metricsJson: {
              latencyMs,
              chunksRetrieved: allRetrieved.length,
              chunksFused: fusedCandidates.length,
              chunksReranked: rerankedCandidates.length,
              chunksUsed: builtContext.totalChunksUsed,
              tokensUsedEstimate: builtContext.tokensUsedEstimate,
            },
          },
        });
        traceId = trace.id;
      } catch (err) {
        console.warn('Failed to record RAG trace telemetry:', err);
      }
    }

    return {
      answer,
      context: builtContext,
      analysis,
      plan,
      retrievedCount: allRetrieved.length,
      fusedCount: fusedCandidates.length,
      rerankedCount: rerankedCandidates.length,
      latencyMs,
      traceId,
    };
  }

  /**
   * Reciprocal Rank Fusion (RRF):
   * Merges multiple ranked candidate lists into a unified score.
   * Formula: RRF_Score = sum( weight / (60 + rank) )
   */
  private reciprocalRankFusion(
    vectorResults: RetrievalResult[],
    keywordResults: RetrievalResult[],
    topK: number,
    vectorWeight = 0.7,
    keywordWeight = 0.3
  ): RetrievalResult[] {
    const K = 60; // Standard smoothing constant
    const scores = new Map<
      string,
      {
        result: RetrievalResult;
        score: number;
      }
    >();

    // 1. Accumulate vector ranks
    vectorResults.forEach((item, index) => {
      const rank = index + 1;
      const rrf = vectorWeight * (1 / (K + rank));
      scores.set(item.chunkId, {
        result: item,
        score: rrf,
      });
    });

    // 2. Accumulate keyword ranks
    keywordResults.forEach((item, index) => {
      const rank = index + 1;
      const rrf = keywordWeight * (1 / (K + rank));
      const existing = scores.get(item.chunkId);
      if (existing) {
        existing.score += rrf;
        existing.result.retrievalMethod = 'hybrid'; // Found by both!
      } else {
        scores.set(item.chunkId, {
          result: item,
          score: rrf,
        });
      }
    });

    // 3. Sort descending by combined RRF score
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ result, score }) => ({
        ...result,
        score: Number(score.toFixed(6)),
      }));
  }

  /**
   * Prompts Gemini to synthesize a grounded answer using the retrieved context.
   */
  private async generateAnswer(
    orgId: string,
    query: string,
    contextText: string,
    config: RAGConfiguration
  ): Promise<string> {
    const credential = await prisma.credential.findFirst({
      where: {
        organizationId: orgId,
        name: 'GEMINI_API_KEY',
      },
    });

    if (!credential || !credential.encryptedData) {
      throw new Error(
        'GEMINI_API_KEY credential not found for organization. Please configure API keys under Settings.'
      );
    }

    const customSystemPrompt =
      config.generation.systemPrompt ||
      'You are an expert AI assistant. Answer the user question accurately using ONLY the provided reference context. If the answer cannot be deduced from the context, state clearly that the information is not available in the documents.';

    const fullPrompt = `${customSystemPrompt}
=== REFERENCE CONTEXT ===
${contextText}
=========================
User Question: ${query}
Provide a comprehensive, clear, and well-structured answer:`;

    const aiResponse = await executeAiAgent({
      prompt: fullPrompt,
      encryptedApiKey: credential.encryptedData,
    });
    return aiResponse.output;
  }
}
