import { INodeExecutor, ExecutionContext, NodeExecutionResult } from '../types';
import vm from 'node:vm';

export interface CustomCodeConfig {
  /** The raw JavaScript code written by the user in the Monaco Editor */
  code?: string;
  /** Execution timeout in milliseconds (default: 10000ms = 10s) */
  timeoutMs?: number;
}

export class CustomCodeNode implements INodeExecutor<CustomCodeConfig> {
  public readonly type = 'custom_code';
  public readonly name = 'Custom Code (JS)';
  public readonly description = 'Executes sandboxed custom JavaScript with dynamic access to any node outputs and workflow context.';

  public async execute(
    config: CustomCodeConfig,
    inputs: any,
    ctx: ExecutionContext
  ): Promise<NodeExecutionResult<any>> {
    const startTime = Date.now();
    const rawCode = config?.code?.trim() || '';
    // Default 10 seconds timeout, maximum 30 seconds
    const timeoutMs = Math.min(config?.timeoutMs || 10000, 30000);

    if (!rawCode) {
      return {
        success: true,
        output: inputs || null,
        metrics: { durationMs: Date.now() - startTime },
      };
    }

    ctx.emitTelemetry('RUNNING', `Executing custom JavaScript function (Timeout: ${timeoutMs}ms)...`);

    // 1. Logs Collector (Captures all console.log, console.warn, console.error)
    const logs: string[] = [];
    const pushLog = (type: string, args: any[]) => {
      const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      logs.push(`[${type}] ${line}`);
    };

    // 2. Build the Sandbox with Dynamic Node Access
    const sandbox = {
      // Direct access to incoming inputs from previous step
      inputs: inputs || {},
      
      // Complete blackboard of all nodes in the workflow: context['nodeId'].output
      context: ctx.workflowContext || {},
      
      // Helper function to query any node by ID: $node('login_api').token
      $node: (nodeId: string) => {
        const target = ctx.workflowContext[nodeId];
        return target ? target.output : null;
      },
      
      // Helper for direct inputs
      $input: inputs,

      // Full Console Logging
      console: {
        log: (...args: any[]) => pushLog('LOG', args),
        warn: (...args: any[]) => pushLog('WARN', args),
        error: (...args: any[]) => pushLog('ERROR', args),
      },
      
      // Safe Utilities
      JSON,
      Math,
      Date,
      parseInt,
      parseFloat,
      encodeURIComponent,
      decodeURIComponent,
      module: { exports: null as any },
      exports: {} as any,
    };

    // 3. Create the Isolated VM Context
    const vmContext = vm.createContext(sandbox);

    try {
      // Wrap code in an async runner to support async/await and promises
      const script = new vm.Script(`
        (async function() {
          ${rawCode}
          
          if (typeof module.exports === 'function') {
            return await module.exports(inputs, context);
          } else if (typeof exports.default === 'function') {
            return await exports.default(inputs, context);
          } else if (typeof main === 'function') {
            return await main(inputs, context);
          } else {
            return module.exports || exports;
          }
        })()
      `);

      // 4. Run user script with strict 10s timeout
      const output = await script.runInContext(vmContext, {
        timeout: timeoutMs,
        displayErrors: true,
      });

      const durationMs = Date.now() - startTime;

      // 5. Emit all collected logs to frontend live telemetry
      if (logs.length > 0) {
        ctx.emitTelemetry('RUNNING', `Console Logs:\n${logs.join('\n')}`);
      }

      ctx.emitTelemetry('COMPLETED', `Custom code executed successfully in ${durationMs}ms`);

      return {
        success: true,
        output,
        metrics: {
          durationMs,
          logsCount: logs.length,
        },
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err.message || 'Error executing custom JavaScript code';

      if (logs.length > 0) {
        ctx.emitTelemetry('RUNNING', `Console Logs before error:\n${logs.join('\n')}`);
      }
      ctx.emitTelemetry('FAILED', `Custom code runtime error: ${errorMessage}`);

      throw new Error(`[CustomCodeNode Error]: ${errorMessage}`);
    }
  }
}
