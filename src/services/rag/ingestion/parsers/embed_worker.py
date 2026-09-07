import sys
import json

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

        if not HAS_ST:
            print(json.dumps({"error": "sentence-transformers package is required for local embeddings (BAAI/bge-m3). Please install sentence-transformers or configure Gemini API key in Settings."}), file=sys.stderr)
            sys.exit(1)

        # Load local model and encode chunks in batches
        model = SentenceTransformer('BAAI/bge-m3')
        embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)
        print(json.dumps(embeddings.tolist()))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
