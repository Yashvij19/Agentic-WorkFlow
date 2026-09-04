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

   /** 
   *  Optional self-correction feedback if this node is being re-run
   * after failing a downstream guardrail check.
   */
  correctionFeedback?: string;
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

/** 
   *  If validation failed, this payload instructs the worker 
   * to self-heal by re-running the target upstream node.
   */
   retryFeedback?: RetryFeedback;
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

export type GuardrailValidationMode = 
  | 'strict_json'      // Validates and extracts pure JSON (stripping markdown fences)
  | 'required_keys'    // Validates JSON and checks required keys exist
  | 'regex_match'      // Pattern matching (e.g. email, URL, custom regex format)
  | 'banned_keywords'  // Blacklist/toxicity check (fails if any banned word is present)
  | 'llm_judge';       // Semantic verification via secondary LLM evaluation


  /** Configuration saved on the ReactFlow canvas for a Guardrail node */

  export interface GuardrailNodeConfig{

     /** Which validation strategy to execute */
  mode: GuardrailValidationMode;


  /** Specific upstream node ID to retry (defaults to direct upstream node if empty) */
  targetNodeId?: string;

  /** Maximum retry attempts before failing permanently (default: 3) */
  maxRetries?: number;

   /** Array of mandatory JSON keys (for 'required_keys' mode) */
  requiredKeys?: string[];

   /** Regex pattern string (for 'regex_match' mode) */
  regexPattern?: string;
  /** Regex flags like 'i', 'g' */
  regexFlags?: string;


    /** Array of prohibited words or phrases (for 'banned_keywords' mode) */
  bannedWords?: string[];


  /** Custom prompt criteria for the secondary AI model (for 'llm_judge' mode) */
  llmJudgePrompt?: string;


  /** Custom error message / correction guidance passed back to the LLM */
  customErrorMessage?: string;

  }

  /** 
 * Actionable feedback ticket returned by a Guardrail node when validation fails.
 * The Worker uses this to rewind execution and augment the upstream prompt.
 */

  export interface RetryFeedback{

      /** The upstream node that must be retried */
  targetNodeId: string;

   /** Specific, actionable reason explaining why the output failed */
  reason: string;

  /** Which attempt number this was (1-based) */
  retryCount: number;


  /** Maximum attempts allowed before giving up */
  maxRetries: number;

    /** Whether the worker is authorized to retry (retryCount <= maxRetries) */
  shouldRetry: boolean;


  /** The augmented corrective prompt instruction for the LLM */
  augmentedPrompt?: string;



  }

