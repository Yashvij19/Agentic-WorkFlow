import { INodeExecutor, ExecutionContext, NodeExecutionResult } from "../types";

/**
 * 🛠️ ForEach Configuration Interface
 * Defines all user-configurable parameters set in the canvas Properties Panel.
 */


export interface ForEachConfig {

    /**
  * The variable path to the array in ancestor node outputs.
  * Examples: "{{api_1.output.users}}" or "api_1.users" or "items"
  */
    arrayPath?: string;


    /**
     * Fallback inline array if no upstream path is provided.
     */
    inlineArray?: any[];

    /**
   * Maximum number of iterations to execute simultaneously.
   * Default: 1 (sequential). Hard capped at 20 for server stability.
   */
    concurrency?: number;

    /**
   * If true: A failure in item #3 will NOT stop item #4. Errors are collected.
   * If false: The entire workflow halts immediately upon first item failure.
   */
    continueOnError?: boolean;


    /**
   * Custom alias for the current item injected into child context.
   * Default: "$item"
   */
    itemAlias?: string;


    /**
     * Custom alias for the loop index.
     * Default: "$index"
     */
    indexAlias?: string


}



/**
 * 📦 ForEach Final Aggregated Output Contract
 * The structured payload returned after all items have completed their loop.
 */

export interface ForEachOutput {

    /** Total count of items submitted to the loop */
    totalCount: number;

    /** Total count of items that completed successfully */
    successCount: number;

    /** Total count of items that threw an error */
    errorCount: number;

    /** Array containing the processed output for each individual item, in original order */
    results: any[];

    /** Detailed error log for any items that failed (if continueOnError is true) */
    errors: Array<{ index: number; item: any; error: string }>;

}

/**
 * Maximum items allowed in a single ForEach loop to protect server memory.
 */
const MAX_LOOP_LIMIT = 500;

export class ForEachIteratorNode implements INodeExecutor<ForEachConfig> {

    public readonly type = 'foreach';
    public readonly name = 'ForEach / Array Iterator';
    public readonly description = 'Iterates over an array of items, running downstream child steps for each item with controlled concurrency.';

    /**
     * 🔍 Defensive Helper: Resolves and validates the target array from inputs or memory context.
     */

    public resolveTargetArray(config: ForEachConfig,
        inputs: any,
        workflowContext: Record<string, any>): any[] {

        // 1. Check for inline array configuration first
        if (Array.isArray(config.inlineArray)) {
            return config.inlineArray;
        }

        let resolvedData: any = undefined;
        // 2. If arrayPath is specified (e.g., "{{api_1.output.items}}" or "api_1.items")
        if (config.arrayPath && typeof config.arrayPath === 'string') {

            // Clean interpolation braces if present: "{{node.output}}" -> "node.output"

            const cleanPath = config.arrayPath.replace(/\{\{|\}\}/g, '').trim();
            const pathParts = cleanPath.split('.');


            // Traverse through the workflowContext or direct inputs

            const rootSource = workflowContext[pathParts[0]] !== undefined ? workflowContext : inputs;

            let currentPointer = rootSource;

            for (const part of pathParts) {
                if (currentPointer === null || currentPointer === undefined) {
                    break;
                }
                currentPointer = currentPointer[part];
            }

            resolvedData = currentPointer;

        }
        // 3. Fallback: If no path was given, inspect direct inputs from the parent node

        if (resolvedData === undefined) {
            if (Array.isArray(inputs)) {
                resolvedData = inputs;
            } else if (inputs && typeof inputs === 'object') {
                // Auto-detect common array field names from API payloads

                // Auto-detect common array field names from API payloads
                if (Array.isArray(inputs.items)) resolvedData = inputs.items;
                else if (Array.isArray(inputs.data)) resolvedData = inputs.data;
                else if (Array.isArray(inputs.results)) resolvedData = inputs.results;
                else if (Array.isArray(inputs.output)) resolvedData = inputs.output;

            }

        }

        // 4. Defensive Validation
        if (resolvedData === undefined || resolvedData === null) {
            return []; // Empty list, safe passthrough
        }

        if (!Array.isArray(resolvedData)) {
            throw new Error(
                `[ForEachNode] Target data is not an array! Expected array at '${config.arrayPath || 'inputs'}', but received type '${typeof resolvedData}'.`
            );
        }

        // 5. Security Bound Enforcement
        if (resolvedData.length > MAX_LOOP_LIMIT) {
            throw new Error(
                `[ForEachNode] Security Limit Exceeded: Array has ${resolvedData.length} items. Maximum allowed per loop is ${MAX_LOOP_LIMIT}.`
            );
        }

        return resolvedData;


    }

