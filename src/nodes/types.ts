/**
 * Universal Node Executor Interfaces & Types
 * Defines the contract that every node in the workflow engine must adhere to.
 */

export interface ExecutionContext {
  /** Unique execution run ID */
  executionId: string;
  /** Parent workflow definition ID */
  workflowId: string;
  /** Organization owning the workflow */
  orgId: string;
  /** Current node ID in the canvas graph */
  nodeId: string;
  /** 
   * Complete shared memory pool.
   * Maps nodeId -> { output: any } for all ancestor nodes that already ran.
   */
  workflowContext: Record<string, any>;
  /** Decrypted credentials/secrets map (e.g. GEMINI_API_KEY, OPENAI_API_KEY) */
  credentials?: Record<string, string>;
  /** Real-time telemetry dispatcher to broadcast status events via Redis Pub/Sub */
  emitTelemetry: (status: 'RUNNING' | 'COMPLETED' | 'FAILED', message: string, data?: any) => void;
}

export interface NodeExecutionMetrics {
  durationMs: number;
  tokensUsed?: number;
  [key: string]: any;
}

export interface NodeExecutionResult<T = any> {
  /** Indicates whether the node executed cleanly */
  success: boolean;
  /** The primary data output that downstream nodes will consume */
  output: T;
  /** Performance metrics, token counts, latency */
  metrics?: NodeExecutionMetrics;
  /** Optional error message if success is false */
  error?: string;
}

/**
 * Universal Node Executor Interface (Strategy Pattern)
 * Any plugin or custom node must implement this contract.
 */
export interface INodeExecutor<TConfig = any, TInput = any, TOutput = any> {
  /** Unique identifier matching node.type (e.g., 'agent', 'api', 'custom_code') */
  readonly type: string;

  /** Human-readable title displayed in the palette and inspector */
  readonly name: string;

  /** Description of what this node does */
  readonly description: string;

  /**
   * Core execution method.
   * @param config The node's specific settings from the canvas (e.g. prompt, url, method, code)
   * @param inputs Resolved incoming data from directly connected upstream nodes
   * @param ctx Execution context with memory pool, org credentials, and telemetry
   */
  execute(config: TConfig, inputs: TInput, ctx: ExecutionContext): Promise<NodeExecutionResult<TOutput>>;
}
