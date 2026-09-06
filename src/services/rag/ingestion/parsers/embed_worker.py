import sys
import json
import hashlib
import math

try:
    from sentence_transformers import SentenceTransformer
    HAS_ST = True
except ImportError:
    HAS_ST = False

def clean_text(text: str) -> str:
    """Sanitizes text by stripping lone Unicode surrogates and invalid characters."""
    if not isinstance(text, str):
        text = str(text)
    return text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')

def hash_embed(text, dims=1024):
    """Generates a unit-normalized 1024-dimension float vector from text hash when PyTorch is unavailable."""
    vec = [0.0] * dims
    clean = clean_text(text)
    for word in clean.lower().split():
        h = int(hashlib.md5(word.encode('utf-8', errors='ignore')).hexdigest(), 16)
        idx = h % dims
        sign = 1.0 if (h & 1) else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]

def main():
    try:
        # Read JSON array of strings from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps([]))
            return
        texts = json.loads(input_data)
        if not isinstance(texts, list):
            print(json.dumps({"error": "Input must be a JSON list of strings"}), file=sys.stderr)
            sys.exit(1)
        
        if len(texts) == 0:
            print(json.dumps([]))
            return
        
        # Sanitize all strings to strip lone Unicode surrogates before tokenization or encoding
        texts = [clean_text(t) for t in texts]

        if HAS_ST:
            try:
                # Load local model and encode chunks in batches
                model = SentenceTransformer('BAAI/bge-m3')
                embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)
                print(json.dumps(embeddings.tolist()))
                sys.exit(0)
            except Exception:
                # Fallback to normalized float vectors if model load fails (e.g. low memory)
                embeddings = [hash_embed(t) for t in texts]
                print(json.dumps(embeddings))
                sys.exit(0)
        else:
            embeddings = [hash_embed(t) for t in texts]
            print(json.dumps(embeddings))
            sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()


