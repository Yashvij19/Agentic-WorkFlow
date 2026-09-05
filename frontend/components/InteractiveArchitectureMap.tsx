// frontend/components/InteractiveArchitectureMap.tsx
'use client';

import React, { useState } from 'react';
import {
  Globe,
  GitFork,
  BookOpen,
  Settings,
  Activity,
  ShieldCheck,
  Zap,
  Fingerprint,
  Radio,
  Users,
  Cpu,
  Lock,
  Search,
  FileCode,
  Terminal,
  Code2,
  Send,
  Database,
  Server,
  FileText,
  Network,
  Binary,
  Maximize2,
  Share2,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';

export interface ArchitectureNode {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ElementType;
  layerIndex: number;
  layerName: string;
  techStack: string;
  protocol: string;
  description: string;
  specifications: string[];
  connectionsTo?: string[];
  connectionType?: 'solid' | 'dashed' | 'purple';
  categoryColor?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'blue' | 'rose';
}

const ARCHITECTURE_NODES: Record<string, ArchitectureNode> = {
  // Layer 1: Client Layer
  'client-landing': {
    id: 'client-landing',
    name: 'Landing Page',
    subtitle: '(Spatial Canvas)',
    icon: Globe,
    layerIndex: 1,
    layerName: 'CLIENT & PRESENTATION LAYER',
    techStack: 'Next.js 15 App Router • Tailwind CSS • HTML5 Canvas',
    protocol: 'HTTPS / WSS',
    description: 'High-performance scroll-driven Z-axis visual spatial canvas introducing the AetherFlow ecosystem.',
    specifications: [
      'Scroll-driven canvas frame interpolation (60 FPS)',
      'Spatial glassmorphism with dynamic backdrop filters',
      'Instant routing to visual DAG workspace & auth flows'
    ],
    categoryColor: 'purple'
  },
  'client-workflow': {
    id: 'client-workflow',
    name: 'Visual Workflow Canvas',
    subtitle: '(ReactFlow)',
    icon: GitFork,
    layerIndex: 1,
    layerName: 'CLIENT & PRESENTATION LAYER',
    techStack: 'ReactFlow (@xyflow/react) • TypeScript • React 19',
    protocol: 'REST / WebSocket',
    description: 'Interactive node-based canvas for authoring, configuring, and triggering multi-agent DAG pipelines.',
    specifications: [
      'Dynamic bezier edge connections & custom port handles',
      'Real-time animated node status indicators (RUNNING, COMPLETED, FAILED)',
      'Sub-graph selection & single-node execution controls',
      'Variable auto-complete & node output interpolation ({{nodeId.output}})'
    ],
    categoryColor: 'purple'
  },
  'client-kb': {
    id: 'client-kb',
    name: 'Knowledge Base Hub',
    subtitle: '(Upload & Ingest)',
    icon: BookOpen,
    layerIndex: 1,
    layerName: 'CLIENT & PRESENTATION LAYER',
    techStack: 'Next.js Client • Multipart Uploads • Lucide',
    protocol: 'REST (Multipart Form)',
    description: 'Centralized document repository with organization-wide and personal scoped knowledge bases.',
    specifications: [
      'Multi-format binary drag-and-drop upload (PDF, DOCX, XLSX, TXT, MD)',
      'Ingestion status monitoring & chunk visualization',
      'Scope switcher (Organization vs. Personal)'
    ],
    categoryColor: 'purple'
  },
  'client-settings': {
    id: 'client-settings',
    name: 'Tenant & Admin Settings',
    subtitle: '(RBAC & Keys)',
    icon: Settings,
    layerIndex: 1,
    layerName: 'CLIENT & PRESENTATION LAYER',
    techStack: 'React 19 • Context API • SweetAlert2',
    protocol: 'REST / JWT Authenticated',
    description: 'Enterprise administration control deck for team membership, invite tokens, and encrypted API credentials.',
    specifications: [
      'Invite token generation with expiration controls',
      'Registration join requests approval/rejection queue',
      'Encrypted API Key management (Gemini, OpenAI, Custom Webhooks)'
    ],
    categoryColor: 'purple'
  },
  'client-telemetry': {
    id: 'client-telemetry',
    name: 'Live Telemetry Consumer',
    subtitle: '(WebSocket)',
    icon: Activity,
    layerIndex: 1,
    layerName: 'CLIENT & PRESENTATION LAYER',
    techStack: 'Native WebSocket Client • Event Relay Engine',
    protocol: 'WSS (WebSocket Secure)',
    description: 'Zero-latency telemetry listener rendering real-time execution logs, node progress pulses, and token stats.',
    specifications: [
      'Heartbeat keepalive with auto-reconnection',
      'Tenant-isolated event stream filtering by Organization ID',
      'Real-time execution drawer showing live node duration & stdout'
    ],
    categoryColor: 'purple'
  },
  'client-dlq': {
    id: 'client-dlq',
    name: 'Dead Letter Queue',
    subtitle: '(Forensics & Replay)',
    icon: RefreshCw,
    layerIndex: 1,
    layerName: 'CLIENT & PRESENTATION LAYER',
    techStack: 'Next.js 15 • Server-Side Pagination • RBAC Guard',
    protocol: 'REST / WebSocket',
    description: 'Centralized forensic console for diagnosing failed workflow executions, inspecting error payloads, and triggering sub-graph replays.',
    specifications: [
      'Server-side paginated list with real-time search & filter pills',
      'One-click execution replay starting from failed checkpoint',
      'Step-by-step node execution log drawer with JSON output inspector',
      'Dual-layer RBAC protection (Single, Admin, Member clearance)'
    ],
    categoryColor: 'purple'
  },

  // Layer 2: API Gateway & Security Layer
  'gw-jwt': {
    id: 'gw-jwt',
    name: 'JWT Authenticator',
    subtitle: '& Multi-Tenant Context',
    icon: ShieldCheck,
    layerIndex: 2,
    layerName: 'API GATEWAY & SECURITY LAYER',
    techStack: 'Fastify v5 • @fastify/jwt • Decorator Hook',
    protocol: 'HTTP Bearer Token',
    description: 'Cryptographic token validation extracting tenant organizationId, userId, and role hierarchy on every request.',
    specifications: [
      'Stateless asymmetric JWT verification',
      'Pre-validation request hooks for protected routes',
      'Role resolution (ADMIN, MEMBER, SINGLE) with granular permission injection'
    ],
    connectionsTo: ['gw-ratelimit'],
    connectionType: 'solid',
    categoryColor: 'cyan'
  },
  'gw-ratelimit': {
    id: 'gw-ratelimit',
    name: 'Redis Rate Limiting',
    subtitle: 'Shield',
    icon: Zap,
    layerIndex: 2,
    layerName: 'API GATEWAY & SECURITY LAYER',
    techStack: '@fastify/rate-limit • Redis Sliding Window',
    protocol: 'In-Memory Redis Commands',
    description: 'DDoS and brute-force mitigation engine using tenant-isolated sliding-window token bucket algorithms.',
    specifications: [
      'Keyed by Organization ID for authenticated users, IP for guests',
      'Custom rate limits for heavy RAG ingestion vs lightweight telemetry',
      'HTTP 429 Too Many Requests response with retry-after headers'
    ],
    connectionsTo: ['gw-idempotency'],
    connectionType: 'solid',
    categoryColor: 'cyan'
  },
  'gw-idempotency': {
    id: 'gw-idempotency',
    name: 'Idempotency Engine',
    subtitle: '(SHA-256 Redis Cache)',
    icon: Fingerprint,
    layerIndex: 2,
    layerName: 'API GATEWAY & SECURITY LAYER',
    techStack: 'Fastify Plugin • SHA-256 • Redis Cache',
    protocol: 'Idempotency-Key Header',
    description: 'Prevents accidental duplicate executions or double-billing of LLM tokens by caching execution hashes.',
    specifications: [
      'SHA-256 payload & parameter hashing',
      '24-hour response caching with atomic SETNX locking',
      'Instant return of cached response on duplicate workflow triggers'
    ],
    connectionsTo: ['gw-ws'],
    connectionType: 'solid',
    categoryColor: 'cyan'
  },
  'gw-ws': {
    id: 'gw-ws',
    name: 'WebSocket Telemetry',
    subtitle: 'Streamer (@fastify/websocket)',
    icon: Radio,
    layerIndex: 2,
    layerName: 'API GATEWAY & SECURITY LAYER',
    techStack: '@fastify/websocket • Node ws • Redis Pub/Sub',
    protocol: 'WSS Duplex Stream',
    description: 'High-throughput bidirectional socket server piping worker events from Redis directly to browser clients.',
    specifications: [
      'Subscribes to Redis "telemetry" channel',
      'Filters broadcast messages by tenant organizationId and userId',
      'Sub-5ms broadcast propagation latency'
    ],
    categoryColor: 'cyan'
  },

  // Layer 3: Core Backend Services Layer
  'svc-auth': {
    id: 'svc-auth',
    name: 'Auth & RBAC Service',
    subtitle: '(Admin/Member/Single)',
    icon: Users,
    layerIndex: 3,
    layerName: 'CORE BACKEND SERVICES LAYER',
    techStack: 'TypeScript • Prisma Client • bcrypt.js',
    protocol: 'Internal Service Call',
    description: 'Manages user identities, cryptographic password hashes, invite tokens, and fine-grained JSON permissions.',
    specifications: [
      'Granular permissions: canCreateWorkflows, canCreatePersonalKB, canManageCredentials',
      'Registration requests approval/rejection lifecycle',
      'Multi-tenant database query scoping'
    ],
    categoryColor: 'blue'
  },
  'svc-workflow': {
    id: 'svc-workflow',
    name: 'Workflow Orchestrator',
    subtitle: '& DAG Compiler',
    icon: Cpu,
    layerIndex: 3,
    layerName: 'CORE BACKEND SERVICES LAYER',
    techStack: 'TypeScript • Kahn\'s Algorithm • Prisma',
    protocol: 'Internal Service Call',
    description: 'Validates workflow graphs, performs topological sorting, detects execution cycles, and dispatches BullMQ jobs.',
    specifications: [
      'Topological sorting for deterministic step sequencing',
      'Cycle detection prevents infinite loops before execution starts',
      'Sub-graph dependency tree resolution for single-node executions',
      'Execution log hydration for idempotent state recovery'
    ],
    categoryColor: 'blue'
  },
  'svc-credential': {
    id: 'svc-credential',
    name: 'Credential Vault',
    subtitle: '(AES-256 Encrypted)',
    icon: Lock,
    layerIndex: 3,
    layerName: 'CORE BACKEND SERVICES LAYER',
    techStack: 'Node.js Crypto • AES-256-GCM • Prisma',
    protocol: 'Encrypted at Rest',
    description: 'Enterprise secrets manager encrypting sensitive API keys with authenticated initialization vectors.',
    specifications: [
      'AES-256-GCM cipher with random 16-byte IV and 16-byte Auth Tag',
      'Zero-knowledge storage: Plaintext keys never touch logs or frontend',
      'Ephemeral in-memory decryption strictly during node execution lifetime'
    ],
    categoryColor: 'blue'
  },
  'svc-rag': {
    id: 'svc-rag',
    name: 'RAG Engine',
    subtitle: '(Hybrid Search + RRF + Reranker)',
    icon: Search,
    layerIndex: 3,
    layerName: 'CORE BACKEND SERVICES LAYER',
    techStack: 'TypeScript • Cosine Math • Gemini SDK',
    protocol: 'Internal RAG Pipeline',
    description: 'Master coordinator orchestrating multi-stage document retrieval, fusion ranking, reranking, and generation.',
    specifications: [
      'Coordinates VectorStore, RerankerFactory, and ContextExpander',
      'Reciprocal Rank Fusion (RRF) combining dense and sparse hits',
      'RagTrace telemetry recording latency, token count, and cost breakdown'
    ],
    categoryColor: 'blue'
  },
  'svc-ingestion': {
    id: 'svc-ingestion',
    name: 'Ingestion Manager',
    subtitle: '(MarkItDown & OKF)',
    icon: FileCode,
    layerIndex: 3,
    layerName: 'CORE BACKEND SERVICES LAYER',
    techStack: 'TypeScript • Python Subprocess • YAML',
    protocol: 'File Processing Stream',
    description: 'Parses raw enterprise files, extracts OKF frontmatter, builds hierarchical parent-child chunks, and triggers batch embeddings.',
    specifications: [
      'Intelligent parser router (Native vs Microsoft MarkItDown)',
      'OKF YAML frontmatter & entity-relationship extractor',
      'Hierarchical chunking (parent context + child search vectors)'
    ],
    categoryColor: 'blue'
  },

  // Layer 4: Async Worker & Queue Engine Layer
  'worker-bullmq': {
    id: 'worker-bullmq',
    name: 'BullMQ Workflow',
    subtitle: 'Job Queue',
    icon: Zap,
    layerIndex: 4,
    layerName: 'ASYNC WORKER & QUEUE ENGINE LAYER',
    techStack: 'BullMQ v5 • Redis Stream Engine',
    protocol: 'Redis Protocol (RESP)',
    description: 'Scalable job queue decoupling API request lifecycles from heavy, long-running agent workflows.',
    specifications: [
      'Named job queue: "WORKFLOW_EXECUTION_QUEUE"',
      'Atomic job dispatching with execution ID, org ID, and target node payload',
      'Job state lifecycle tracking (Waiting, Active, Completed, Failed)'
    ],
    connectionsTo: ['worker-fleet'],
    connectionType: 'solid',
    categoryColor: 'amber'
  },
  'worker-fleet': {
    id: 'worker-fleet',
    name: 'Distributed Workflow',
    subtitle: 'Workers (Concurrency: 10)',
    icon: Users,
    layerIndex: 4,
    layerName: 'ASYNC WORKER & QUEUE ENGINE LAYER',
    techStack: 'Node.js Worker Threads • NodeRegistry',
    protocol: 'Async Execution Loop',
    description: 'Parallel execution workers pulling jobs, hydrating context, invoking node plugins, and recording logs.',
    specifications: [
      'High-throughput concurrency (10 concurrent jobs per worker instance)',
      'Sub-graph replay & resume-from-failure execution',
      'Universal node execution via Strategy Design Pattern'
    ],
    connectionsTo: ['worker-redis-pubsub'],
    connectionType: 'solid',
    categoryColor: 'amber'
  },
  'worker-redis-pubsub': {
    id: 'worker-redis-pubsub',
    name: 'Redis Pub/Sub',
    subtitle: 'Telemetry Broker',
    icon: Radio,
    layerIndex: 4,
    layerName: 'ASYNC WORKER & QUEUE ENGINE LAYER',
    techStack: 'ioredis Publisher • Redis Channels',
    protocol: 'Redis Pub/Sub (Channel: "telemetry")',
    description: 'Lightweight message broker broadcasting live node status events across distributed worker clusters.',
    specifications: [
      'Instant node state broadcast (RUNNING, COMPLETED, FAILED)',
      'Includes execution ID, node ID, status, message, and timestamp',
      'Zero-disk-overhead in-memory message distribution'
    ],
    connectionsTo: ['worker-dlq'],
    connectionType: 'dashed',
    categoryColor: 'amber'
  },
  'worker-dlq': {
    id: 'worker-dlq',
    name: 'Dead Letter Queue',
    subtitle: '(DLQ) & Resilience Engine',
    icon: RefreshCw,
    layerIndex: 4,
    layerName: 'ASYNC WORKER & QUEUE ENGINE LAYER',
    techStack: 'BullMQ DLQ • UnrecoverableError • Redis Bounded Cache',
    protocol: 'Retry, Fail-Fast & Eviction Protocol',
    description: 'Resilient fault isolation system distinguishing transient network retries from unrecoverable client errors, backed by bounded Redis memory.',
    specifications: [
      'Transient retries: 3 attempts with exponential backoff (2s, 4s, 8s)',
      'Fail-fast abort: Bypasses retries on missing credentials, 401/404, or syntax errors via UnrecoverableError',
      'Bounded Redis memory: auto-prunes failed jobs (max 1,000 / 7 days TTL) to eliminate Redis OOM crashes',
      'On-demand Admin purge API: clears failed cache entries without losing PostgreSQL history'
    ],
    categoryColor: 'amber'
  },

  // Layer 5: Node Plugin Ecosystem Layer
  'node-rag': {
    id: 'node-rag',
    name: 'RagNode',
    subtitle: '(Knowledge Retrieval)',
    icon: Search,
    layerIndex: 5,
    layerName: 'NODE PLUGIN ECOSYSTEM LAYER',
    techStack: 'INodeExecutor • RAGEngine Interface',
    protocol: 'Plugin Interface (Strategy Pattern)',
    description: 'Executes semantic searches, hybrid RRF fusion, Cross-Encoder reranking, and citation-backed answer generation.',
    specifications: [
      'Variable interpolation on incoming queries ({{nodeId.output}})',
      'Configurable topK, vector weights, minScores, and citation modes',
      'Emits live telemetry updates before and after retrieval'
    ],
    categoryColor: 'purple'
  },
  'node-agent': {
    id: 'node-agent',
    name: 'AgentNode',
    subtitle: '(LLM Reasoner - Gemini/OpenAI)',
    icon: Cpu,
    layerIndex: 5,
    layerName: 'NODE PLUGIN ECOSYSTEM LAYER',
    techStack: '@google/genai • OpenAI SDK • Mustache Syntax',
    protocol: 'LLM API Invocation',
    description: 'Autonomous cognitive reasoning node synthesizing answers, structuring data, and chaining prompts.',
    specifications: [
      'Supports Gemini 2.5 Flash / Pro and OpenAI models',
      'Dynamic prompt hydration with upstream node context',
      'Configurable temperature, system prompts, and JSON schema outputs'
    ],
    categoryColor: 'purple'
  },
  'node-python': {
    id: 'node-python',
    name: 'PythonCodeNode',
    subtitle: '(Isolated Subprocess)',
    icon: Terminal,
    layerIndex: 5,
    layerName: 'NODE PLUGIN ECOSYSTEM LAYER',
    techStack: 'Python 3 Subprocess • Child Process Bridge',
    protocol: 'JSON over Stdin/Stdout',
    description: 'Executes arbitrary Python data science, matrix math, or scraping scripts in an isolated process sandbox.',
    specifications: [
      'Safe JSON serialization of input parameters over stdin',
      '15-second execution timeout guardrail preventing hung processes',
      'Captures stdout, stderr, and return codes cleanly'
    ],
    categoryColor: 'purple'
  },
  'node-custom': {
    id: 'node-custom',
    name: 'CustomCodeNode',
    subtitle: '(Safe Sandbox VM)',
    icon: Code2,
    layerIndex: 5,
    layerName: 'NODE PLUGIN ECOSYSTEM LAYER',
    techStack: 'Node.js Isolated VM • ES2022 Sandbox',
    protocol: 'JS Execution Sandbox',
    description: 'Runs custom JavaScript / TypeScript logic, data transformations, and regex filters in an isolated context.',
    specifications: [
      'Sandboxed global scope with no access to process or fs',
      'Direct read/write access to upstream node inputs',
      'Instant in-memory execution (< 2ms latency)'
    ],
    categoryColor: 'purple'
  },
  'node-api': {
    id: 'node-api',
    name: 'ApiNode',
    subtitle: '(HTTP/REST Dispatcher)',
    icon: Send,
    layerIndex: 5,
    layerName: 'NODE PLUGIN ECOSYSTEM LAYER',
    techStack: 'Fetch API • REST Dispatcher',
    protocol: 'HTTP / HTTPS (REST & Webhooks)',
    description: 'Dispatches external HTTP requests (GET, POST, PUT, DELETE) to integrate third-party APIs and trigger webhooks.',
    specifications: [
      'Configurable HTTP methods, custom headers, and query parameters',
      'Secure credential interpolation from Organization Credential Vault',
      'Automatic JSON parsing of external API responses'
    ],
    categoryColor: 'purple'
  },
  'node-foreach': {
    id: 'node-foreach',
    name: 'ForEachIteratorNode',
    subtitle: '(Dynamic Array Batcher)',
    icon: RefreshCw,
    layerIndex: 5,
    layerName: 'NODE PLUGIN ECOSYSTEM LAYER',
    techStack: 'Async Worker Pool • Sub-Graph Scoping',
    protocol: 'Dual-Handle Fan-Out / Fan-In',
    description: 'Iterates over arrays with controlled concurrency (1-20), scoped memory sandboxing, and real-time progress telemetry.',
    specifications: [
      'Dual-handle routing: Loop (item branch) and Done (aggregated results)',
      'Zero-dependency pure TypeScript worker pool concurrency algorithm',
      'Defensive safety limits (500-item cap) & configurable error tolerance'
    ],
    categoryColor: 'purple'
  },
  'node-guardrail': {
    id: 'node-guardrail',
    name: 'GuardrailNode',
    subtitle: '(Autonomous Self-Correction)',
    icon: ShieldCheck,
    layerIndex: 5,
    layerName: 'NODE PLUGIN ECOSYSTEM LAYER',
    techStack: 'INodeExecutor • LLM-as-a-Judge • Rewind Engine',
    protocol: 'DAG Rewind & Memory Invalidation',
    description: 'Autonomous self-healing validator inspecting upstream agent outputs, catching hallucinations, and rewinding DAG execution with corrective prompts.',
    specifications: [
      '5 validation modes: strict_json, required_keys, regex_match, banned_keywords, llm_judge',
      'Autonomous rewind loop: resets DAG index (i = targetIndex - 1) and invalidates intermediate state',
      'Passes structured correctionFeedback into upstream AgentNode prompt on rerun',
      'Max retry circuit breaker preventing infinite loops and routing to DLQ'
    ],
    categoryColor: 'purple'
  },

  // Layer 6: Advanced RAG Subsystem Layer
  'rag-markitdown': {
    id: 'rag-markitdown',
    name: 'MarkItDown Ingestion',
    subtitle: 'Worker (PDF/Office/ZIP)',
    icon: FileText,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'Microsoft MarkItDown • Python CLI Bridge',
    protocol: 'Subprocess Conversion Stream',
    description: 'Converts unstructured enterprise files (PDF, Word, Excel, PowerPoint, HTML, ZIP) into clean Markdown.',
    specifications: [
      'Preserves headers, tables, bold styling, and bullet points',
      'Graceful fallback to native text parser for plain TXT / JSON / CSV',
      'Safe temp file handling with automatic unlink cleanup'
    ],
    connectionsTo: ['rag-okf'],
    connectionType: 'solid',
    categoryColor: 'emerald'
  },
  'rag-okf': {
    id: 'rag-okf',
    name: 'OKF Parser',
    subtitle: '(YAML Frontmatter & Graph Relations)',
    icon: Network,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'yaml.js • RegEx Frontmatter Stripper',
    protocol: 'Semantic Extraction',
    description: 'Parses Open Knowledge Format frontmatter, extracting entity types, names, and directed relationship graphs.',
    specifications: [
      'Extracts entityType, entityName, title, and relations: [target, relationType]',
      'Strips frontmatter headers so LLM prompts receive clean text content',
      'Indexes graph relations directly into ChunkMetadata database records'
    ],
    connectionsTo: ['rag-embed'],
    connectionType: 'solid',
    categoryColor: 'emerald'
  },
  'rag-embed': {
    id: 'rag-embed',
    name: 'BAAI/bge-m3 Batch',
    subtitle: 'Embedding Subprocess',
    icon: Binary,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'Python • HuggingFace Transformers • BAAI/bge-m3',
    protocol: 'Batch Vectorization',
    description: 'Generates 1024-dimensional dense semantic vector embeddings for chunked document segments.',
    specifications: [
      'State-of-the-art multi-lingual embedding model (BAAI/bge-m3)',
      'Batch generation outside of DB transactions for maximum throughput',
      'Outputs serialized float arrays indexed into PostgreSQL'
    ],
    connectionsTo: ['rag-vector-store'],
    connectionType: 'solid',
    categoryColor: 'emerald'
  },
  'rag-vector-store': {
    id: 'rag-vector-store',
    name: 'Vector Search &',
    subtitle: 'Exact Keyword Engine',
    icon: Database,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'PostgreSQL • Prisma • Cosine Math',
    protocol: 'Dual-Engine Query',
    description: 'Runs parallel searches across dense semantic embeddings (cosine similarity) and sparse keyword matches.',
    specifications: [
      'Fast in-memory cosine distance computation across candidate chunks',
      'Case-insensitive exact keyword & token filtering',
      'Strict multi-tenant organizationId and knowledgeSourceId scoping'
    ],
    connectionsTo: ['rag-rrf'],
    connectionType: 'solid',
    categoryColor: 'emerald'
  },
  'rag-rrf': {
    id: 'rag-rrf',
    name: 'Reciprocal Rank',
    subtitle: 'Fusion (RRF Algorithm)',
    icon: Share2,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'TypeScript • RRF Mathematical Scoring',
    protocol: 'Hybrid Rank Merger',
    description: 'Combines independent vector and keyword ranking lists into a unified, mathematically balanced score.',
    specifications: [
      'Standard smoothing constant K = 60',
      'Configurable weights (default: Vector 0.7, Keyword 0.3)',
      'Flags dual-hit candidates with retrievalMethod = "hybrid"'
    ],
    connectionsTo: ['rag-reranker'],
    connectionType: 'solid',
    categoryColor: 'emerald'
  },
  'rag-reranker': {
    id: 'rag-reranker',
    name: 'Cross-Encoder',
    subtitle: 'AI Reranker (Score Filtering)',
    icon: Sparkles,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'Python Cross-Encoder / Gemini Cross Reranker',
    protocol: 'Deep Semantic Scoring',
    description: 'Evaluates query-document pairs simultaneously with a deep cross-encoder to eliminate false positive vector matches.',
    specifications: [
      'Selects top-N most relevant candidates (default: top 5)',
      'Filters candidates against configurable minScore threshold',
      'Graceful fallback to RRF fused candidates on worker timeout'
    ],
    connectionsTo: ['rag-expander'],
    connectionType: 'solid',
    categoryColor: 'emerald'
  },
  'rag-expander': {
    id: 'rag-expander',
    name: 'Context Expander',
    subtitle: '(Parent-Child & Neighbor Window)',
    icon: Maximize2,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'TypeScript • PostgreSQL Chunk Hierarchy',
    protocol: 'Context Stitching',
    description: 'Fetches parent sections and neighboring chunk windows to reconstruct full coherent context around matched chunks.',
    specifications: [
      'Parent-Child hierarchy retrieval: search fine chunks, return full parent section',
      'Neighbor window stitching: merges adjacent chunks by sequenceIndex',
      'Deduplicates overlapping chunk content before passing to prompt builder'
    ],
    connectionsTo: ['rag-graph'],
    connectionType: 'solid',
    categoryColor: 'emerald'
  },
  'rag-graph': {
    id: 'rag-graph',
    name: 'Knowledge Graph',
    subtitle: 'Multi-Hop Traversal',
    icon: Network,
    layerIndex: 6,
    layerName: 'ADVANCED RAG SUBSYSTEM LAYER',
    techStack: 'EntityGraphStore • Directed Graph Traversal',
    protocol: 'Graph Expansion',
    description: 'Traverses entity-relationship edges extracted from OKF frontmatter to provide multi-hop contextual knowledge.',
    specifications: [
      'Follows directed entity relationships (e.g., depends_on, sub_concept_of)',
      'Builds structured graph summary block appended to reference context',
      'Guarantees zero cyclic entity loops with visited node tracking'
    ],
    categoryColor: 'emerald'
  },

  // Layer 7: Data Layer
  'data-postgres': {
    id: 'data-postgres',
    name: 'PostgreSQL',
    subtitle: '(Prisma ORM - Multi-Tenant Schemas)',
    icon: Database,
    layerIndex: 7,
    layerName: 'ENTERPRISE DATA & PERSISTENCE LAYER',
    techStack: 'PostgreSQL 16 • Prisma v6/v7 • UUID Keys',
    protocol: 'PostgreSQL Connection Pooling',
    description: 'Primary relational database storing multi-tenant organizations, workflows, execution logs, documents, and RAG traces.',
    specifications: [
      'Strict foreign-key cascades on Organization deletion',
      'Optimized unique composite indexes on (organizationId, name)',
      'Stores BAAI/bge-m3 dense vector embeddings in JSON text arrays'
    ],
    categoryColor: 'blue'
  },
  'data-redis': {
    id: 'data-redis',
    name: 'Redis Store',
    subtitle: '(Queue Jobs, Rate Limits, Telemetry, Cache)',
    icon: Server,
    layerIndex: 7,
    layerName: 'ENTERPRISE DATA & PERSISTENCE LAYER',
    techStack: 'Redis 7 • In-Memory Key-Value & Pub/Sub',
    protocol: 'RESP3 Protocol',
    description: 'Ultra-fast in-memory database backing BullMQ job queues, rate limiting counters, SHA-256 idempotency, and Pub/Sub telemetry.',
    specifications: [
      'Sub-millisecond latency for queue pushes & pop operations',
      'TTL-based automatic expiration for idempotency hashes (24 hours)',
      'High-throughput Pub/Sub channel for live WebSocket telemetry fan-out'
    ],
    categoryColor: 'blue'
  }
};

export default function InteractiveArchitectureMap() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const activeNode = selectedNodeId ? ARCHITECTURE_NODES[selectedNodeId] : null;

  const renderNodeCard = (nodeKey: string) => {
    const node = ARCHITECTURE_NODES[nodeKey];
    if (!node) return null;

    const isSelected = selectedNodeId === node.id;
    const IconComponent = node.icon;

    return (
      <div
        key={node.id}
        onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer select-none border text-left ${
          isSelected
            ? 'bg-white/[0.12] border-cyan-400/90 shadow-[0_0_25px_rgba(34,211,238,0.4)] scale-[1.02] z-20'
            : 'bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06] hover:scale-[1.01]'
        }`}
      >
        {/* Corner indicator icon */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
            isSelected
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-white/5 text-slate-300 group-hover:text-white group-hover:bg-white/10'
          }`}
        >
          <IconComponent className="w-3.5 h-3.5" />
        </div>

        <div className="flex flex-col min-w-0 pr-4">
          <span className={`text-[11px] font-bold tracking-tight truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
            {node.name}
          </span>
          <span className="text-[9px] text-slate-400 font-light truncate leading-tight">
            {node.subtitle}
          </span>
        </div>

        {/* Pulse dot for active component — ANCHORED INSIDE CARD */}
        {isSelected && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        )}
      </div>
    );
  };

  const renderConnectingArrow = (type: 'solid' | 'dashed' = 'solid') => (
    <div className="flex items-center justify-center shrink-0 px-1 text-slate-600">
      {type === 'solid' ? (
        <ArrowRight className="w-3.5 h-3.5 text-cyan-400/60 animate-pulse" />
      ) : (
        <ArrowRight className="w-3.5 h-3.5 text-purple-400/60 stroke-dasharray-[2,2]" />
      )}
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center gap-8 relative">
      {/* Section Title */}
      <div className="text-center max-w-3xl flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold tracking-widest uppercase text-cyan-300">
          <Sparkles className="w-3 h-3 animate-spin" />
          Enterprise System Topology
        </span>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
          AetherFlow Architecture
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-light max-w-2xl">
          Complete full-stack architecture matrix. Click any component to inspect its enterprise specifications and data protocols.
        </p>
      </div>

      {/* Main Architecture Matrix Container */}
      <div className="w-full max-w-6xl relative">

        {/* Modal Inspector Panel on Click */}
        {activeNode && (
          <div
            onClick={() => setSelectedNodeId(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel p-6 sm:p-8 rounded-3xl border-cyan-500/40 relative max-w-xl w-full shadow-[0_0_50px_rgba(0,0,0,0.9)] cursor-default animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
              
              {/* Header with Title & Close Button */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                    <activeNode.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                      LAYER {activeNode.layerIndex} • {activeNode.layerName}
                    </span>
                    <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                      {activeNode.name}
                    </h3>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer border border-white/10"
                  aria-label="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-300 font-light leading-relaxed mb-4">
                {activeNode.description}
              </p>

              {/* Protocol & Tech Stack Box */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-2 font-mono text-[11px] mb-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Tech Stack:</span>
                  <span className="text-white text-right truncate ml-2 font-semibold">{activeNode.techStack}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Protocol / Interface:</span>
                  <span className="text-cyan-300 text-right truncate ml-2 font-semibold">{activeNode.protocol}</span>
                </div>
              </div>

              {/* Engineering Specifications */}
              <div className="flex flex-col gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Technical Specifications:
                </span>
                <ul className="flex flex-col gap-2">
                  {activeNode.specifications.map((spec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-200 font-light">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-[10px] font-mono text-slate-500 text-center pt-3 border-t border-white/5 mt-4">
                Click (X) or outside to close inspector
              </div>
            </div>
          </div>
        )}

        {/* 7-Tier Architecture Grid Matrix */}
        <div className={`flex flex-col gap-4 p-5 sm:p-7 rounded-3xl glass-panel relative overflow-x-auto border-white/10 transition-all duration-300 ${activeNode ? 'opacity-30 blur-[2px]' : 'opacity-100'}`}>
          
          {/* Layer 1: Client & Presentation Layer */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-slate-300 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-black">1</span> CLIENT & PRESENTATION LAYER
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {['client-landing', 'client-workflow', 'client-kb', 'client-dlq', 'client-settings', 'client-telemetry'].map(renderNodeCard)}
            </div>
          </div>

          {/* Layer 2: API Gateway & Security Layer */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-black">2</span> API GATEWAY & SECURITY LAYER
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="flex-1 w-full">{renderNodeCard('gw-jwt')}</div>
              {renderConnectingArrow('solid')}
              <div className="flex-1 w-full">{renderNodeCard('gw-ratelimit')}</div>
              {renderConnectingArrow('solid')}
              <div className="flex-1 w-full">{renderNodeCard('gw-idempotency')}</div>
              {renderConnectingArrow('solid')}
              <div className="flex-1 w-full">{renderNodeCard('gw-ws')}</div>
            </div>
          </div>

          {/* Layer 3: Core Backend Services Layer */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-blue-400 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-black">3</span> CORE BACKEND SERVICES LAYER
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {['svc-auth', 'svc-workflow', 'svc-credential', 'svc-rag', 'svc-ingestion'].map(renderNodeCard)}
            </div>
          </div>

          {/* Layer 4: Async Worker & Queue Engine Layer */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black">4</span> ASYNC WORKER & QUEUE ENGINE LAYER
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="flex-1 w-full">{renderNodeCard('worker-bullmq')}</div>
              {renderConnectingArrow('solid')}
              <div className="flex-1 w-full">{renderNodeCard('worker-fleet')}</div>
              {renderConnectingArrow('solid')}
              <div className="flex-1 w-full">{renderNodeCard('worker-redis-pubsub')}</div>
              {renderConnectingArrow('dashed')}
              <div className="flex-1 w-full">{renderNodeCard('worker-dlq')}</div>
            </div>
          </div>

          {/* Layer 5: Node Plugin Ecosystem Layer */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-purple-400 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-black">5</span> NODE PLUGIN ECOSYSTEM LAYER (STRATEGY PATTERN)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {['node-rag', 'node-agent', 'node-guardrail', 'node-api', 'node-foreach', 'node-python', 'node-custom'].map(renderNodeCard)}
            </div>
          </div>

          {/* Layer 6: Advanced RAG Subsystem Layer */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">6</span> ADVANCED HYBRID RAG SUBSYSTEM LAYER
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {['rag-markitdown', 'rag-okf', 'rag-embed', 'rag-vector-store', 'rag-rrf', 'rag-reranker', 'rag-expander', 'rag-graph'].map(renderNodeCard)}
            </div>
          </div>

          {/* Layer 7: Data Layer */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-indigo-400 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-black">7</span> ENTERPRISE DATA & PERSISTENCE LAYER
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {['data-postgres', 'data-redis'].map(renderNodeCard)}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
