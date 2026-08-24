import { it } from 'node:test';
import { RetrievalResult, RAGConfiguration, CitationMode } from '../types';
export interface CitationItem{
    index:number;
    chunkId:string;
    documentId:string;
    documentTitle:string;
    source:string;
    score:number;
    snippet:string;
}

export interface BuiltContext{
    contextText:string;
    citations:CitationItem[];
    tokensUsedEstimate:number;
    totalChunksUsed:number;
}

export class ContextBuilder{

    // Approximate character-to-token ratio (1 token ~ 4 characters in English)
    private readonly CHARS_PER_TOKEN=4;

    /**
   * Transforms raw retrieval results into a formatted, deduplicated,
   * and token-budgeted context string with structured citations.
   */

    buildContext(result:RetrievalResult[] , config:RAGConfiguration):BuiltContext{

        const maxTokens=config.context?.maxTokens || 4000;
        const citationMode:CitationMode=config.context.citationMode || "inline";

        // 1. Deduplicate chunks by chunkId
        const uniqueResults= this.deduplicate(result);

          // 2. Sort results descending by score
          uniqueResults.sort((a,b)=> b.score-a.score);

         // 3. Assemble chunks within the token budget 
         const selectedChunks:RetrievalResult[]=[];
         let currentTokenEstimate=0;

         for(const chunk of uniqueResults){
            const chunkTokenEstimate= this.estimateTokens(chunk.content);
            if( currentTokenEstimate+chunkTokenEstimate > maxTokens && selectedChunks.length>0){
                // Budget reached; stop packing more chunks
                break;
            }
            selectedChunks.push(chunk);
            currentTokenEstimate+=chunkTokenEstimate;
         }

         // 4. Build citations and formatted text

         const citations:CitationItem[]=selectedChunks.map((chunk, idx)=>({
            index:idx+1,
            chunkId:chunk.chunkId,
            documentId:chunk.documentId,
            documentTitle:chunk.title || "Untitled Document",
            source:chunk.source || 'Local Upload',
            score:Number(chunk.score.toFixed(4)),
            snippet:chunk.content.slice(0,150)+(chunk.content.length>150 ? '...':''),
         }));

         const contextText=this.formatContextString(selectedChunks , citations ,citationMode);

         return{
            contextText,
            citations,
            tokensUsedEstimate:this.estimateTokens(contextText),
            totalChunksUsed:selectedChunks.length,
         }

    }

    
  /**
   * Removes duplicate chunks based on their unique chunkId or exact content.
   */

  private deduplicate(results:RetrievalResult[]):RetrievalResult[]{
    const seenIds=new Set<string>();
    const seenContents = new Set<string>();
    const unique:RetrievalResult[]=[];

    for(const item of results){
        const contentHash=item.content.trim();
        if(!seenIds.has(item.chunkId) && !seenContents.has(contentHash)){
            seenIds.add(item.chunkId);
            seenContents.add(contentHash);
            unique.push(item);
        }
    }
    return unique;
  }

   /**
   * Formats the final context string based on the chosen CitationMode.
   */

   private formatContextString(
    chunks:RetrievalResult[],
    citations:CitationItem[],
    mode:CitationMode
   ):string{
    if(chunks.length ===0){
        return 'No relevant context found';
    }
    if( mode==='none'){
         return chunks.map((c) => c.content).join('\n\n---\n\n');
    }

    if(mode==='source_list'){
        const chunkBody=chunks.map((c)=>c.content).join('\n\n---\n\n');
        const sourcesList=citations.map((cit)=> `[${cit.index}] Document: "${cit.documentTitle}" (Score: ${cit.score})`)
        .join('\n');
        return `${chunkBody}\n\n### Document Sources:\n${sourcesList}`;
    }

    // Default: 'inline' citations


    return chunks
      .map((chunk, idx) => {
        const cit = citations[idx];
        const header = `[Source ${cit.index}: "${cit.documentTitle}"]`;
        return `${header}\n${chunk.content}`;
      })
      .join('\n\n---\n\n');
  }


        /**
         * Quick heuristic token counter.
         */
        private estimateTokens(text: string): number {
            return Math.ceil(text.length / this.CHARS_PER_TOKEN);
        }

   }



