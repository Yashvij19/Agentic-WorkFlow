import { decryptCredential } from '../../../utils/crypto';
import { prisma } from '../../../utils/db';
import { spawn } from 'child_process';
import * as path from 'path';
import crypto from 'crypto';

export class GeminiEmbedder {
  /**
   * Determines active embedding provider:
   * - In production (Render): Always 'gemini' to protect the 512MB RAM limit.
   * - In local development: Respects EMBEDDING_PROVIDER='local' | 'gemini' (defaults to 'gemini').
   */
  static getProvider(): 'gemini' | 'local' {
    if (process.env.NODE_ENV === 'production') {
      return 'gemini';
    }
    const configured = (process.env.EMBEDDING_PROVIDER || '').toLowerCase();
    return configured === 'local' ? 'local' : 'gemini';
  }

  /**
   * Determines active query embedding provider:
   * - In production (NODE_ENV === 'production'): Always 'gemini' to protect the 512MB RAM limit.
   * - In local development: Respects QUERY_EMBEDDING='local' | 'production' | 'gemini'
   *   (falls back to EMBEDDING_PROVIDER, defaults to 'gemini').
   */
  static getQueryProvider(): 'gemini' | 'local' {
    if (process.env.NODE_ENV === 'production') {
      return 'gemini';
    }
    const queryConfig = (process.env.QUERY_EMBEDDING || '').toLowerCase().trim();
    if (queryConfig === 'production' || queryConfig === 'gemini') {
      return 'gemini';
    }
    if (queryConfig === 'local') {
      return 'local';
    }
    return this.getProvider();
  }

  /**
   * Retrieves decrypted Gemini API key strictly from the organization's saved credentials in DB.
   * Multi-tenant isolation: Never falls back to server-level process.env.
   */
  static async getApiKey(orgId?: string): Promise<string | null> {
    if (!orgId) {
      return null;
    }
    try {
      const cred = await prisma.credential.findFirst({
        where: { organizationId: orgId, name: 'GEMINI_API_KEY' },
      });
      if (cred?.encryptedData) {
        return decryptCredential(cred.encryptedData);
      }
    } catch (e: any) {
      console.warn(`⚠️ [GeminiEmbedder] Could not retrieve GEMINI_API_KEY for organization '${orgId}': ${e.message}`);
    }
    return null;
  }

  /**
   * Strips lone Unicode surrogates (U+D800 to U+DFFF) to prevent UTF-8 codec errors in Python or JSON APIs.
   */
  static sanitizeText(text: string): string {
    if (!text) return '';
    return text.replace(/[\uD800-\uDFFF]/g, '');
  }

  /**
   * Generates embeddings with automatic environment & provider switching:
   * - If EMBEDDING_PROVIDER='local' in dev: runs local Python SentenceTransformers (bge-m3).
   * - Otherwise: calls Google Gemini Cloud text-embedding-004.
   * - Gracefully falls back if local Python or cloud network fails.
   */
  static async getEmbeddings(texts: string[], orgId?: string): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const sanitizedTexts = texts.map((t) => this.sanitizeText(t));
    const provider = this.getProvider();

    // 1. Local Python SentenceTransformers (for local testing on 16GB RAM laptop)
    if (provider === 'local') {
      try {
        return await this.getLocalEmbeddings(sanitizedTexts);
      } catch (err: any) {
        console.warn(`⚠️ [Embedder] Local SentenceTransformers failed (${err.message}). Falling back to Gemini Cloud.`);
      }
    }

    // 2. Google Gemini Cloud Embeddings
    return await this.getGeminiCloudEmbeddings(sanitizedTexts, orgId);
  }

  /**
   * Single text query embedding for vector similarity search.
   * Controlled independently by QUERY_EMBEDDING='local' | 'production' | 'gemini'.
   */
  static async getQueryEmbedding(query: string, orgId?: string): Promise<number[]> {
    const cleanQuery = this.sanitizeText(query);
    const provider = this.getQueryProvider();

    if (provider === 'local') {
      try {
        const res = await this.getLocalEmbeddings([cleanQuery]);
        if (res && res.length > 0) return res[0];
      } catch (err: any) {
        console.warn(`⚠️ [Embedder] Local query embedding failed, falling back to Gemini.`);
      }
    }

    const cloudRes = await this.getGeminiCloudEmbeddings([cleanQuery], orgId);
    if (!cloudRes[0]) {
      throw new Error('Please configure the LLM Key in the credentials manager first.');
    }
    return cloudRes[0];
  }

  /**
   * Encapsulates Google Gemini Cloud API embeddings with batching
   */
  private static async getGeminiCloudEmbeddings(sanitizedTexts: string[], orgId?: string): Promise<number[][]> {
    const apiKey = await this.getApiKey(orgId);

    if (!apiKey) {
      throw new Error('Please configure the LLM Key in the credentials manager first.');
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const results: number[][] = [];
      // Batch in slices of 50 to respect Gemini API batch size
      for (let i = 0; i < sanitizedTexts.length; i += 50) {
        const slice = sanitizedTexts.slice(i, i + 50);
        let response: any;
        try {
          response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: slice,
            config: { outputDimensionality: 768 },
          });
        } catch {
          response = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: slice,
          });
        }

        if (response.embeddings) {
          for (let j = 0; j < response.embeddings.length; j++) {
            const vals = response.embeddings[j].values;
            if (!vals) {
              throw new Error('Gemini API returned an empty embedding vector.');
            }
            results.push(vals);
          }
        }
      }

      if (results.length === sanitizedTexts.length) {
        return results;
      }
      throw new Error(`Embedding count mismatch: expected ${sanitizedTexts.length}, got ${results.length}`);
    } catch (err: any) {
      throw new Error(`Failed to generate embeddings: ${err.message}`);
    }
  }

  /**
   * Executes local Python embed_worker.py (SentenceTransformers BAAI/bge-m3)
   */
  private static getLocalEmbeddings(texts: string[]): Promise<number[][]> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve(__dirname, '..', 'ingestion', 'parsers', 'embed_worker.py');
      const child = spawn('python', [scriptPath]);
      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => { stdoutData += data.toString(); });
      child.stderr.on('data', (data) => { stderrData += data.toString(); });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`embed_worker exited with code ${code}. Stderr: ${stderrData}`));
        }
        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed.error) return reject(new Error(parsed.error));
          resolve(parsed);
        } catch (err: any) {
          reject(new Error(`Failed to parse local embeddings JSON: ${err.message}`));
        }
      });

      child.stdin.write(JSON.stringify(texts));
      child.stdin.end();
    });
  }
}
