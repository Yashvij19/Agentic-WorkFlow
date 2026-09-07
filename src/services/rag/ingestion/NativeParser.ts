import * as path from 'path';
import { DocumentParser, IngestionInput, NormalizedDocument, ParsedChunk } from '../types';




export class NativeParser implements DocumentParser {

    canParse(mimeType: string, filename?: string): boolean {
        const cleanMime = (mimeType || '').toLowerCase();
        const ext = filename ? path.extname(filename).toLowerCase() : '';
        return (
            cleanMime.startsWith('text/') ||
            cleanMime === 'application/json' ||
            cleanMime === 'application/javascript' ||
            cleanMime === 'application/pdf' ||
            ext === '.pdf'
        );
    }

    async parse(input: IngestionInput, options: {
        chunkSize: number; chunkOverlap: number;
    }): Promise<NormalizedDocument> {
        let rawContent = '';
        const ext = path.extname(input.name).toLowerCase();
        const isPdf = (input.mimeType || '').toLowerCase() === 'application/pdf' || ext === '.pdf';

        if (isPdf && input.contentBuffer) {
            try {
                const { PDFParse } = await import('pdf-parse');
                const parser = new PDFParse({ data: input.contentBuffer });
                const parsed = await parser.getText();
                rawContent = parsed.text || '';
            } catch (pdfErr: any) {
                console.warn(`⚠️ [NativeParser] pdf-parse failed (${pdfErr.message}). Falling back to string decode.`);
                rawContent = input.contentBuffer.toString('utf-8');
            }
        } else {
            rawContent = input.contentBuffer ? input.contentBuffer.toString('utf-8') : input.source;
        }

        rawContent = rawContent
            .replace(/\0/g, '')
            .replace(/[\uD800-\uDFFF]/g, '');

        // 1. Segment text into recursive chunks in Node.js
        const chunkTexts = this.recursiveChunkText(rawContent, options.chunkSize, options.chunkOverlap);

        // 2. Assemble chunks (embeddings will be generated in batch by IngestionManager with proper orgId authentication)
        const chunks: ParsedChunk[] = chunkTexts.map((text, idx) => ({
            content: text,
            metadata: {
                index: idx.toString(),
                filename: input.name,
            },
        }));

        return {
             title: input.name,
            rawContent,
            normalizedContent: rawContent,
            chunks,
        }
    }
    private recursiveChunkText(text:string , chunkSize:number , chunkOverlap:number):string[]{
        const separators = ['\n\n', '\n', ' ', ''];

        const splitRecursive=(text:string , currentSeps:string[]):string[]=>{
            if(text.length<=chunkSize){
                return [text];
            }

            const separator=currentSeps[0];
            const splits=text.split(separator);
            const chunks:string[]=[];
            let currentChunk = '';

            for(const part of splits){
                if(currentChunk.length+part.length+separator.length>chunkSize){
                    if(currentChunk){
                        // chunk may get lower then chunk max size 
                        chunks.push(currentChunk.trim());
                    }
                    if(part.length>chunkSize){
                        if(currentSeps.length>1){
                            const subChunk=splitRecursive(part , currentSeps.slice(1));
                            chunks.push(...subChunk);
                        }else{
                            // even here we have to create an chunk that is bigger then chunk max size 
                            // to make data integrity e.g lile image url that is bigger the chunksize then we cant split them 
                            chunks.push(part);
                        }
                    }
                    else{
                        currentChunk=part
                    }
                }else{
                    currentChunk=currentChunk?currentChunk+separator+part:part;
                }


                }
                if(currentChunk){
                    //after the loop if we rest the text wr add them into the chunk
                    chunks.push(currentChunk.trim());
                }

                // Add overlapping context from previous chunks
                 const finalChunks: string[] = [];
                    for (let i = 0; i < chunks.length; i++) {
                        if (i === 0) {
                        finalChunks.push(chunks[i]);
                        continue;
                        }
                        const prevChunk = chunks[i - 1];
                        const overlapText = prevChunk.length > chunkOverlap 
                        ? prevChunk.slice(-chunkOverlap) 
                        : prevChunk;
                        finalChunks.push(overlapText + ' ' + chunks[i]);
                    }
                    return finalChunks;
            };
            return splitRecursive(text, separators);
        }
    }