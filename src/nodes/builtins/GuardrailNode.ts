import { INodeExecutor , ExecutionContext , NodeExecutionResult , GuardrailNodeConfig  , RetryFeedback } from "../types";

import { executeAiAgent } from "../../utils/aiAgent";

export class GuardrailNode implements INodeExecutor<GuardrailNodeConfig>{


    public readonly type='guardrail';
    public readonly name = 'Autonomous Guardrail';
    public readonly description = 'Validates output against strict schemas, safety rules, or LLM-as-a-Judge and triggers self-correction loops.';



    public async execute(config: GuardrailNodeConfig, inputs: any, ctx: ExecutionContext): Promise<NodeExecutionResult<any>> {
        
        
        const startTime = Date.now();
        const mode = config?.mode || 'strict_json';
        const maxRetries = config?.maxRetries ?? 3;

        // 1. Extract raw candidate text to inspect
        const rawText = this.extractRawText(inputs);

         // 2. Track retry count from shared memory
            const retryKey = `${ctx.nodeId}_retry_count`;
            const currentRetryCount = (ctx.workflowContext[retryKey] || 0) + 1;

        // 3. Identify target upstream node to correct if validation fails
    const targetNodeId = this.resolveTargetNodeId(config, ctx);

    ctx.emitTelemetry(
      'RUNNING',
      `🛡️ Guardrail running [Mode: ${mode}] (Attempt ${currentRetryCount}/${maxRetries})...`
    );


    // 4. Run the appropriate validation strategy
    let validationResult: { passed: boolean; reason?: string; sanitizedOutput?: any };

    try{
        switch(mode){
            case 'strict_json':
                validationResult=this.validateStrictJson(rawText);
                break;
            case 'required_keys':
                validationResult=this.validateRequiredKeys(rawText, config.requiredKeys || []);
                break;
            case 'banned_keywords':
                validationResult=this.validateBannedWords(rawText, config.bannedWords || []);
                break;
            case 'llm_judge':
                validationResult=await this.validateLlmJudge(rawText, config.llmJudgePrompt, ctx);
                break;
            case 'regex_match':
                validationResult= this.validateRegex(rawText, config.regexPattern, config.regexFlags);
            default:
                validationResult = { passed: true, sanitizedOutput: rawText };
        }
    }catch(err:any){
        validationResult = {
        passed: false,
        reason: `Validation execution error: ${err.message}`,
      };
    }

       const durationMs = Date.now() - startTime;


        // ==========================================
    // OUTCOME A: VALIDATION PASSED ✅
    // ==========================================
    if (validationResult.passed) {
      ctx.emitTelemetry(
        'COMPLETED',
        `✅ Guardrail check passed! (${mode})`
      );



       return {
        success: true,
        output: validationResult.sanitizedOutput ?? rawText,
        metrics: { durationMs },
      };


    }
       // ==========================================
    // OUTCOME B: VALIDATION FAILED ❌ (SELF-HEAL OR ABORT)
    // ==========================================
     const shouldRetry = currentRetryCount <= maxRetries;
     const baseReason = validationResult.reason || 'Guardrail validation failed';
     const finalReason = config.customErrorMessage
      ? `${baseReason} Guidance: ${config.customErrorMessage}`
      : baseReason;

      const retryFeedback: RetryFeedback = {
      targetNodeId,
      reason: finalReason,
      retryCount: currentRetryCount,
      maxRetries,
      shouldRetry,
      augmentedPrompt: `[CORRECTION REQUIRED - ATTEMPT ${currentRetryCount}/${maxRetries}]: ${finalReason}`,
    };
    ctx.emitTelemetry(
      shouldRetry ? 'RUNNING' : 'FAILED',
      shouldRetry
        ? `⚠️ Guardrail rejected output. Triggering self-correction loop (${currentRetryCount}/${maxRetries}): ${baseReason}`
        : `☠️ Guardrail failed permanently after ${maxRetries} attempts: ${baseReason}`,
      { retryFeedback }
    );

     return {
      success: false,
      output: null,
      error: `Guardrail failed: ${finalReason}`,
      retryFeedback,
      metrics: { durationMs },
    };

}
// ==========================================
  // VALIDATION STRATEGIES (HELPER METHODS)
  // ==========================================


    /** 1. Strict JSON check: strips markdown code fences and verifies JSON.parse */

private validateStrictJson(text: string): { passed: boolean; reason?: string; sanitizedOutput?: any } {

 const cleaned = this.cleanJsonString(text);
    if (!cleaned) {
      return { passed: false, reason: 'Output is empty or contains no JSON payload.' };
    }
    try{
         const parsed = JSON.parse(cleaned);
      return { passed: true, sanitizedOutput: parsed };
    }catch(err:any){

        return {
        passed: false,
        reason: `Invalid JSON syntax: ${err.message}. Ensure response contains strictly valid JSON without markdown wrapping.`,
      };
    }
}

 /** 2. Required Keys check: ensures parsed JSON object contains mandatory properties */

  private validateRequiredKeys(
    text: string,
    requiredKeys: string[]
  ): { passed: boolean; reason?: string; sanitizedOutput?: any } {

    const jsonCheck = this.validateStrictJson(text);
    if (!jsonCheck.passed) return jsonCheck;


 const parsed = jsonCheck.sanitizedOutput;
     if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { passed: false, reason: 'Expected JSON output to be a key-value object.' };
    }

