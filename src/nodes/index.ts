import { nodeRegistry } from './NodeRegistry';
import { AgentNode } from './builtins/AgentNode';
import { ApiNode } from './builtins/ApiNode';
import { RagNode } from './builtins/RagNode';
import { CustomCodeNode } from './builtins/CustomCodeNode';
import { PythonCodeNode } from './builtins/PythonCodeNode';

// 1. Register All Built-in Nodes
nodeRegistry.register(new AgentNode());
nodeRegistry.register(new ApiNode());
nodeRegistry.register(new RagNode());
nodeRegistry.register(new CustomCodeNode());
nodeRegistry.register(new PythonCodeNode());
// 2. Export Registry & Types for external use
export * from './types';
export * from './NodeRegistry';
export { nodeRegistry };