import { INodeExecutor } from './types';

/**
 * NodeRegistry
 * A central dictionary (Strategy Registry) that manages all registered node executors.
 * Enables zero-touch worker pipelines: adding a new node requires zero edits to workflowWorker.ts.
 */
export class NodeRegistry {
  private executors = new Map<string, INodeExecutor>();

  /**
   * Registers a new node executor into the engine.
   * @param executor An instance of a class implementing INodeExecutor
   */
  public register(executor: INodeExecutor): void {
    if (this.executors.has(executor.type)) {
      console.warn(`⚠️ [NodeRegistry] Overwriting existing executor for node type: '${executor.type}'`);
    }
    this.executors.set(executor.type, executor);
    console.log(`🔌 [NodeRegistry] Registered node executor: [${executor.type}] - ${executor.name}`);
  }

  /**
   * Retrieves an executor by node type.
   * @param type The node type string (e.g. 'agent', 'api', 'custom_code')
   */
  public get(type: string): INodeExecutor | undefined {
    return this.executors.get(type);
  }

  /**
   * Checks if a given node type is registered.
   */
  public has(type: string): boolean {
    return this.executors.has(type);
  }

  /**
   * Returns a list of all registered node types in the system.
   */
  public getAllTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}

// Global Singleton instance for the worker runtime
export const nodeRegistry = new NodeRegistry();
