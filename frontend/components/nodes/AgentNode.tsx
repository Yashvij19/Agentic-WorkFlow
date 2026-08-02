import React from 'react'

import {Handle , Position, NodeProps} from 'reactflow';

export default function AgentNode({data}:NodeProps){
    return(
        <div className='bg-white border-2 border-purpule-500 rounded-lg shadow-md w-64'>

            {/* Target Handle: Where incoming data enters this node */}

            <Handle
            type='target'
            position={Position.Top}
            className="w-3 h-3 bg-purple-500"
            ></Handle>

            {/* Node Header */}
            <div className="bg-purple-100 px-4 py-2 rounded-t-md border-b border-purple-200 flex items-center justify-between">
                <span className="font-bold text-purple-800 text-sm">🤖 AI Agent</span>
            </div>

            {/* Node Body */}
            <div className="p-4 flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">System Prompt</label>
                <textarea 
                className="text-sm p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 nodrag"
                rows={3}
                defaultValue={data.prompt || "Summarize the incoming data..."}
                placeholder="Enter instructions..."
                // className="nodrag" // Prevents the user from dragging the node when they try to highlight text!
                />
            </div>

            {/* Source Handle: Where the result exits this node */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="w-3 h-3 bg-purple-500" 
            />

        </div>
    )
}