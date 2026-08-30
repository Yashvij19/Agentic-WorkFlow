import { INodeExecutor  , ExecutionContext , NodeExecutionResult } from "../types";
import { injectVariables } from "../../utils/interpolation";
import { executeAiAgent } from "../../utils/aiAgent";


export interface AgentNodeConfig{
    promt?:string;
    model?:string;
    temperature?:string;
}

export class AgentNode implements INodeExecutor<AgentNodeConfig>{


    public readonly type='agent';
    public readonly name="AI Agent";
    public readonly description='Executes generative AI prompts using Gemini with dynamic variable injection.';

    public async execute(config: AgentNodeConfig, inputs: any, ctx: ExecutionContext): Promise<NodeExecutionResult<any>> {
        const startTime=Date.now();
        const rawPrompt=config?.promt||'';

        // 1. Variable Injection: Replace {{node_1.output}} with actual data from memory

        const hydratedPrompt = injectVariables(rawPrompt, ctx.workflowContext);
         ctx.emitTelemetry('RUNNING', `Agent prompt prepared: "${hydratedPrompt.slice(0, 80)}..."`);

         // 2. Fetch credentials from context (passed by worker)
    const encryptedKey = ctx.credentials?.['GEMINI_API_KEY'];

    if(!encryptedKey){
         console.warn(`⚠️ [AgentNode] No GEMINI_API_KEY found. Using mock execution fallback.`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
       const durationMs = Date.now() - startTime;
      return {
        success: true,
        output: `[Mock AI Response for: ${hydratedPrompt}]`,
        metrics: {
          durationMs,
          tokensUsed: 0,
        }
      };
    }

     // 3. Call AI Service
    ctx.emitTelemetry('RUNNING', `Calling Gemini API...`);
    const aiResponse = await executeAiAgent({
      prompt: hydratedPrompt,
      encryptedApiKey: encryptedKey,
    });

    const durationMs =Date.now() - startTime;

    // 4. Return standard result
    return {
      success: true,
      output: aiResponse.output,
      metrics: {
        durationMs: aiResponse.durationMs || durationMs,
        tokensUsed: aiResponse.usage?.totalTokens || 0,
      }
    };


    
    }
}