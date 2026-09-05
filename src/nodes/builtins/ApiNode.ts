import { INodeExecutor, ExecutionContext, NodeExecutionResult } from '../types';
import { injectVariables } from '../../utils/interpolation';

export interface ApiNodeConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string> | string;
  queryParams?: Record<string, string> | string;
  contentType?: string;
  body?: string | Record<string, any>;
  bearerToken?: string;
  authHeaderName?: string;
  authHeaderValue?: string;
  timeoutMs?: number;
}

export class ApiNode implements INodeExecutor<ApiNodeConfig> {
  public readonly type = 'api';
  public readonly name = 'HTTP API Request';
  public readonly description = 'Performs external REST API requests (GET/POST/PUT/PATCH/DELETE) with variable injection, query params, custom headers, and auth tokens.';

  public async execute(
    config: ApiNodeConfig,
    inputs: any,
    ctx: ExecutionContext
  ): Promise<NodeExecutionResult<any>> {
    const startTime = Date.now();

    if (!config?.url || !config.url.trim()) {
      throw new Error(`[ApiNode] URL is required to make an HTTP request.`);
    }

    const method = (config.method || 'GET').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

    // 1. Variable Injection into URL
    let hydratedUrl = injectVariables(config.url.trim(), ctx.workflowContext);

    // 2. Append Query Parameters if configured
    if (config.queryParams) {
      const params = new URLSearchParams();
      if (typeof config.queryParams === 'string') {
        try {
          const parsed = JSON.parse(config.queryParams);
          for (const [k, v] of Object.entries(parsed)) {
            if (k) params.append(k, injectVariables(String(v), ctx.workflowContext));
          }
        } catch {
          // If query string format: "key=val&foo=bar" or newline separated
          const rawPairs = config.queryParams.includes('\n')
            ? config.queryParams.split('\n')
            : config.queryParams.split('&');

          for (const pair of rawPairs) {
            const trimmed = pair.trim();
            if (!trimmed) continue;
            const [k, ...vParts] = trimmed.split('=');
            if (k) {
              const val = vParts.join('=');
              params.append(k.trim(), injectVariables(val.trim(), ctx.workflowContext));
            }
          }
        }
      } else if (typeof config.queryParams === 'object') {
        for (const [k, v] of Object.entries(config.queryParams)) {
          if (k) params.append(k, injectVariables(String(v), ctx.workflowContext));
        }
      }

      const queryString = params.toString();
      if (queryString) {
        hydratedUrl += (hydratedUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    ctx.emitTelemetry('RUNNING', `Sending ${method} request to: ${hydratedUrl}`);

    // 3. Assemble and Hydrate Headers
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
    };

    // Set Content-Type for payload requests
    if (method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = config.contentType || 'application/json';
    }

    // Custom headers parsing (Supports JSON string, Key-Value lines, or Record)
    if (config.headers) {
      if (typeof config.headers === 'string') {
        try {
          const parsed = JSON.parse(config.headers);
          for (const [k, v] of Object.entries(parsed)) {
            headers[k] = injectVariables(String(v), ctx.workflowContext);
          }
        } catch {
          // Fallback to "Header-Name: Value" newline-delimited format
          const lines = config.headers.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex !== -1) {
              const k = trimmed.slice(0, colonIndex).trim();
              const v = trimmed.slice(colonIndex + 1).trim();
              if (k) headers[k] = injectVariables(v, ctx.workflowContext);
            }
          }
        }
      } else if (typeof config.headers === 'object') {
        for (const [k, v] of Object.entries(config.headers)) {
          headers[k] = injectVariables(String(v), ctx.workflowContext);
        }
      }
    }

    // Bearer token convenience field
    if (config.bearerToken && config.bearerToken.trim()) {
      const token = injectVariables(config.bearerToken.trim(), ctx.workflowContext);
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Custom Auth Header convenience field (e.g. X-API-Key: value)
    if (config.authHeaderName && config.authHeaderValue) {
      const headerName = config.authHeaderName.trim();
      const headerValue = injectVariables(config.authHeaderValue.trim(), ctx.workflowContext);
      if (headerName && headerValue) {
        headers[headerName] = headerValue;
      }
    }

    // 4. Prepare Request Body (Only for methods that permit body payloads)
    let requestBody: string | undefined = undefined;
    const allowsBody = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    if (allowsBody) {
      if (config.body !== undefined && config.body !== null && config.body !== '') {
        const bodyStr = typeof config.body === 'string'
          ? config.body
          : JSON.stringify(config.body);
        requestBody = injectVariables(bodyStr, ctx.workflowContext);
      } else if (inputs !== undefined && inputs !== null && method !== 'DELETE') {
        // Smart fallback: If user didn't write explicit body template, use upstream inputs!
        requestBody = typeof inputs === 'string' ? inputs : JSON.stringify(inputs);
      }
    }

    // 5. Execute HTTP call with AbortController timeout protection
    const timeoutMs = config.timeoutMs ?? 15000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(hydratedUrl, {
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`[ApiNode] HTTP request timed out after ${timeoutMs / 1000}s to: ${hydratedUrl}`);
      }
      throw new Error(`[ApiNode] Network fetch error: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }

    // 6. Parse Response Body
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

    // 7. Handle HTTP Error Status Codes
    if (!response.ok) {
      const errorSnippet = typeof responseData === 'object' ? JSON.stringify(responseData) : String(responseData);
      throw new Error(
        `API request failed with HTTP ${response.status} (${response.statusText}): ${errorSnippet.slice(0, 300)}`
      );
    }

    ctx.emitTelemetry('COMPLETED', `API request succeeded (HTTP ${response.status}) in ${durationMs}ms`);

    return {
      success: true,
      output: responseData,
      metrics: {
        durationMs,
        status: response.status,
      },
    };
  }
}
