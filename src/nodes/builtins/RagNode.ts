import { INodeExecutor, ExecutionContext, NodeExecutionResult } from '../types';
import { injectVariables } from '../../utils/interpolation';
import { RAGEngine } from '../../services/rag/RAGEngine';
import { RAGConfiguration, UseCaseProfile } from '../../services/rag/types';

export interface RagNodeConfig {
  query?: string;
  mode?: 'simple' | 'advanced';
  knowledgeBaseScope?: 'ORGANIZATION' | 'PERSONAL';
  knowledgeSourceId?: string;
  useCaseProfile?: UseCaseProfile;
  ingestion?: any;
  retrieval?: any;
  reranker?: any;
  context?: any;
  generation?: any;
  metadataFilters?: Record<string, string>;
}

export class RagNode implements INodeExecutor<RagNodeConfig> {
  public readonly type = 'rag_query';
  public readonly name = 'RAG Knowledge Retrieval';
  public readonly description = 'Searches vector knowledge base with hybrid search and generates citation-backed answers.';

  private ragEngine: RAGEngine;

  constructor() {
    this.ragEngine = new RAGEngine();
  }

  public async execute(
    config: RagNodeConfig,
    inputs: any,
    ctx: ExecutionContext
  ): Promise<NodeExecutionResult<any>> {
    const startTime = Date.now();
    const rawQuery = config?.query || '';

    // 1. Variable Hydration
    const hydratedQuery = injectVariables(rawQuery, ctx.workflowContext);
    
    ctx.emitTelemetry('RUNNING', `RAG query initiated: "${hydratedQuery.slice(0, 80)}..."`);

    // 2. Resolve RAG Configuration
    const ragConfig: RAGConfiguration = {
      mode: config?.mode || 'simple',
      useCaseProfile: config?.useCaseProfile || 'GENERAL_QA',
      ingestion: config?.ingestion || {
        parser: 'auto',
        chunkSize: 800,
        chunkOverlap: 100,
        chunkStrategy: 'recursive',
      },
      retrieval: config?.retrieval || {
        mode: 'hybrid',
        topK: 10,
        vectorWeight: 0.7,
        keywordWeight: 0.3,
        minScore: 0.3,
      },
      reranker: config?.reranker || {
        provider: 'none',
        topN: 5,
      },
      context: config?.context || {
        strategy: 'top_chunks',
        maxTokens: 4000,
        citationMode: 'inline',
      },
      generation: config?.generation || {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.2,
        systemPrompt: '',
      },
    };

    // 3. Execute the RAG Pipeline with Knowledge Base Isolation
    const filters: Record<string, string> = {
      ...(config?.metadataFilters || {}),
    };
    if (config?.knowledgeSourceId) {
      filters.knowledgeSourceId = config.knowledgeSourceId;
    }

    const ragResult = await this.ragEngine.execute({
      orgId: ctx.orgId,
      query: hydratedQuery,
      config: ragConfig,
      executionId: ctx.executionId,
      nodeId: ctx.nodeId,
      metadataFilters: filters,
    });

    const durationMs = Date.now() - startTime;
    ctx.emitTelemetry(
      'COMPLETED',
      `RAG search completed: retrieved ${ragResult.retrievedCount} chunks in ${ragResult.latencyMs}ms`
    );

    // 4. Return structured output
    return {
      success: true,
      output: {
        answer: ragResult.answer,
        context: ragResult.context.contextText,
        citations: ragResult.context.citations,
        retrievedCount: ragResult.retrievedCount,
        latencyMs: ragResult.latencyMs,
        traceId: ragResult.traceId,
      },
      metrics: {
        durationMs,
        tokensUsed: ragResult.metrics?.tokensUsedEstimate || 0,
        retrievedChunks: ragResult.retrievedCount,
      },
    };
  }
}
