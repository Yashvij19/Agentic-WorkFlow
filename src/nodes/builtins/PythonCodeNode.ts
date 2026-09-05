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

    // 1. Prepare Hardened Python Runner Harness
    // Injects security audit hook, sanitizes inputs, executes user's main(), and emits boundaries
    const runnerScript = `
import json
import sys
import os
import traceback

# 🛡️ 1. Resource Limits (POSIX / Linux / Render Production)
# Hard caps RAM to 128MB so memory bombs cannot trigger host Linux OOM killer
try:
    import resource
    MAX_RAM_BYTES = 128 * 1024 * 1024  # 128 MB max memory
    resource.setrlimit(resource.RLIMIT_AS, (MAX_RAM_BYTES, MAX_RAM_BYTES))
    resource.setrlimit(resource.RLIMIT_CPU, (25, 25))  # 25 seconds max CPU time
except (ImportError, Exception):
    pass

# 🛡️ 2. CPython Runtime Audit Hook Security Sandbox
# Intercepts and blocks dangerous OS operations before they can execute
def _sandbox_audit_hook(event, args):
    blocked_events = {
        'os.system', 'os.spawn', 'os.exec', 'os.posix_spawn', 'os.kill', 'os.killpg',
        'os.fork', 'os.forkpty', 'pty.spawn',
        'subprocess.Popen', 'subprocess.call', 'subprocess.check_output',
        'ctypes.dlopen', 'ctypes.dlsym'
    }
    if event in blocked_events:
        raise PermissionError(f"Security Alert: Execution of '{event}' is strictly forbidden in the workflow sandbox.")

try:
    sys.addaudithook(_sandbox_audit_hook)
except Exception:
    pass

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
      // 2. Spawn isolated Python process with sterile environment (Secrets Scrubbed!)
      const safeEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH || '',
        SystemRoot: process.env.SystemRoot || '',
        WINDIR: process.env.WINDIR || '',
        TEMP: process.env.TEMP || '',
        TMP: process.env.TMP || '',
        PYTHONIOENCODING: 'utf-8',
        // Note: DATABASE_URL, ENCRYPTION_KEY, JWT_SECRET are deliberately omitted!
      };

      const pyProcess = spawn(
        'python',
        ['-c', runnerScript, JSON.stringify(inputs || {}), JSON.stringify(ctx.workflowContext || {})],
        { 
          timeout: timeoutMs,
          killSignal: 'SIGTERM',
          env: safeEnv,
        }
      );

      // Watchdog: If process does not exit within 1s of timeout, force SIGKILL
      const forceKillTimer = setTimeout(() => {
        try {
          pyProcess.kill('SIGKILL');
        } catch (_) {}
      }, timeoutMs + 1000);

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
        clearTimeout(forceKillTimer);
        const durationMs = Date.now() - startTime;

        if (signal === 'SIGTERM' || signal === 'SIGKILL' || durationMs >= timeoutMs) {
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
