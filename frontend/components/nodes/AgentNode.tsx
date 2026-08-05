import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export default function AgentNode({ data }: NodeProps) {
  // Determine the border color and animation based on the current status
  let borderClass = 'border-purple-500'; // Default
  let statusBadge = null;

  if (data.status === 'RUNNING') {
    borderClass = 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse';
    statusBadge = <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded animate-bounce">⚙️ Running...</span>;
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]';
    statusBadge = <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✅ Done</span>;
  } else if (data.status === 'FAILED') {
    borderClass = 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
    statusBadge = <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">☠️ Failed</span>;
  }

  return (
    <div className={`bg-white border-2 rounded-lg w-64 transition-all duration-300 ${borderClass}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />

      <div className="bg-gray-50 px-4 py-2 rounded-t-md border-b border-gray-200 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-sm">🤖 AI Agent</span>
        {statusBadge}
      </div>

      <div className="p-4 flex flex-col gap-2">
        <textarea 
          className="text-sm p-2 border border-gray-300 rounded resize-none focus:outline-none nodrag"
          rows={3}
          defaultValue={data.prompt}
          readOnly
        />
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
  );
}