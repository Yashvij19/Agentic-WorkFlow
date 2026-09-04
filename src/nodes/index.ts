import { nodeRegistry } from './NodeRegistry';
import { AgentNode } from './builtins/AgentNode';
import { ApiNode } from './builtins/ApiNode';
import { RagNode } from './builtins/RagNode';
import { CustomCodeNode } from './builtins/CustomCodeNode';
import { PythonCodeNode } from './builtins/PythonCodeNode';
import { ForEachIteratorNode } from './builtins/ForEachIteratorNode';
import { GuardrailNode } from './builtins/GuardrailNode';
// 1. Register All Built-in Nodes
nodeRegistry.register(new AgentNode());
nodeRegistry.register(new ApiNode());
nodeRegistry.register(new RagNode());
nodeRegistry.register(new CustomCodeNode());
nodeRegistry.register(new PythonCodeNode());
nodeRegistry.register(new ForEachIteratorNode());
nodeRegistry.register( new GuardrailNode);

// 2. Export Registry & Types for external use
export * from './types';
export * from './NodeRegistry';
export * from './builtins/ForEachIteratorNode'
export * from './builtins/GuardrailNode'; // <-- 3. Export class & types
export { nodeRegistry };