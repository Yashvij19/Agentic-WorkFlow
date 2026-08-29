

export interface HierarchicalParentChunk{
    tempId:string;
    content:string;
    metadata:Record<string, any>;
    children:HierarchicalChildChunk[];
}

export interface HierarchicalChildChunk{
    tempId:string;
    parentTempId:string;
    content:string;
    sequenceIndex:number;
    metadata:Record<string,any>;
}

export interface ChunkingOptions{
    parentChunkSize?:number;// Default: ~3000 chars (~750 tokens)
     parentChunkOverlap?: number; // Default: ~300 chars
     childChunkSize?: number; // Default: ~600 chars (~150 tokens)
      childChunkOverlap?: number; // Default: ~100 chars
}

export class HierarchicalChunker{
    private readonly DEFAULT_PARENT_SIZE = 3000;
    private readonly DEFAULT_PARENT_OVERLAP = 300;
    private readonly DEFAULT_CHILD_SIZE = 600;
    private readonly DEFAULT_CHILD_OVERLAP = 100;


     /**
   * Splits a document into Parent Chunks, and sub-splits each Parent into Child Chunks.
   */
  chunkDocument(
    content:string,
    options?:ChunkingOptions
  ):HierarchicalParentChunk[]{
    const parentSize=options?.parentChunkSize || this.DEFAULT_PARENT_SIZE;
    const parentChunkOverlap=options?.parentChunkOverlap || this.DEFAULT_PARENT_OVERLAP;
    const childSize=options?.childChunkSize || this.DEFAULT_CHILD_SIZE;
    const childOverlap= options?.childChunkOverlap|| this.DEFAULT_CHILD_OVERLAP;

    const normalizedText = content.replace(/\r\n/g, '\n').trim();
    if (!normalizedText) return [];
     // 1. Generate Parent Chunks using paragraph/sentence-aware boundaries

     const rawParentTexts=this.splitTextRecursive(normalizedText , parentSize , parentChunkOverlap);

     let globalSequence=0;
     const parents: HierarchicalParentChunk[] = [];
     rawParentTexts.forEach((parentText , pIndex)=>{
         const parentTempId = `parent_${pIndex}_${Date.now()}`;
         // 2. Sub-split each Parent Chunk into smaller Child Chunks
           const rawChildTexts = this.splitTextRecursive(parentText, childSize, childOverlap);

         const children:HierarchicalChildChunk[]= rawChildTexts.map((childText , cIndex)=>{

            globalSequence++;
            return{
                tempId:`child_${pIndex}_${cIndex}_${Date.now()}`,
                parentTempId,
                content: childText,
                sequenceIndex: globalSequence,
                metadata: {
                    parentTempId,
                    childIndex: cIndex,
                    sequenceIndex: globalSequence,
                    characterCount: childText.length,
                },
            };
         });
         parents.push({
            tempId:parentTempId,
            content:parentText,
            metadata: {
                parentIndex: pIndex,
                totalChildren: children.length,
                characterCount: parentText.length,
            },
            children,
         });     
     });

     return parents;

  }

   /**
   * Recursively splits text respecting markdown headers, paragraphs, and sentence boundaries.
   */

   private splitTextRecursive(text:string , maxChunkSize:number,overlap:number):string[]{

                if(text.length<=maxChunkSize){
                    return [text];
                }
                
                const separators = ['\n\n', '\n', '. ', ' '];
                let selectedSeparator=' ';

                for(const sep of separators){
                    if(text.includes(sep)){
                        selectedSeparator=sep;
                        break;
                    }
                }
                const rawSplits=text.split(selectedSeparator);
                const chunks:string[]=[];
                let currentChunk='';

                for(const piece of rawSplits){
                    const candidate=currentChunk?currentChunk+selectedSeparator+piece:piece;
                    if(candidate.length>maxChunkSize && candidate.length>0){
                        chunks.push(currentChunk.trim());
                        // Compute overlap from the end of the previous chunk
                        if(overlap>0 && currentChunk.length >overlap){
                            const overlapText=currentChunk.slice(-overlap);
                            currentChunk=overlapText+selectedSeparator+piece;
                        }else{
                            currentChunk=piece;
                        }
                    }else{
                        currentChunk=candidate
                    }
                }

                if(currentChunk.trim().length>0){
                    chunks.push(currentChunk.trim());
                }
                return chunks;
             }

}

