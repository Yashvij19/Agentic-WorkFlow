
import sys
import json
from sentence_transformers import CrossEncoder

def main():
    try:
         # 1. Read input JSON from standard input stream
        input_data=sys.stdin.read().strip()
        if not input_data:
            print(json.dumps([]))
            return
        payload=json.loads(input_data)
        query=payload.get("query" , "")
        documents=payload.get("documents" ,[])

        # Validate input structure
        if not query or not isinstance(documents, list) or len(documents)==0:
            print(json.dumps([]))
            return
        # 2. Form (query, document) pairs for the cross-encoder
        # The model evaluates how well each document answers this specific query

        pairs=[[query , str(doc)] for doc in documents]

        # 3. Load model and compute prediction scores
        # 'cross-encoder/ms-marco-MiniLM-L-6-v2' is fast, lightweight (~80MB), and battle-tested for search reranking
        # we can also swap to 'BAAI/bge-reranker-base' if higher accuracy is desired

        model= CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        scores=model.predict(pairs)

        # 4. Map results back with their original array indices

        results=[]
        for index , score in enumerate(scores):
            results.append({
                "index":index,
                "score":float(score)
            })
        
        # 5. Output standard JSON array to stdout
        print(json.dumps(results))
        sys.exit(0)
    except Exception as e:
        # Emit error to stderr so Node.js child_process can capture it
        #file=sys.stderr means "print this error message to the error stream instead of the normal output.
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__=='__main__':
    main()





        