      /**
   * ⚡ Pure TypeScript Concurrency Pool
   * Spawns up to `concurrency` parallel workers that pull jobs from a shared queue index.
   */
  public async runWithConcurrency<T ,R>(
    items:T[],
    concurrency:number,
    workerFn:  (item: T, index: number) => Promise<R>
  ): Promise<R[]>{

       const results: R[] = new Array(items.length);
    let currentIndex = 0;
    // A single worker continuously grabs the next available item until none are left

    const worker = async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        results[index] = await workerFn(items[index], index);
      }
    };

     // Spawn workers up to the concurrency limit (or total items, whichever is smaller)
    const activeWorkers = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    );
      // Wait for all workers to finish their queues
    await Promise.all(activeWorkers);
    return results;


    
  }


  /**
   * 🚀 Core Execution Implementation (INodeExecutor Contract)
   */


   /**
   * 🚀 Core Execution Implementation (INodeExecutor Contract)
   */
  public async execute(
    config: ForEachConfig,
    inputs: any,
    ctx: ExecutionContext
  ): Promise<NodeExecutionResult<ForEachOutput>> {
    const startTime = Date.now();
    // 1. Resolve and validate array defensively
    const items = this.resolveTargetArray(config, inputs, ctx.workflowContext);
    // 2. Sanitize and bound user settings
    const concurrency = Math.max(1, Math.min(config.concurrency || 1, 20));
    const continueOnError = Boolean(config.continueOnError);
    const itemAlias = config.itemAlias?.trim() || '$item';
    const indexAlias = config.indexAlias?.trim() || '$index';
    ctx.emitTelemetry(
      'RUNNING',
      `Iterating across ${items.length} items (Concurrency: ${concurrency}, ContinueOnError: ${continueOnError})...`
    );
    // 3. Early return for empty arrays (Safe Passthrough)
    if (items.length === 0) {
      return {
        success: true,
        output: {
          totalCount: 0,
          successCount: 0,
          errorCount: 0,
          results: [],
          errors: [],
        },
        metrics: { durationMs: Date.now() - startTime }
      };
    }
    // 4. Check if the Worker orchestrator attached a subGraphRunner
    const subGraphRunner = (ctx as any).subGraphRunner as
      | ((item: any, index: number, aliases: { itemAlias: string; indexAlias: string }) => Promise<any>)
      | undefined;
    const collectedResults: any[] = new Array(items.length);
    const errors: Array<{ index: number; item: any; error: string }> = [];
    let successCount = 0;
    try {
      // 5. Execute items using our concurrency pool
      await this.runWithConcurrency(items, concurrency, async (item, index) => {
        try {
          let output: any;
          if (subGraphRunner) {
            // Execute child sub-graph with scoped memory
            output = await subGraphRunner(item, index, { itemAlias, indexAlias });
          } else {
            // Standalone passthrough if no children are connected
            output = { [itemAlias]: item, [indexAlias]: index };
          }
          collectedResults[index] = output;
          successCount++;
          // Broadcast real-time progress for the frontend progress bar!
          const percent = Math.round(((successCount) / items.length) * 100);
          ctx.emitTelemetry(
            'RUNNING',
            `Processed item ${index + 1}/${items.length} (${percent}%)`,
            { progress: percent, completed: successCount, total: items.length }
          );
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          errors.push({ index, item, error: errorMsg });
          // If fail-fast is desired, rethrow immediately
          if (!continueOnError) {
            throw new Error(`[ForEachNode] Iteration #${index} failed: ${errorMsg}`);
          }
          // Otherwise record failure and allow other items to proceed
          collectedResults[index] = { error: errorMsg, failed: true };
        }
      });
      const durationMs = Date.now() - startTime;
      ctx.emitTelemetry(
        'COMPLETED',
        `ForEach completed: ${successCount}/${items.length} items successful (${errors.length} failed) in ${durationMs}ms.`
      );
      return {
        success: true,
        output: {
          totalCount: items.length,
          successCount,
          errorCount: errors.length,
          results: collectedResults,
          errors,
        },
        metrics: {
          durationMs,
          itemsCount: items.length,
          concurrency,
        },
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      ctx.emitTelemetry('FAILED', `ForEach loop aborted: ${error.message}`);
      return {
        success: false,
        output: {
          totalCount: items.length,
          successCount,
          errorCount: errors.length + 1,
          results: collectedResults.filter(Boolean),
          errors: [...errors, { index: -1, item: null, error: error.message }],
        },
        error: error.message,
        metrics: { durationMs },
      };
    }



}
}

