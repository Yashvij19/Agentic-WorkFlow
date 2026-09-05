import sys
import os
import json
import hashlib
import math

try:
    from markitdown import MarkItDown
    HAS_MARKITDOWN = True
except ImportError:
    HAS_MARKITDOWN = False

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

def generate_fallback_vector(text, dims=1024):
    """Generates a unit-normalized 1024-dimension float vector from text hash when PyTorch is unavailable."""
    vec = [0.0] * dims
    for word in text.lower().split():
        h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        idx = h % dims
        sign = 1.0 if (h & 1) else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]



def recursive_chunk_text(text , chunk_size=800 , chunk_overlap=100):

    """
        Recursively splits text into chunks of maximum size, trying to split on 
        paragraph boundaries first, then sentences, and finally words.
    """


    separators=["\n\n", "\n", " ", ""]

    def split_recursive(text, chunk_size, chunk_overlap, separators):
        chunks=[]
        if len(text)<=chunk_size:
            return [text]
        
        # Select separator
        separator=separators[0]
        splits=text.split(separator)

        current_chunk=""
        for part in splits:
            # If combining exceeds limit, finalize current chunk
            if len(current_chunk)+len(part)+len(separator) > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # If a single part is larger than chunk_size, split it further with next separator
                if len(part)>chunk_size:
                    if len(separators)>1:
                        # if we have more seprators and the part is going more then the chunk size 
                        # then we have to sepprator the part in more sub chunk with diffrent seprators 
                        sub_chunk=split_recursive(part , chunk_size , chunk_overlap, separators[1:])
                        chunks.extend(sub_chunk)
                    else:
                        chunks.append(part)
                else:
                    current_chunk=part
            else:
                if current_chunk:
                    current_chunk+=separator+part
                else:
                    # we are not appending the part in the chunk array right now becuase the part is smaaller then chunk max size
                    # and we can  add more data in that chunk
                    current_chunk=part
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        # Handle overlap (basic sliding window adjustment)

        final_chunks=[]
        for i , chunk in enumerate(chunks):
            if i==0:
                final_chunks.append(chunk)
                continue
            
            prev_chunk=chunks[i-1]
            # this condition means return prev_chunk[-chunk_overlap:] (means from prev_chunk ke last se chunk_overlap size ke chractor returns) if prev_chiunk size is greator then 
            #chunk_overlap size and if the prev_chu k size is less then chuk_overlap then just return the prev_chunk
            overlap_text=prev_chunk[-chunk_overlap:] if len(prev_chunk)>chunk_overlap else prev_chunk
            final_chunks.append(overlap_text + " " + chunk)

        return final_chunks
    
    return split_recursive(text , chunk_size , chunk_overlap , separators)


def main():
    if(len(sys.argv)<2):
       print(json.dumps({"error": "Missing input file path argument"}), file=sys.stderr)
       sys.exit(1)
    
    file_path=sys.argv[1]

    chunk_size=int(sys.argv[2]) if len(sys.argv)>2 else 800
    chunk_overlap=int(sys.argv[3]) if len(sys.argv)>3 else 100

    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}), file=sys.stderr)
        sys.exit(1)
    
    try:
        normalized_content = ""
        # 1. Parse file structure using MarkItDown if available, else read directly
        if HAS_MARKITDOWN:
            try:
                md_parser = MarkItDown()
                result = md_parser.convert(file_path)
                normalized_content = result.text_content
            except Exception as pe:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    normalized_content = f.read()
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                normalized_content = f.read()

        title = os.path.basename(file_path)

        # 2. Chunk text recursively
        chunk_texts = recursive_chunk_text(normalized_content, chunk_size, chunk_overlap)

        # 3. Generate dense embeddings using local BAAI/bge-m3 model if available, else fallback
        embeddings = []
        if HAS_SENTENCE_TRANSFORMERS:
            try:
                model = SentenceTransformer('BAAI/bge-m3')
                encoded = model.encode(chunk_texts, batch_size=32, show_progress_bar=False)
                embeddings = [e.tolist() for e in encoded]
            except Exception:
                embeddings = [generate_fallback_vector(t) for t in chunk_texts]
        else:
            embeddings = [generate_fallback_vector(t) for t in chunk_texts]

        # 4. Assemble chunks with float vectors
        processed_chunks = []
        for i, text in enumerate(chunk_texts):
            processed_chunks.append({
                'content': text,
                'embedding': embeddings[i],
                'metadata': {
                    'index': str(i),
                    'filename': title
                }
            })
        
        output={
            'title':title,
            'rawContent':normalized_content,
            "normalized_content":normalized_content,
            'chunks':processed_chunks
        }
        print(json.dumps(output))
        sys.exit(0)
    
    except Exception as e:
        print(json.dumps({'error':str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__=="__main__":
    main()


