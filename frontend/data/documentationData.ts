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
        title: 'Introduction & Overview',
        category: 'GETTING STARTED',
        badge: 'Platform Core',
        description:
          'Welcome to AetherFlow—a modern, enterprise-ready autonomous AI workflow engine for building deterministic, self-healing agent pipelines.',
        sections: [
          {
            id: 'the-problem',
            title: 'What is AetherFlow?',
            content:
              'AetherFlow allows you to connect AI models, REST APIs, document search (RAG), and custom code into visual, automated workflows.\n\nWhile traditional AI setups are unpredictable and prone to hallucinations or malformed responses, AetherFlow treats AI steps as part of a reliable pipeline with automatic quality checks (Guardrails), checkpointed retries, and multi-tenant security.',
            callout: {
              type: 'important',
              title: 'Key Design Principle',
              text: 'Every AI output is checked before it moves forward. If an AI makes a mistake, our engine can automatically rewind the workflow, tell the AI what went wrong, and let it fix itself.'
            }
          },
          {
            id: 'key-pillars',
            title: 'Core Capabilities',
            content:
              '• Visual Flow Canvas: Drag, drop, and link nodes together with intuitive drag handles.\n• Autonomous Self-Correction: Guardrails catch bad outputs and rewind execution seamlessly.\n• Hybrid Document RAG: Upload PDFs, Word documents, or spreadsheets and query them semantically.\n• Enterprise Team Security: Fine-grained permissions and isolated workspaces for Admins and Members.\n• Resilient Queue & DLQ: Automatic retries with exponential backoff and a Dead Letter Queue to recover failed runs.'
          }
        ]
      },
      {
        id: 'quickstart',
        title: 'Platform Quickstart',
        category: 'GETTING STARTED',
        badge: '3-Minute Guide',
        description: 'How to register, set up credentials, and create your very first automated workflow.',
        sections: [
          {
            id: 'account-setup',
            title: '1. Create Your Account',
            content:
              'Choose the registration option that matches your needs:\n\n• Single Developer: For individual builders. You get instant access to personal workflows, private credentials, and an isolated sandbox.\n• Team Organization: For teams and enterprises. The Organization Admin creates the workspace and invites Members using secure invite tokens.'
          },
          {
            id: 'configuring-keys',
            title: '2. Add Your AI Credentials',
            content:
              'Go to Settings > Credentials to store your Google Gemini API Key or custom bearer tokens.\n\nAll secrets are automatically encrypted using AES-256-GCM encryption before being stored in the database, ensuring complete confidentiality.'
          },
          {
            id: 'first-workflow',
            title: '3. Create Your First Workflow',
            content:
              '1. Click "+ New Workflow" on your dashboard.\n2. Drag an Input Node onto the canvas to supply starter data.\n3. Drag an Agent Node and connect the bottom handle of the Input Node to the top handle of the Agent Node.\n4. Click the Agent Node to write your prompt (e.g. "Summarize: {{input_1.output}}").\n5. Click "Run Workflow" in the top bar to watch it execute live in real time!'
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
        title: 'Workflows & Data Flow (DAG)',
        category: 'CORE ENGINE CONCEPTS',
        badge: 'Workflow Logic',
        description:
          'How AetherFlow orders steps, detects loops, and passes variables between connected nodes.',
        sections: [
          {
            id: 'dag-explained',
            title: 'What is a DAG (Directed Acyclic Graph)?',
            content:
              'Think of a DAG as a smart recipe or assembly line flowchart:\n\n• "Directed": Each connection points in one direction (from step A to step B).\n• "Acyclic": There are no infinite circular loops (step A cannot wait for step B if step B is waiting for step A).\n• "Graph": A collection of interconnected steps (nodes) and wires (edges).\n\nBefore running any workflow, AetherFlow automatically verifies that your flow has no circular deadlocks using Kahn\'s algorithm. If a loop is accidentally created, the editor highlights the problem immediately.'
          },
          {
            id: 'data-interpolation',
            title: 'Passing Data Between Nodes (Variables)',
            content:
              'Nodes share data dynamically using double curly braces: `{{nodeId.output}}`.\n\nWhenever a node finishes running, its result is stored in workflow memory. Any downstream node can reference that output directly in its prompts, URLs, or request bodies.',
            codeSnippet: {
              language: 'json',
              code: '{\n  "prompt": "Write a friendly email reply to: {{customer_email.output}}\\nUse these key details: {{knowledge_search.output}}"\n}'
            },
            callout: {
              type: 'tip',
              title: 'Accessing Nested JSON Properties',
              text: 'If an upstream node returns a JSON object (like `{ "user": { "name": "Alex", "id": 101 } }`), you can access specific fields directly: `{{api_1.output.user.name}}`.'
            }
          },
          {
            id: 'checkpoint-resumption',
            title: 'Smart Checkpoints (Save Points)',
            content:
              'Every completed step is saved to the database as an immutable checkpoint.\n\nIf step 4 of a 5-step workflow encounters an issue (such as an external API timeout), you don\'t need to re-run steps 1, 2, and 3! The engine resumes right at step 4, saving you time and API tokens.'
          }
        ]
      },
      {
        id: 'execution-options',
        title: 'Flexible Execution Modes',
        category: 'CORE ENGINE CONCEPTS',
        badge: 'Execution Guide',
        description:
          'Learn the three execution modes available in AetherFlow and exactly when to use each one.',
        sections: [
          {
            id: 'mode-1-full-workflow',
            title: 'Mode 1: Execute Full Workflow (The Production Run)',
            content:
              'What it does:\nRuns every node in the workflow from start to finish in the exact dependency order.\n\nWhen to use it:\n• When your workflow is finished and ready for end-to-end testing.\n• When processing real-world data from start to finish.\n• When verifying that all steps communicate smoothly together.',
            callout: {
              type: 'note',
              title: 'Live Telemetry',
              text: 'During a full run, nodes on your canvas glow with animated borders and live status pills: Verifying (yellow), Passed (green), or Failed (red).'
            }
          },
          {
            id: 'mode-2-run-upto-node',
            title: 'Mode 2: Run Up To This Node (The Milestone Checkpoint)',
            content:
              'What it does:\nExecutes only the selected node and its required upstream prerequisites, stopping right at that node without triggering any downstream steps.\n\nWhen to use it:\n• When you have a 10-node workflow and want to verify step 4 before building steps 5 through 10.\n• When debugging: if step 6 produces unexpected results, you can run up to step 5 to inspect the exact data being passed in.\n• Saves expensive API credits by not executing unnecessary downstream AI calls during intermediate testing.'
          },
          {
            id: 'mode-3-single-node',
            title: 'Mode 3: Single Node Test Run (The Instant Sandbox)',
            content:
              'What it does:\nExecutes ONLY the selected node in isolation using the cached outputs from previous runs (executes in ~50ms).\n\nWhen to use it:\n• When fine-tuning an AI prompt: change the instructions or temperature on an Agent Node and test the new output instantly without re-running previous nodes.\n• When tweaking regex patterns or validation keys on a Guardrail Node.\n• When adjusting URL parameters on an API Node.',
            callout: {
              type: 'tip',
              title: 'Best Practice Workflow',
              text: '1. Run Up To Node once to generate real upstream data.\n2. Use Single Node Test Run repeatedly to tweak and perfect your prompt in seconds!'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'node-catalog',
    title: 'NODE CATALOG & CONFIGURATION',
    iconName: 'Boxes',
    articles: [
      {
        id: 'agent-node',
        title: 'Agent Node (AI Brain)',
        category: 'NODE CATALOG & CONFIGURATION',
        badge: 'Cognitive Reasoning',
        description: 'Executes generative AI prompts with variable replacement, temperature control, and automatic self-correction.',
        sections: [
          {
            id: 'agent-overview',
            title: 'What is the Agent Node?',
            content:
              'The Agent Node is the "thinking brain" of your workflow. It sends prompts to Google Gemini (or your configured model) to generate text, summarize documents, answer questions, or extract structured data.'
          },
          {
            id: 'agent-configuration-steps',
            title: 'How to Configure (Step-by-Step)',
            content:
              '1. Click the Agent Node on the canvas to open its Properties Panel on the right.\n2. Select your AI Model (e.g. Gemini 2.5 Flash for speed, or Pro for complex reasoning).\n3. Adjust the Temperature slider (lower for strict accuracy, higher for creative writing).\n4. Set the System Instruction (optional persona or overarching guidelines).\n5. Type your Prompt in the main prompt box, using {{upstreamNode.output}} wherever you need data from earlier steps.'
          },
          {
            id: 'agent-fields-breakdown',
            title: 'Field-by-Field Reference',
            content:
              '• Model: Which AI model to use.\n  - Purpose: Choose between Gemini 2.5 Flash (lightning fast, cost-efficient) or Gemini Pro (deeper reasoning for complex problems).\n  - Example: `gemini-2.5-flash`\n\n• Temperature (0.0 to 1.0):\n  - Purpose: Controls creativity vs determinism. 0.0 gives strict, factual, consistent answers; 0.7+ gives creative, varied text.\n  - Example: Set to `0.2` for JSON extraction, or `0.7` for marketing email drafting.\n\n• System Instruction:\n  - Purpose: Sets the AI\'s role and behavioral boundaries before it reads your prompt.\n  - Example: "You are a professional financial analyst. Always be concise and objective."\n\n• Prompt:\n  - Purpose: The specific task you want the AI to perform right now. Supports dynamic variables.\n  - Example: "Extract the customer name, order total, and delivery address from: {{incoming_order.output}}"'
          },
          {
            id: 'agent-example',
            title: 'Practical Example: Invoice Data Extractor',
            content: 'Here is how you would configure an Agent Node to pull structured JSON from raw invoice text:',
            codeSnippet: {
              language: 'json',
              code: '{\n  "model": "gemini-2.5-flash",\n  "temperature": 0.1,\n  "systemInstruction": "You are a data extraction assistant. Return valid JSON only.",\n  "prompt": "Extract the vendor, date, and total amount from this receipt:\\n{{read_receipt.output}}\\nFormat: { vendor: string, date: string, total: number }"\n}'
            }
          }
        ]
      },
      {
        id: 'guardrail-node',
        title: 'Guardrail Node (Quality Inspector)',
        category: 'NODE CATALOG & CONFIGURATION',
        badge: 'Self-Healing Engine',
        description: 'Verifies AI outputs against rules and automatically rewinds the workflow so the AI can correct mistakes.',
        sections: [
          {
            id: 'guardrail-overview',
            title: 'What is the Guardrail Node?',
            content:
              'The Guardrail Node is your workflow\'s "quality control inspector". It sits right after an AI Agent Node to make sure the output meets your exact standards (valid JSON, required keys, proper formatting, or no forbidden words).\n\nIf the AI fails the test, the Guardrail automatically rewinds execution, sends the AI a helpful hint explaining what went wrong, and lets the AI try again!'
          },
          {
            id: 'guardrail-configuration-steps',
            title: 'How to Configure (Step-by-Step)',
            content:
              '1. Drag a Guardrail Node onto the canvas and connect the Agent Node\'s output into it.\n2. Select your Validation Rule Mode (Strict JSON, Required Keys, Regex Pattern, Prohibited Words, or LLM Judge).\n3. Fill in the required rule criteria (e.g. required keys like `summary, sentiment`).\n4. Set Max Auto-Retries (typically 3 attempts).\n5. (Optional) Enter Custom Correction Guidance to guide the AI if it fails (or click one of the Quick Presets).'
          },
          {
            id: 'guardrail-fields-breakdown',
            title: 'Field-by-Field Reference',
            content:
              '• Validation Mode: The type of check performed.\n  - Strict JSON: Ensures output is parseable JSON (removes markdown backticks automatically).\n  - Required Keys: Checks that specific JSON properties exist (e.g. `summary, status`).\n  - Regex Pattern: Checks that text matches a pattern (e.g. `^\\d{4}-\\d{2}-\\d{2}$` for dates).\n  - Prohibited Keywords: Flags and rejects text if it contains forbidden terms.\n  - LLM Judge: Uses an independent AI prompt to score output quality or policy compliance.\n\n• Required JSON Keys:\n  - Purpose: A comma-separated list of keys that must appear in the JSON output.\n  - Example: `vendor, invoice_number, total`\n\n• Max Auto-Retries (1 to 5):\n  - Purpose: How many times the workflow will rewind and retry before finally failing.\n  - Example: `3` (recommended default)\n\n• Custom Correction Guidance (Prompt Hint):\n  - Purpose: The instruction whispered back to the upstream Agent Node if validation fails.\n  - Example: "Your response was missing the \'total\' key. Please re-check and include it."'
          },
          {
            id: 'guardrail-quick-presets',
            title: 'Quick Presets',
            content:
              'Inside the Guardrail Properties Panel, you will find quick 1-click presets:\n• Strict JSON: Instantly sets validation to strict JSON parsing.\n• Schema Keys: Instantly configures required keys and auto-fills a helpful correction hint.'
          }
        ]
      },
      {
        id: 'api-node',
        title: 'API Node (External Connector)',
        category: 'NODE CATALOG & CONFIGURATION',
        badge: 'Integrations',
        description: 'Connects your workflow to any external REST API, webhook, CRM, database, or third-party service.',
        sections: [
          {
            id: 'api-overview',
            title: 'What is the API Node?',
            content:
              'The API Node is the "messenger" that allows your workflow to talk to the outside world. Use it to send messages to Slack, look up customer data in your CRM, charge payments via Stripe, or trigger GitHub actions.'
          },
          {
            id: 'api-configuration-steps',
            title: 'How to Configure (Step-by-Step)',
            content:
              '1. Click the API Node on the canvas to open the Properties Panel.\n2. Choose the HTTP Method (GET, POST, PUT, PATCH, DELETE).\n3. Enter the Endpoint URL (you can type variables like `{{agent_1.output.userId}}` directly in the URL).\n4. Use the sub-tabs (Params, Headers, Auth, Body) to supply extra details if needed.'
          },
          {
            id: 'api-fields-breakdown',
            title: 'Field-by-Field Reference',
            content:
              '• HTTP Method:\n  - Purpose: Standard REST verb. GET (fetch data), POST (create data), PUT/PATCH (update data), DELETE (remove data).\n  - Example: `POST` to send a webhook message.\n\n• Endpoint URL:\n  - Purpose: The web address of the API service.\n  - Example: `https://api.github.com/repos/octocat/hello-world`\n\n• Query Parameters (Params Tab):\n  - Purpose: Extra filtering parameters appended to the URL (e.g. `?status=active&limit=10`).\n  - Example: `status=active` or JSON format `{"limit": 20}`\n\n• Custom Headers (Headers Tab):\n  - Purpose: Metadata sent with the request, such as Content-Type or custom tracking headers.\n  - Example: `Content-Type: application/json`\n\n• Authentication (Auth Tab):\n  - Purpose: Securely passes your Bearer token or custom API key header.\n  - Example: Paste token or use `{{credentials.MY_API_KEY}}`\n\n• Request Body (Body Tab):\n  - Purpose: The JSON or text data sent to the server for POST, PUT, or PATCH requests.\n  - Example: `{\n  "text": "{{agent_summary.output}}"\n}`'
          }
        ]
      },
      {
        id: 'rag-node',
        title: 'RAG Node (Document Search)',
        category: 'NODE CATALOG & CONFIGURATION',
        badge: 'Knowledge Base',
        description: 'Searches uploaded company documents, PDFs, and guides to find exact answers for your AI agents.',
        sections: [
          {
            id: 'rag-overview',
            title: 'What is the RAG Node?',
            content:
              'RAG stands for Retrieval-Augmented Generation. Think of it as a super-smart "research librarian".\n\nYou upload your internal documents (PDFs, Word docs, spreadsheets, or text files) in the Knowledge Base section. Then, the RAG Node searches through those documents to find the most relevant paragraphs and feeds them directly into an Agent Node.'
          },
          {
            id: 'rag-configuration-steps',
            title: 'How to Configure (Step-by-Step)',
            content:
              '1. Upload your documents in the Knowledge Base tab (`/document`).\n2. Drag a RAG Node onto the canvas.\n3. Select your Knowledge Base from the dropdown.\n4. Type your Search Query (e.g. `{{input_1.output.userQuestion}}`).\n5. Set Top-K to choose how many matching document sections to retrieve (typically 3 to 5).\n6. Connect the output of the RAG Node into an Agent Node so the AI can read the retrieved facts!'
          },
          {
            id: 'rag-fields-breakdown',
            title: 'Field-by-Field Reference',
            content:
              '• Knowledge Base:\n  - Purpose: The specific folder or collection of documents to search through.\n  - Example: Select "Company HR Policies" or "API Documentation".\n\n• Search Query:\n  - Purpose: The question or search keywords used to find relevant sections.\n  - Example: "What is the policy for medical leave?" or `{{input_1.output.query}}`\n\n• Top-K Results (1 to 10):\n  - Purpose: The maximum number of relevant document passages to return.\n  - Example: `3` (returns the top 3 best matching sections)\n\n• Search Strategy:\n  - Purpose: Choose between Dense Vector Search (semantic conceptual matching) or Hybrid Search (combining exact keywords with AI semantic matching).'
          }
        ]
      },
      {
        id: 'foreach-node',
        title: 'ForEach Node (Batch Processor)',
        category: 'NODE CATALOG & CONFIGURATION',
        badge: 'Batch Processing',
        description: 'Takes a list of items and processes each one through a sub-flow in parallel with safety limits.',
        sections: [
          {
            id: 'foreach-overview',
            title: 'What is the ForEach Node?',
            content:
              'The ForEach Node is like an "assembly line worker". When an upstream node returns a list of items (e.g. 20 customers or 50 products), the ForEach Node splits the list and runs your connected sub-flow for every item automatically.'
          },
          {
            id: 'foreach-configuration-steps',
            title: 'How to Configure (Step-by-Step)',
            content:
              '1. Place the ForEach Node after a node that outputs an array.\n2. Set the Array Path pointing to the list (e.g. `{{fetch_users.output.items}}`).\n3. Connect the node\'s "loop" handle to the sub-nodes that will process each item.\n4. Connect the node\'s "done" handle to whatever step runs after the entire batch finishes!'
          },
          {
            id: 'foreach-fields-breakdown',
            title: 'Field-by-Field Reference',
            content:
              '• Array Path:\n  - Purpose: The variable path to the list of items.\n  - Example: `{{api_call.output.users}}`\n\n• Item Alias:\n  - Purpose: The variable name representing the current item inside the loop.\n  - Example: `$item` (accessed inside loop as `{{$item.email}}`)\n\n• Concurrency (1 to 20):\n  - Purpose: How many items to process simultaneously. Setting to 5 processes 5 items at a time.\n  - Example: `3`\n\n• Continue on Error:\n  - Purpose: If one item in the list fails, should the workflow continue processing the rest of the items or stop immediately?'
          }
        ]
      },
      {
        id: 'code-node',
        title: 'Custom Code Node (Formula & Calculator)',
        category: 'NODE CATALOG & CONFIGURATION',
        badge: 'Data Transformation',
        description: 'Write custom JavaScript or Python scripts for data cleaning, math calculations, and custom logic.',
        sections: [
          {
            id: 'code-overview',
            title: 'What is the Custom Code Node?',
            content:
              'When you need to do specific math calculations, reshape complex JSON data, or filter strings without calling an external AI model, the Code Node gives you a lightweight, instant script runner.'
          },
          {
            id: 'code-configuration-steps',
            title: 'How to Configure (Step-by-Step)',
            content:
              '1. Select your language: JavaScript (Node.js) or Python.\n2. Write your transformation function in the editor.\n3. The function receives `inputs` (all upstream node outputs) and must `return` the final result.'
          },
          {
            id: 'code-fields-breakdown',
            title: 'Field-by-Field Reference',
            content:
              '• Runtime Environment: Node.js (JavaScript) or Python 3.\n• Code Editor: The logic function that runs in a protected sandbox.\n• Execution Timeout: Maximum time allowed before auto-terminating (default 10,000ms).'
          }
        ]
      },
      {
        id: 'input-node',
        title: 'Input Node (Starter Trigger)',
        category: 'NODE CATALOG & CONFIGURATION',
        badge: 'Trigger Entry',
        description: 'The starting entry point that provides initial input data or webhook payloads to the workflow.',
        sections: [
          {
            id: 'input-overview',
            title: 'What is the Input Node?',
            content:
              'Every workflow starts somewhere! The Input Node acts as the "starter gun" or "doorbell" that triggers the workflow and supplies the initial text, customer query, or JSON payload that all other nodes build upon.'
          },
          {
            id: 'input-fields-breakdown',
            title: 'Field Reference',
            content:
              '• Initial Payload / Trigger Data:\n  - Purpose: The starting data entered manually or provided by a webhook.\n  - Example: "Customer inquiry: I would like to refund order #94812."'
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
        badge: 'Team Security',
        description:
          'Learn how organization roles, member sandboxes, and configurable permissions protect your workflows.',
        sections: [
          {
            id: 'roles-overview',
            title: 'Default Access: Admin vs. Member',
            content:
              'AetherFlow separates users into two clear roles within each Organization:\n\n1. Organization Admin (Full Control):\n• Owns the workspace and manages team settings.\n• Invites new members and configures their permissions.\n• Manages organization API credentials.\n• Full access to all workflows across the team and the Dead Letter Queue (DLQ).\n\n2. Organization Member (Safe Sandbox by Default):\n• By default, Members work in a private sandbox. They can create, edit, and run their own workflows.\n• Members CANNOT view, edit, or execute other teammates\' workflows unless explicitly granted permission by an Admin.\n• Cannot access the organization Dead Letter Queue or settings by default.'
          },
          {
            id: 'configurable-permissions-list',
            title: 'Configurable Member Permissions',
            content:
              'Admins can customize exactly what each Member is allowed to do. Members can request any of these permissions from their Admin:\n\n1. View Team Workflows:\nAllows the member to see workflows created by other colleagues in the organization.\n\n2. Edit Team Workflows:\nAllows the member to modify node configurations and logic on team workflows.\n\n3. Execute Team Workflows:\nAllows the member to trigger runs on team workflows.\n\n4. View Team Runs & Logs:\nAllows the member to monitor execution logs and outputs from other members.\n\n5. Access Dead Letter Queue (DLQ):\nGrants access to the DLQ dashboard to inspect failed workflow steps and replay them.\n\n6. Organization Knowledge Base Access:\nAllows the member to upload, update, or delete documents in shared Organization Knowledge Bases.'
          },
          {
            id: 'scoped-whitelisting',
            title: 'Granular Scoped Whitelisting (Per-Workflow Access)',
            content:
              'Instead of giving a Member access to EVERY workflow in the company, Admins can grant access to individual workflows specifically.\n\nFor example, an Admin can grant a Member view and execute permissions on "Customer Support Bot #12", while keeping "Payroll Processing Workflow #04" completely hidden and protected.'
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
        title: 'Dead Letter Queue (DLQ) & Resilience',
        category: 'RESILIENCE & DEAD LETTER QUEUE',
        badge: 'Zero Downtime',
        description:
          'How AetherFlow handles network hiccups, stops bad jobs immediately, protects server memory, and lets you replay failed steps.',
        sections: [
          {
            id: 'what-is-dlq',
            title: 'What is the Dead Letter Queue (DLQ)?',
            content:
              'Think of the Dead Letter Queue as the "Hospital / Recovery Ward" for workflows.\n\nWhen a workflow crashes because an external API is down, a rate limit is exceeded, or invalid data was passed, it doesn\'t vanish into thin air. Instead, the failed run is safely stored in the Dead Letter Queue (`/dlq`) so you can inspect the error and replay it once the issue is fixed.'
          },
          {
            id: 'transient-vs-permanent',
            title: 'Smart Retries vs. Immediate Failures',
            content:
              'AetherFlow intelligently distinguishes between two types of errors:\n\n1. Temporary / Transient Glitches (Auto-Retried):\nIf an external service has a temporary network timeout, a 503 Service Unavailable, or a 429 Rate Limit, the engine automatically pauses and retries up to 3 times with a smart waiting delay (2 seconds, 4 seconds, 8 seconds). Because of our checkpoint system, already-completed steps are never repeated!\n\n2. Permanent Errors (Immediate Stop):\nIf an error cannot be solved by waiting (such as a missing API key, invalid URL syntax, or HTTP 401 Unauthorized), the engine stops immediately in 0ms without wasting retry attempts or queue slots.'
          },
          {
            id: 'memory-protection',
            title: 'Server Memory Protection',
            content:
              'In high-volume enterprise production, hundreds of thousands of jobs run through the system. If failed jobs were stored in server RAM indefinitely, the system would eventually run out of memory (OOM crash).\n\nAetherFlow automatically protects server health by enforcing strict memory retention:\n• A maximum of 1,000 failed job records are kept in active memory.\n• Old records automatically expire after 3 days.\n• Long-term execution logs are safely persisted in PostgreSQL, keeping active queues lightning fast.'
          },
          {
            id: 'one-click-replay',
            title: 'One-Click Replay from Point of Failure',
            content:
              'When you open the DLQ dashboard (`/dlq`), you can:\n• See the exact workflow and node that failed.\n• Read the exact error message and stack trace in plain language.\n• Click "Replay" to restart the workflow directly from the failed step—saving you from running the entire workflow all over again!'
          }
        ]
      }
    ]
  }
];
