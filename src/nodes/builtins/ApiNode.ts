import { INodeExecutor, ExecutionContext, NodeExecutionResult } from '../types';
import { injectVariables } from '../../utils/interpolation';

export interface ApiNodeConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
}

export class ApiNode implements INodeExecutor<ApiNodeConfig> {
  public readonly type = 'api';
  public readonly name = 'HTTP API Request';
  public readonly description = 'Performs external REST API requests (GET/POST/PUT/DELETE) with variable injection.';

  public async execute(
    config: ApiNodeConfig,
    inputs: any,
    ctx: ExecutionContext
  ): Promise<NodeExecutionResult<any>> {
    const startTime = Date.now();

    if (!config?.url) {
      throw new Error(`[ApiNode] URL is required to make an HTTP request.`);
    }

    // 1. Hydrate URL and Method
    const rawUrl = config.url;
    const hydratedUrl = injectVariables(rawUrl, ctx.workflowContext);
    const method = config.method || 'GET';

    ctx.emitTelemetry('RUNNING', `Sending ${method} request to: ${hydratedUrl}`);

    // 2. Prepare Headers & Body
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
      
    };
        if (config.headers) {
            for (const [key, value] of Object.entries(config.headers)) {
                headers[key] = injectVariables(value, ctx.workflowContext);
            }
        }

    let requestBody: string | undefined = undefined;
    if (config.body && method !== 'GET') {
      const bodyStr = typeof config.body === 'string' 
        ? config.body 
        : JSON.stringify(config.body);
      requestBody = injectVariables(bodyStr, ctx.workflowContext);
    }

    // 3. Make HTTP call
    const response = await fetch(hydratedUrl, {
      method,
      headers,
      body: requestBody,
    });

    let responseData: any;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    const durationMs = Date.now() - startTime;

    // 4. Handle non-2xx status codes
    if (!response.ok) {
      throw new Error(
        `API request failed with status HTTP ${response.status}: ${JSON.stringify(responseData)}`
      );
    }

    ctx.emitTelemetry('COMPLETED', `API request succeeded (HTTP ${response.status}) in ${durationMs}ms`);

    return {
      success: true,
      output: responseData,
      metrics: {
        durationMs,
        status: response.status,
      }
    };
  }
}
