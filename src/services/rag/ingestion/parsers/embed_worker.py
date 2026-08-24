from torch import embedding
from torch.hub import list
import sys
import json
from sentence_transformers import SentenceTransformer

def main():
    try:
        # Read JSON array of strings from stdin
        input_data=sys.stdin.read().strip()
        if not input_data:
            print(json.dumps([]))
            return
        texts=json.loads(input_data)
        if not isinstance(texts , list):
            print(json.dumps({"error": "Input must be a JSON list of strings"}), file=sys.stderr)
            sys.exit(1)
        
        if len(texts)==0:
            print(json.dumps([]))
            return
        
        # Load local model and encode chunks in batches
        model=SentenceTransformer('BAAI/bge-m3')
        embeddings=model.encode(texts , batch_size=32 , show_progress_bar=False)

        # Output standard JSON list of float arrays
        print(json.dumps(embeddings.tolist()))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__=="__main__":
    main()


