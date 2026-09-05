import { INodeExecutor, ExecutionContext, NodeExecutionResult } from '../types';
import { Worker } from 'node:worker_threads';

export interface CustomCodeConfig {
  /** The raw JavaScript code written by the user in the Monaco Editor */
  code?: string;
  /** Execution timeout in milliseconds (default: 10000ms = 10s, max: 30000ms) */
  timeoutMs?: number;
}

/**
 * Isolated Worker Thread runner script.
 * Executed in a completely separate V8 thread so synchronous infinite loops
 * and memory bombs never block or crash the main server's event loop.
 */
const WORKER_RUNNER_SCRIPT = `
const { parentPort, workerData } = require('node:worker_threads');
const vm = require('node:vm');

(async () => {
  const { rawCode, inputs, context, timeoutMs } = workerData;
  const logs = [];
  const pushLog = (type, args) => {
    const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logs.push('[' + type + '] ' + line);
  };

  // 1. Build Restricted Sandbox
  const sandbox = {
    inputs,
    context,
    $input: inputs,
    $node: (nodeId) => {
      const target = context[nodeId];
      return target ? target.output : null;
    },
    console: {
      log: (...args) => pushLog('LOG', args),
      warn: (...args) => pushLog('WARN', args),
      error: (...args) => pushLog('ERROR', args),
    },
    JSON,
    Math,
    Date,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
    Boolean,
    Number,
    String,
    Array,
    Object,
    RegExp,
    Map,
    Set,
    process: undefined,
    require: undefined,
    Buffer: undefined,
    module: { exports: null },
    exports: {},
  };

  const vmContext = vm.createContext(sandbox);

  try {
    const wrappedScript = new vm.Script(\`
      (async function() {
        'use strict';
        try {
          Object.defineProperty(Object.prototype, 'constructor', {
            get: function() { return undefined; },
            set: function() {},
            configurable: false
          });
          Object.defineProperty(Function.prototype, 'constructor', {
            get: function() { return undefined; },
            set: function() {},
            configurable: false
          });
        } catch (_) {}

        \${rawCode}

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
    \`);

    const output = await wrappedScript.runInContext(vmContext, {
      timeout: timeoutMs,
      displayErrors: true,
    });

    parentPort.postMessage({ success: true, output, logs });
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message || String(err), logs });
  }
})();
`;

export class CustomCodeNode implements INodeExecutor<CustomCodeConfig> {
  public readonly type = 'custom_code';
  public readonly name = 'Custom Code (JS)';
  public readonly description = 'Executes sandboxed custom JavaScript in an isolated worker thread with dynamic access to node outputs and workflow context.';

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

    ctx.emitTelemetry('RUNNING', `Executing custom JavaScript in isolated Worker Thread (Timeout: ${timeoutMs}ms, Max Heap: 64MB)...`);

    // Clone pure data to detach from host prototype objects before passing to worker
    const cleanInputs = inputs !== undefined ? JSON.parse(JSON.stringify(inputs)) : {};
    const cleanContext = ctx.workflowContext !== undefined ? JSON.parse(JSON.stringify(ctx.workflowContext)) : {};

    return new Promise((resolve, reject) => {
      let isSettled = false;

      // 🛡️ Spawn worker thread with a hard 64MB memory cap to protect Render's 512MB RAM
      const worker = new Worker(WORKER_RUNNER_SCRIPT, {
        eval: true,
        workerData: {
          rawCode,
          inputs: cleanInputs,
          context: cleanContext,
          timeoutMs,
        },
        resourceLimits: {
          maxOldGenerationSizeMb: 64,
          maxYoungGenerationSizeMb: 16,
        },
      });

      // Watchdog Timer: Terminates worker thread if it exceeds timeout (e.g. infinite loops)
      const timer = setTimeout(async () => {
        if (isSettled) return;
        isSettled = true;
        try {
          await worker.terminate();
        } catch (_) {}
        ctx.emitTelemetry('FAILED', `Custom code execution timed out after ${timeoutMs}ms (Worker terminated)`);
        reject(new Error(`[CustomCodeNode Error]: Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      worker.on('message', async (msg) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        try {
          await worker.terminate();
        } catch (_) {}

        // Emit captured console logs
        if (msg.logs && msg.logs.length > 0) {
          ctx.emitTelemetry('RUNNING', `Console Logs:\n${msg.logs.join('\n')}`);
        }

        if (msg.success) {
          const durationMs = Date.now() - startTime;
          ctx.emitTelemetry('COMPLETED', `Custom code executed successfully in ${durationMs}ms`);
          resolve({
            success: true,
            output: msg.output,
            metrics: {
              durationMs,
              logsCount: msg.logs?.length || 0,
            },
          });
        } else {
          ctx.emitTelemetry('FAILED', `Custom code runtime error: ${msg.error}`);
          reject(new Error(`[CustomCodeNode Error]: ${msg.error}`));
        }
      });

      worker.on('error', async (err: any) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        try {
          await worker.terminate();
        } catch (_) {}

        const msg = err.message || String(err);
        ctx.emitTelemetry('FAILED', `Custom code worker crash: ${msg}`);
        reject(new Error(`[CustomCodeNode Error]: ${msg}`));
      });

      worker.on('exit', (code) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`[CustomCodeNode Error]: Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}
