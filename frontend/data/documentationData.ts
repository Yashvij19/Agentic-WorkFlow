// frontend/data/documentationData.ts

export interface DocSection {
  id: string;
  title: string;
  content: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  callout?: {
    type: 'note' | 'tip' | 'warning' | 'important';
    title: string;
    text: string;
  };
}

export interface DocArticle {
  id: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
  sections: DocSection[];
}

export interface DocCategory {
  id: string;
  title: string;
  iconName: string;
  articles: DocArticle[];
}

export const DOCUMENTATION_CATEGORIES: DocCategory[] = [
  {
    id: 'getting-started',
    title: 'GETTING STARTED',
    iconName: 'Compass',
    articles: [
      {
        id: 'introduction',
        title: 'Introduction & Vision',
        category: 'GETTING STARTED',
        badge: 'v2.4 Enterprise Core',
        description:
          'Welcome to the Next-Generation Agentic Workflow Engine—a distributed, multi-tenant platform for orchestrating autonomous AI agent swarms, hybrid vector RAG pipelines, and self-healing execution graphs.',
        sections: [
          {
            id: 'the-problem',
            title: 'Why an Agentic Workflow Engine?',
            content:
              'Autonomous LLM agents are powerful, but when deployed in production, they face four critical failure points: 1) Hallucinations and malformed outputs that crash downstream APIs; 2) Fragile retry loops that repeat errors indefinitely; 3) Uncontrolled queue memory overflow; and 4) Lack of multi-tenant security and permission boundaries. Our engine transforms probabilistic AI calls into deterministic, self-correcting DAG pipelines.',
            callout: {
              type: 'important',
              title: 'Core Design Philosophy',
              text: 'Treat LLM reasoning as untrusted inputs. Every AI output must pass through deterministic validation guardrails, isolated sandboxes, and checkpointed state machines.'
            }
          },
          {
            id: 'key-pillars',
            title: 'Five Architectural Pillars',
            content:
              '1. Directed Acyclic Graph (DAG) Execution: Topological sort with cycle detection.\n2. Autonomous Self-Correction: Guardrail loops that rewind execution and pass feedback to LLMs.\n3. Hybrid Vector RAG: BGE-M3 dense embeddings, BM25 sparse search, and Cross-Encoder reranking.\n4. Dual-Layer RBAC: Enterprise isolation with scoped workflow whitelist policies.\n5. Resilient BullMQ Queue: Idempotent checkpoint resumption, UnrecoverableError fail-fast, and bounded Dead Letter Queue (DLQ).'
          }
        ]
      },
      {
        id: 'quickstart',
        title: 'Platform Quickstart',
        category: 'GETTING STARTED',
        badge: '5-Minute Guide',
        description: 'How to register an account, configure API credentials, and deploy your first agentic workflow.',
        sections: [
          {
            id: 'account-setup',
            title: '1. Account & Organization Setup',
            content:
              'The platform provides two registration modes:\n• Single Developer: Instant personal workspace with private workflows and isolated credentials.\n• Team Organization: Admin creates the tenant workspace and generates invite tokens for Members.',
            codeSnippet: {
              language: 'bash',
              code: '# 1. Clone repository & install dependencies\nnpm install\ncd frontend && npm install\n\n# 2. Configure environment variables\ncp .env.example .env\n\n# 3. Start local developer services\nnpm run dev      # Fastify API Server (port 4000)\nnpm run worker   # BullMQ Worker Engine (concurrency 10)\ncd frontend && npm run dev # Next.js Canvas (port 3000)'
            }
          },
          {
            id: 'configuring-keys',
            title: '2. Adding AI Credentials',
            content:
              'Navigate to Settings > Credentials to store your Google Gemini API key or custom REST bearer tokens. All credentials are encrypted using AES-256-GCM before being saved to PostgreSQL.'
          }
        ]
      }
    ]
  },
  {
    id: 'core-concepts',
    title: 'CORE ENGINE CONCEPTS',
    iconName: 'Cpu',
    articles: [
      {
        id: 'dag-topology',
        title: 'DAG & Topological Sorting',
        category: 'CORE ENGINE CONCEPTS',
        badge: 'Graph Theory',
        description:
          'Workflows are authored as Directed Acyclic Graphs (DAGs) where nodes represent processing steps and edges define dependency constraints.',
        sections: [
          {
            id: 'kahns-algorithm',
            title: "Kahn's Topological Sort with Cycle Detection",
            content:
              "When an execution is triggered, the backend calculates the in-degree of every node and orders them using Kahn's algorithm. If a cyclic dependency exists, execution is blocked immediately with an actionable graph error.",
            codeSnippet: {
              language: 'typescript',
              code: '// Topologically sort workflow nodes based on edge dependencies\nfunction topologicalSort(nodes: any[], edges: any[]): any[] {\n  const inDegree = new Map<string, number>();\n  const adjList = new Map<string, string[]>();\n  // ...\n  // Validates orderedNodeIds.length === nodes.length\n  // Throws error if cyclic loop is detected!\n}'
            }
          },
          {
            id: 'data-interpolation',
            title: 'Data Sharing via Variable Interpolation',
            content:
              'Downstream nodes dynamically reference upstream results using Mustache syntax: `{{nodeId.output}}` or `{{nodeId.output.nestedField}}`. Before node execution, the interpolation engine substitutes these tokens with live memory context from the database.',
            codeSnippet: {
              language: 'json',
              code: '{\n  "prompt": "Analyze the customer query: {{webhook_trigger.output.query}} using the context: {{rag_search.output.context}}"\n}'
            }
          },
          {
            id: 'checkpoint-resumption',
            title: 'Idempotent Checkpoint Resumption',
            content:
              'Every step writes its result to `ExecutionLog` with composite unique constraint `@@unique([executionId, nodeId])`. If a workflow fails on Node 4, BullMQ re-runs only Node 4 and downstream steps—skipping Nodes 1, 2, and 3 completely!'
          }
        ]
      },
      {
        id: 'execution-options',
        title: 'Flexible Execution Modes',
        category: 'CORE ENGINE CONCEPTS',
        badge: 'Developer Experience',
        description: 'Run entire workflows, isolate individual steps, or run up to specific debug milestones.',
        sections: [
          {
            id: 'run-workflow',
            title: '1. Execute Full Workflow',
            content:
              'Triggers the entire topological graph sequentially. Emits real-time telemetric WebSocket events (`RUNNING`, `COMPLETED`, `FAILED`) to the visual canvas at every step.'
          },
          {
            id: 'run-upto-node',
            title: '2. Run Up To This Node',
            content:
              'Computes the exact ancestor dependency tree for the target node using recursive reverse traversal. Only ancestor prerequisite nodes are executed, allowing safe sub-graph validation.',
            codeSnippet: {
              language: 'typescript',
              code: '// Resolves all upstream dependencies needed to execute targetNodeId\nfunction resolveAncestors(targetNodeId: string, edges: any[]): Set<string> {\n  const ancestors = new Set<string>();\n  function dfs(currId: string) {\n    ancestors.add(currId);\n    const incomingEdges = edges.filter(e => e.target === currId);\n    incomingEdges.forEach(e => dfs(e.source));\n  }\n  dfs(targetNodeId);\n  return ancestors;\n}'
            }
          },
          {
            id: 'run-single-node',
            title: '3. Single Node Test Run',
            content:
              'Executes an isolated node using cached upstream memory from previous runs, enabling 50ms rapid parameter iteration without re-running expensive LLM ancestors.'
          }
        ]
      }
    ]
  },
  {
    id: 'node-catalog',
    title: 'NODE PLUGIN ECOSYSTEM',
    iconName: 'Boxes',
    articles: [
      {
        id: 'agent-node',
        title: 'AgentNode (LLM Reasoner)',
        category: 'NODE PLUGIN ECOSYSTEM',
        badge: 'Core Cognitive',
        description: 'Executes generative AI prompts using Gemini with dynamic variable injection and self-correction awareness.',
        sections: [
          {
            id: 'agent-features',
            title: 'Features & Architecture',
            content:
              '• Variable interpolation for dynamic prompt construction\n• Context-aware self-correction: Automatically appends `ctx.correctionFeedback` if a downstream Guardrail rewound execution\n• Fail-fast credential validation: Throws explicit UnrecoverableError if GEMINI_API_KEY is missing (no silent mock responses)'
          },
          {
            id: 'agent-example',
            title: 'Professional Configuration Example',
            content: 'Configuring an agent to extract invoice data as strict JSON:',
            codeSnippet: {
              language: 'json',
              code: '{\n  "model": "gemini-2.5-flash",\n  "temperature": 0.2,\n  "prompt": "Extract the vendor name, invoice date, and total amount from: {{api_fetch_invoice.output}}\\nOutput as strict JSON matching schema: { vendor: string, date: string, total: number }."\n}'
            }
          }
        ]
      },
      {
        id: 'guardrail-node',
        title: 'GuardrailNode (Self-Correction)',
        category: 'NODE PLUGIN ECOSYSTEM',
        badge: 'Autonomous Self-Healing',
        description: 'Deterministic output validator and LLM-as-a-Judge inspector with autonomous execution rewind capabilities.',
        sections: [
          {
            id: 'guardrail-modes',
            title: 'Five Validation Modes',
            content:
              '1. strict_json: Ensures output is valid JSON (strips LLM markdown blocks automatically)\n2. required_keys: Verifies required schema properties (e.g. `vendor, total, items`)\n3. regex_match: Enforces strict patterns like emails, UUIDs, or phone formats\n4. banned_keywords: Blocks hallucinations or forbidden words (e.g. `sorry, as an ai`)\n5. llm_judge: Employs Gemini as an independent evaluator scoring accuracy based on custom criteria'
          },
          {
            id: 'guardrail-rewind',
            title: 'How Autonomous Rewind Works',
            content:
              'When validation fails:\n1. The Guardrail checks retry count against `maxRetries` (default: 3).\n2. If attempts remain, it finds the upstream target node (e.g. `AgentNode`).\n3. Memory from target node up to the Guardrail is invalidated.\n4. Execution loop rewinds `i = targetIndex - 1; continue;`.\n5. Upstream agent receives actionable feedback: `"Fix error: Missing key \'total\'"` and self-corrects!',
            codeSnippet: {
              language: 'typescript',
              code: '// Execution loop rewind in workflowWorker.ts\nfor (let j = targetIndex; j <= i; j++) {\n  completedNodes.delete(nodesToExecute[j].id);\n}\ni = targetIndex - 1;\ncontinue;'
            }
          }
        ]
      },
      {
        id: 'api-node',
        title: 'ApiNode (REST Client)',
        category: 'NODE PLUGIN ECOSYSTEM',
        badge: 'Enterprise Integration',
        description: 'Full-featured HTTP client supporting all REST verbs, query serialization, Bearer auth, and timeout guardrails.',
        sections: [
          {
            id: 'api-specs',
            title: 'Capabilities',
            content:
              '• All HTTP Verbs: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS\n• URLSearchParams: Automatically serializes key-value query parameters\n• Dual Auth Injection: Bearer token or custom header (e.g. `X-API-Key: value`)\n• Upstream Payload Fallback: If no explicit body is defined, automatically forwards upstream inputs\n• AbortController: 15-second timeout guardrail to prevent worker thread hang'
          },
          {
            id: 'api-example',
            title: 'Configuration Example',
            content: 'Forwarding validated invoice data to an external ERP endpoint:',
            codeSnippet: {
              language: 'json',
              code: '{\n  "method": "POST",\n  "url": "https://api.erp.company.com/v1/invoices",\n  "bearerToken": "{{credentials.ERP_SECRET_TOKEN}}",\n  "queryParams": { "dryRun": "false", "source": "aetherflow" },\n  "headers": { "Content-Type": "application/json" },\n  "body": "{{guardrail_validator.output}}"\n}'
            }
          }
        ]
      },
      {
        id: 'rag-node',
        title: 'RagNode (Knowledge Retrieval)',
        category: 'NODE PLUGIN ECOSYSTEM',
        badge: 'Hybrid Vector RAG',
        description: 'Semantic and lexical search engine with Reciprocal Rank Fusion (RRF) and Cross-Encoder reranking.',
        sections: [
          {
            id: 'rag-architecture',
            title: 'Parent-Child Chunking & Cross-Encoder Pipeline',
            content:
              '• MarkItDown Document Ingestion: Parses PDF, DOCX, XLSX, and HTML into structured markdown\n• Parent-Child Chunking: Retrieves small dense chunks for precision, returns large parent sections for LLM context\n• BAAI/bge-m3 Embeddings: Multilingual dense vectors with 1024 dimensions\n• Reciprocal Rank Fusion: Combines dense vector distance with BM25 keyword matching\n• Cross-Encoder Reranker: Deep attention-based reranking to eliminate irrelevant chunks'
          }
        ]
      },
      {
        id: 'foreach-node',
        title: 'ForEachIteratorNode (Batcher)',
        category: 'NODE PLUGIN ECOSYSTEM',
        badge: 'Parallel Processing',
        description: 'Concurrent array iteration with sub-graph scoping, memory sandboxing, and dual-handle routing.',
        sections: [
          {
            id: 'foreach-architecture',
            title: 'Concurrency Worker Pool',
            content:
              '• Dual-Handle Routing: `loop` port dispatches individual items to sub-nodes; `done` port forwards aggregated array downstream\n• Worker Pool Concurrency: Parallel processing with configurable concurrency limit (1 to 20)\n• Safety Guardrails: 500-item maximum limit to prevent infinite loops'
          }
        ]
      }
    ]
  },
  {
    id: 'security-rbac',
    title: 'SECURITY & PERMISSIONS (RBAC)',
    iconName: 'ShieldCheck',
    articles: [
      {
        id: 'permission-model',
        title: 'Dual-Layer Permission Model',
        category: 'SECURITY & PERMISSIONS (RBAC)',
        badge: 'Multi-Tenant Security',
        description: 'Comprehensive role-based access control protecting organization boundaries and individual workflows.',
        sections: [
          {
            id: 'user-roles',
            title: 'The Three User Roles',
            content:
              '1. SINGLE Developer:\n• Standalone single-tenant account with unrestricted access to personal workflows and DLQ.\n\n2. Organization ADMIN:\n• Full ownership of organization workspace: manages invite tokens, approves member requests, rotates tenant credentials, configures member permissions, and clears Redis DLQ caches.\n\n3. Organization MEMBER:\n• Restricted team member. By default, members only access their own created workflows. Admin can grant global flags or granular scoped whitelist rules.'
          },
          {
            id: 'scoped-whitelist',
            title: 'Scoped Workflow Whitelist Matrix',
            content:
              'Admins can grant granular permissions on specific team workflows without exposing the entire workspace:',
            codeSnippet: {
              language: 'json',
              code: '{\n  "canCreateWorkflow": true,\n  "canViewTeamWorkflows": false,\n  "canEditTeamWorkflows": false,\n  "canRenameTeamWorkflows": false,\n  "canDeleteTeamWorkflows": false,\n  "canExecuteTeamWorkflows": false,\n  "canViewTeamExecutions": false,\n  "canViewTeamFailedExecutions": true,\n  "canViewDLQ": true,\n  "canCreatePersonalKnowledgeBase": true,\n  "canChangeOrgKnowledgeBase": false,\n  "allowedWorkflowIds": [\n    {\n      "workflowId": "5d5bc57d-ed81-47fe-b9c9-febb8cf6fa34",\n      "canView": true,\n      "canEdit": false,\n      "canRename": false,\n      "canDelete": false,\n      "canExecute": true,\n      "canViewExecutionLogs": true\n    }\n  ]\n}'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'resilience-dlq',
    title: 'RESILIENCE & DEAD LETTER QUEUE',
    iconName: 'RefreshCw',
    articles: [
      {
        id: 'dlq-architecture',
        title: 'DLQ & Memory Management',
        category: 'RESILIENCE & DEAD LETTER QUEUE',
        badge: 'Zero-Downtime Reliability',
        description: 'How BullMQ retries, UnrecoverableError fail-fast, and PostgreSQL long-term persistence prevent Redis OOM.',
        sections: [
          {
            id: 'transient-vs-unrecoverable',
            title: 'Transient vs. Permanent (Unrecoverable) Errors',
            content:
              '• Transient Errors (Network timeout, HTTP 503, HTTP 429 Rate Limit): BullMQ retries 3 times with exponential backoff (2s, 4s, 8s). Completed steps are checkpointed and skipped!\n• Permanent Errors (Missing API Key, HTTP 401 Unauthorized, HTTP 404 Not Found, SyntaxError): Worker throws `UnrecoverableError`, aborting in 0ms without wasting retry attempts or queue slots.'
          },
          {
            id: 'redis-retention',
            title: 'Bounded Redis Retention Policy',
            content:
              'Instead of keeping failed jobs in Redis RAM indefinitely, BullMQ is configured with a strict ceiling:',
            codeSnippet: {
              language: 'typescript',
              code: 'defaultJobOptions: {\n  attempts: 3,\n  backoff: { type: "exponential", delay: 2000 },\n  removeOnComplete: true,\n  removeOnFail: {\n    count: 1000,        // Max 1,000 failed jobs cached in Redis RAM\n    age: 3 * 24 * 3600   // Auto-expire from Redis after 3 days\n  }\n}'
            }
          },
          {
            id: 'dlq-ui',
            title: 'Dead Letter Queue UI & One-Click Replay',
            content:
              'The DLQ dashboard (`/dlq`) provides:\n• Exact failed node ID and monospaced stack trace\n• Complete step-by-step execution logs\n• One-click Replay button that re-triggers execution from the point of failure\n• Purge Redis Cache button for organization Admins'
          }
        ]
      }
    ]
  }
];