     const missingKeys = requiredKeys.filter((key) => !(key in parsed));
    if (missingKeys.length > 0) {
      return {
        passed: false,
        reason: `Output is missing required fields: [${missingKeys.join(', ')}].`,
      };
    }
    return { passed: true, sanitizedOutput: parsed };


  }

  /** 3. Regex Match check */

  private validateRegex(
    text: string,
    pattern?: string,
    flags?: string
  ): { passed: boolean; reason?: string; sanitizedOutput?: any } {

    if (!pattern) return { passed: true, sanitizedOutput: text };

    try{
         const regex = new RegExp(pattern, flags || 'i');
      const matches = regex.test(text);
       if (!matches) {
        return {
          passed: false,
          reason: `Output failed regex compliance check for pattern: /${pattern}/${flags || ''}`,
        };
      }
      return { passed: true, sanitizedOutput: text };
    } catch (err: any) {
      return { passed: false, reason: `Invalid regex configuration: ${err.message}` };
    }

  }

  /** 4. Banned Keywords check: rejects output if any blacklisted word appears */

    private validateBannedWords(
    text: string,
    bannedWords: string[]
  ): { passed: boolean; reason?: string; sanitizedOutput?: any } {

    if (!bannedWords || bannedWords.length === 0) {
      return { passed: true, sanitizedOutput: text };
    }

      const lowerText = text.toLowerCase();
    const foundBanned = bannedWords.filter((w) => w.trim() && lowerText.includes(w.toLowerCase().trim()));

    if (foundBanned.length > 0) {
      return {
        passed: false,
        reason: `Output contains prohibited keyword(s): [${foundBanned.join(', ')}]. Remove these terms.`,
      };
    }
    return { passed: true, sanitizedOutput: text };
  }

  /** 5. LLM-as-a-Judge semantic verification using Gemini */

    private async validateLlmJudge(
    text: string,
    judgePrompt: string | undefined,
    ctx: ExecutionContext
  ): Promise<{ passed: boolean; reason?: string; sanitizedOutput?: any }> {

    const encryptedKey = ctx.credentials?.['GEMINI_API_KEY'];

    if (!encryptedKey) {
      throw new Error(
        `[GuardrailNode] LLM-as-a-Judge requires 'GEMINI_API_KEY' credential for organization '${ctx.orgId}'. Please configure your Gemini API key in Settings > Credentials.`
      );
    }

       const evaluationCriteria = judgePrompt ||'Evaluate whether the candidate response is accurate, safe, polite, and answers the prompt properly.';
    const systemPrompt = `You are a strict, impartial Quality & Safety Auditor in an autonomous workflow system.
                Your task is to evaluate the following candidate output according to the provided criteria.
                Criteria:
                "${evaluationCriteria}"
                Candidate Output:
                """
                ${text}
                """
                Respond in strictly valid JSON format with exactly two keys:
                {
                "verdict": "PASS" or "FAIL",
                "reason": "Clear, concise reason explaining your verdict."
                }`;

    const judgeResponse = await executeAiAgent({
      prompt: systemPrompt,
      encryptedApiKey: encryptedKey,
    });

    const parsedJudge = this.validateStrictJson(judgeResponse.output);

     if (parsedJudge.passed && parsedJudge.sanitizedOutput?.verdict) {
      const isPass = String(parsedJudge.sanitizedOutput.verdict).toUpperCase() === 'PASS';

      return {
        passed: isPass,
        reason: isPass ? undefined : parsedJudge.sanitizedOutput.reason || 'Failed LLM-as-a-Judge evaluation.',
        sanitizedOutput: text,
      };

    }

  // Fallback: heuristic check on raw text if judge didn't return pure JSON

 const judgeText = judgeResponse.output.toUpperCase();
    const passed = judgeText.includes('PASS') && !judgeText.includes('FAIL');
    return {
      passed,
      reason: passed ? undefined : `Judge evaluation failed: ${judgeResponse.output.slice(0, 150)}`,
      sanitizedOutput: text,
    };
}

// ==========================================
  // UTILITY HELPERS
  // ==========================================

  /** Normalizes input payload into a string */


private extractRawText(inputs: any): string {


    if (inputs === null || inputs === undefined) return '';
    if (typeof inputs === 'string') return inputs;
    if (typeof inputs === 'object') {

     if (typeof inputs.output === 'string') return inputs.output;
      if (inputs.output !== undefined) return JSON.stringify(inputs.output);
      // If object has a single property (e.g. from parent node)
      const keys = Object.keys(inputs);
      if (keys.length === 1 && inputs[keys[0]]?.output !== undefined) {
        const val = inputs[keys[0]].output;
        return typeof val === 'string' ? val : JSON.stringify(val);
    }
    return JSON.stringify(inputs);
    }
     return String(inputs);
}


/** Strips markdown code block wrappers like ```json ... ``` */
  private cleanJsonString(str: string): string {

    let clean = str.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }
    return clean;

  }

    /** Automatically infers upstream node ID from context if not specified */

     private resolveTargetNodeId(config: GuardrailNodeConfig, ctx: ExecutionContext): string {
    if (config?.targetNodeId && config.targetNodeId.trim()) {
      return config.targetNodeId.trim();
    }
    // Fallback: find the most recent ancestor node in memory
    const contextKeys = Object.keys(ctx.workflowContext).filter(
      (k) => k !== ctx.nodeId && !k.endsWith('_retry_count') && !k.startsWith('$')
    );
    return contextKeys.length > 0 ? contextKeys[contextKeys.length - 1] : 'upstream_node';
  }


  
}