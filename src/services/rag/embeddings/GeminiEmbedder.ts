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
   * Retrieves decrypted Gemini API key from DB or process.env
   */
  static async getApiKey(orgId?: string): Promise<string | null> {
    if (orgId) {
      try {
        const cred = await prisma.credential.findFirst({
          where: { organizationId: orgId, name: 'GEMINI_API_KEY' },
        });
        if (cred?.encryptedData) {
          return decryptCredential(cred.encryptedData);
        }
      } catch (e) {
        // Ignore DB lookup error and check process.env
      }
    }
    return process.env.GEMINI_API_KEY || null;
  }

  /**
   * Generates embeddings with automatic environment & provider switching:
   * - If EMBEDDING_PROVIDER='local' in dev: runs local Python SentenceTransformers (bge-m3).
   * - Otherwise: calls Google Gemini Cloud text-embedding-004.
   * - Gracefully falls back if local Python or cloud network fails.
   */
  static async getEmbeddings(texts: string[], orgId?: string): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const provider = this.getProvider();

    // 1. Local Python SentenceTransformers (for local testing on 16GB RAM laptop)
    if (provider === 'local') {
      try {
        return await this.getLocalEmbeddings(texts);
      } catch (err: any) {
        console.warn(`⚠️ [Embedder] Local SentenceTransformers failed (${err.message}). Falling back to Gemini Cloud.`);
      }
    }

    // 2. Google Gemini Cloud Embeddings (for 512MB Render production & fast cloud dev)
    const apiKey = await this.getApiKey(orgId);

    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const results: number[][] = [];
        // Batch in slices of 50 to respect Gemini API batch size
        for (let i = 0; i < texts.length; i += 50) {
          const slice = texts.slice(i, i + 50);
          const response = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: slice,
          });

          if (response.embeddings) {
            for (let j = 0; j < response.embeddings.length; j++) {
              const vals = response.embeddings[j].values;
              results.push(vals || this.fallbackVector(slice[j]));
            }
          }
        }

        if (results.length === texts.length) {
          return results;
        }
      } catch (err: any) {
        console.warn(`⚠️ [Embedder] Gemini API call failed, using fallback: ${err.message}`);
      }
    }

    // 3. Fallback normalized vector
    return texts.map((t) => this.fallbackVector(t));
  }

  /**
   * Single text query embedding for vector similarity search
   */
  static async getQueryEmbedding(query: string, orgId?: string): Promise<number[]> {
    const provider = this.getProvider();

    if (provider === 'local') {
      try {
        const res = await this.getLocalEmbeddings([query]);
        if (res && res.length > 0) return res[0];
      } catch (err: any) {
        console.warn(`⚠️ [Embedder] Local query embedding failed, falling back to Gemini.`);
      }
    }

    const res = await this.getEmbeddings([query], orgId);
    return res[0] || this.fallbackVector(query);
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

  /**
   * Generates a unit-normalized float vector fallback when both local and cloud are offline
   */
  static fallbackVector(text: string, dims = 768): number[] {
    const vec = new Array(dims).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (const w of words) {
      const hash = crypto.createHash('md5').update(w).digest();
      const idx = hash.readUInt16BE(0) % dims;
      const sign = (hash[2] & 1) ? 1.0 : -1.0;
      vec[idx] += sign;
    }
    let norm = 0;
    for (let i = 0; i < dims; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm) || 1.0;
    return vec.map((v) => v / norm);
  }
}
