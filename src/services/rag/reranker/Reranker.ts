import { spawn } from 'child_process';
import * as path from 'path';
import {
    RetrievalResult,
    RerankOptions,
    IReranker,
    RerankerProvider,
} from '../types';




/**
 * 1. Local Cross-Encoder Reranker Strategy:
 * Spawns the Python worker (rerank_worker.py) running sentence-transformers CrossEncoder.
 */

export class LocalCrossEncoderReranker implements IReranker {
    async rerank(
        query: string,
        candidates: RetrievalResult[],
        options: RerankOptions
    ): Promise<RetrievalResult[]> {
        if (candidates.length === 0) return [];
        const scriptPath = path.resolve(__dirname, 'rerank_worker.py');

        return new Promise((resolve, reject) => {
            // Spawn Python process
            const child = spawn('python', [scriptPath]);
            let stdoutData = '';
            let stderrData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
            })

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
            })

            child.on('close', (code) => {
                if (code !== 0) {
                    console.warn(`⚠️ [Reranker] Local CrossEncoder worker failed with code ${code} (${stderrData.trim()}). Falling back to SimpleLexicalReranker.`);
                    return resolve(new SimpleLexicalReranker().rerank(query, candidates, options));
                }
                try {
                    // Output format from python: [{ index: 0, score: 0.85 }, ...]
                    const scoredIndices: Array<{ index: number; score: number }> = JSON.parse(
                        stdoutData.trim()
                    );
                    const scored = scoredIndices.map((item) => ({
                        ...candidates[item.index],
                        initialRank: item.index + 1,
                        score: item.score,
                    }));
                    return resolve(scored.sort((a, b) => b.score - a.score).slice(0, options.topN));
                } catch (err: any) {
                    console.warn(`⚠️ [Reranker] Failed to parse CrossEncoder output (${err.message}). Falling back to SimpleLexicalReranker.`);
                    return resolve(new SimpleLexicalReranker().rerank(query, candidates, options));
                }
            });
            // Prepare payload and stream into stdin
            const payload = {
                query,
                documents: candidates.map((c) => c.content)
            }
            child.stdin.write(JSON.stringify(payload));
            child.stdin.end();
        });
    }
}


/**
 * 2. Simple Lexical Reranker Strategy:
 * Pure TypeScript fallback calculating exact phrase match & token frequency density.
 * Extremely fast and requires zero external Python dependencies.
 */

export class SimpleLexicalReranker implements IReranker{
    async rerank(query: string, candidates: RetrievalResult[], options: RerankOptions): Promise<RetrievalResult[]> {
        if(candidates.length===0){
            return [];
        }

        const lowerQuery=query.toLowerCase().trim();
        const queryTokens=lowerQuery.replace(/[^\w\s]/g, ' ').split(/\s+/).filter((t) => t.length > 1);
        const scored=candidates.map((candidate , index)=>{
            const text=candidate.content.toLowerCase();
            let lexicalScore=0
             // 1. Exact full query phrase match bonus
             if(text.includes(lowerQuery)){
                lexicalScore+=2.0;
             }

              // 2. Token match frequency density
              for(const token of queryTokens){
                const occurences=text.split(token).length -1;
                if(occurences>0){
                    // Diminishing returns formula
                    lexicalScore+=Math.log(1+occurences)*0.5;
                }
              }
              // 3. Blend original retriever score (30%) with lexical score (70%)
              const combinedScore = candidate.score*0.3 + lexicalScore*0.7;

              return{
                ...candidate,
                initialRank:index+1,
                score:Number(combinedScore.toFixed(6)),
              };

        });
        return scored.sort((a,b)=>b.score-a.score).slice(0, options.topN);
    }
}

/**
 * 3. No-Op Reranker:
 * Pass-through when reranking is disabled ('none').
 */


export class NoOpReranker implements IReranker{
    async rerank(query: string, candidates: RetrievalResult[], options: RerankOptions): Promise<RetrievalResult[]> {
        return candidates.slice(0, options.topN).map((item, index) => ({
      ...item,
      initialRank: index + 1,
    }));
    }
}

/**
 * 4. Factory Pattern:
 * Dynamically instantiates the right reranker strategy.
 */
export class RerankerFactory {
  static get(provider: RerankerProvider): IReranker {
    // In production (Render), auto-switch to pure TypeScript lexical reranker to avoid Python/PyTorch dependencies and protect 512MB RAM
    if (process.env.NODE_ENV === 'production' && provider === 'local_cross_encoder') {
      return new SimpleLexicalReranker();
    }
    switch (provider) {
      case 'local_cross_encoder':
        return new LocalCrossEncoderReranker();
      case 'simple_lexical':
        return new SimpleLexicalReranker();
      case 'none':
      default:
        return new NoOpReranker();
    }
  }
}