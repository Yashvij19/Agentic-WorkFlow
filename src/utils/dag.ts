import fastify from "fastify";

export function validateDag(nodes:any[] , edges:any[] ):{isValid:boolean , error?:string}{
    // 1. Build the Adjacency List (Map out who connects to whom)

    const adjacencyList=new Map<string , string[]>();
    nodes.forEach(n=>adjacencyList.set(n.id , []));

    edges.forEach(e=>{
        if(adjacencyList.has(e.source)){
            adjacencyList.get(e.source)!.push(e.target);  // this ! is null operator for type safety that why we use here
        }
    });

    // 2. Setup Trackers for our Depth-First Search

    const visited=new Set<string>();
    const recursionStack=new Set<string>();

    // 3. The Recursive Cycle Checker

    function detectCycle(nodeId:string):boolean{
        if(recursionStack.has(nodeId)) return true; // We hit a node we are currently investigating = LOOP!
        if(visited.has(nodeId)) return false; // We already safely cleared this node previously.

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const neighbors=adjacencyList.get(nodeId)|| [];
        for(const neighbor of neighbors){
            if(detectCycle(neighbor)) return true;
        }

        recursionStack.delete(nodeId);
        return false;
    }

    for (const node of nodes){
        if(detectCycle(node.id)){
            return { isValid: false, error: 'Invalid : Cycle detected. Workflows cannot contain infinite loops.' };
        }
    }

    return { isValid: true };
}
