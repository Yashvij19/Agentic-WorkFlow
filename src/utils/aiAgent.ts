import { decryptCredential } from "./crypto";

interface ExecuteAgentParams {
  prompt: string;
  encryptedApiKey: string;
  model?: string;
}

export async function executeAiAgent({
  prompt,
  encryptedApiKey,
  model = "gemini-2.5-flash",
}: ExecuteAgentParams) {
  // 1. Decrypt API Key
  const apiKey = decryptCredential(encryptedApiKey);
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({
    apiKey,
  });

  const startTime = Date.now();

  try {
    // 3. Generate Content
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          "You are an autonomous worker agent in a workflow execution engine. Provide clear, concise, and direct answers.",
      },
    });
const durationMs = Date.now() - startTime;

    return {
      output: response.text ?? "",

      durationMs,

      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens:
          response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens:
          response.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);

    throw new Error(
      `AI Execution Failed: ${error.message || "Unknown error"}`
    );
  }
}