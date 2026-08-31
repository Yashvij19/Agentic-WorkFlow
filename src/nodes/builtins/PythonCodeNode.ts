import { INodeExecutor, ExecutionContext, NodeExecutionResult } from '../types';
import { spawn } from 'node:child_process';

export interface PythonCodeConfig {
  /** The raw Python 3 code written by the user */
  code?: string;
  /** Execution timeout in milliseconds (default: 10000ms = 10s) */
  timeoutMs?: number;
}

export class PythonCodeNode implements INodeExecutor<PythonCodeConfig> {
  public readonly type = 'python_code';
  public readonly name = 'Custom Python Script';
  public readonly description = 'Executes sandboxed custom Python 3 with dynamic access to inputs and workflow memory.';

  public async execute(
    config: PythonCodeConfig,
    inputs: any,
    ctx: ExecutionContext
  ): Promise<NodeExecutionResult<any>> {
    const startTime = Date.now();
    const rawCode = config?.code?.trim() || '';
    const timeoutMs = Math.min(config?.timeoutMs || 10000, 30000);

    if (!rawCode) {
      return {
        success: true,
        output: inputs || null,
        metrics: { durationMs: Date.now() - startTime },
      };
    }

    ctx.emitTelemetry('RUNNING', `Executing Python script (Timeout: ${timeoutMs}ms)...`);

    // 1. Prepare Python Runner Harness
    // Injects inputs and context as JSON, executes user's main(), and prints output marker
    const runnerScript = `
import json
import sys
import traceback

try:
    # Load inputs and workflowContext passed as CLI args
    inputs = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    context = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

    # User's Python Code:
${rawCode.split('\n').map(line => '    ' + line).join('\n')}

    # Execute main()
    if 'main' in locals() and callable(locals()['main']):
        result = main(inputs, context)
    else:
        result = locals().get('output', inputs)

    # Serialize result with clear boundary marker
    print("__PYTHON_OUTPUT_START__")
    print(json.dumps(result))
    print("__PYTHON_OUTPUT_END__")

except Exception as e:
    sys.stderr.write(traceback.format_exc())
    sys.exit(1)
`;

    return new Promise((resolve, reject) => {
      // 2. Spawn isolated Python process
      const pyProcess = spawn(
        'python',
        ['-c', runnerScript, JSON.stringify(inputs || {}), JSON.stringify(ctx.workflowContext || {})],
        { timeout: timeoutMs }
      );

      let stdoutData = '';
      let stderrData = '';

      pyProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      // 3. Handle Process Completion / Timeout
      pyProcess.on('close', (code, signal) => {
        const durationMs = Date.now() - startTime;

        if (signal === 'SIGTERM' || durationMs >= timeoutMs) {
          ctx.emitTelemetry('FAILED', `Python script execution timed out after ${timeoutMs}ms`);
          return reject(new Error(`[PythonCodeNode Error]: Execution timed out after ${timeoutMs}ms`));
        }

        if (code !== 0) {
          const errorMsg = stderrData.trim() || `Python process exited with code ${code}`;
          ctx.emitTelemetry('FAILED', `Python error:\n${errorMsg}`);
          return reject(new Error(`[PythonCodeNode Error]:\n${errorMsg}`));
        }

        // 4. Parse Output and Extract User Logs
        let userLogs = '';
        let finalOutput: any = null;

        const startMarker = '__PYTHON_OUTPUT_START__\n';
        const endMarker = '\n__PYTHON_OUTPUT_END__';

        const startIndex = stdoutData.indexOf('__PYTHON_OUTPUT_START__');
        const endIndex = stdoutData.indexOf('__PYTHON_OUTPUT_END__');

        if (startIndex !== -1 && endIndex !== -1) {
          // Everything before the marker is user print() logs!
          userLogs = stdoutData.substring(0, startIndex).trim();
          
          const jsonStr = stdoutData.substring(startIndex + startMarker.length, endIndex).trim();
          try {
            finalOutput = JSON.parse(jsonStr);
          } catch {
            finalOutput = jsonStr;
          }
        } else {
          finalOutput = stdoutData.trim();
        }

        // Emit logs if user used print() statements
        if (userLogs.length > 0) {
          ctx.emitTelemetry('RUNNING', `Python Print Logs:\n${userLogs}`);
        }

        ctx.emitTelemetry('COMPLETED', `Python code executed successfully in ${durationMs}ms`);

        resolve({
          success: true,
          output: finalOutput,
          metrics: {
            durationMs,
          },
        });
      });

      pyProcess.on('error', (err) => {
        ctx.emitTelemetry('FAILED', `Failed to start Python runtime: ${err.message}`);
        reject(new Error(`[PythonCodeNode Runtime Error]: Make sure 'python' is installed in PATH. ${err.message}`));
      });
    });
  }
}
