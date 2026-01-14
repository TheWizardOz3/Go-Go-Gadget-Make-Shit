# Technical Architecture: GoGoGadgetClaude

> **Purpose:** This is the Engineering Design Document (EDD) — the "How" of implementation. It serves as the technical reference for AI coding assistants and human developers alike. For product requirements and the "What," see `product_spec.md`.

---

## 1. Tech Stack Definition

### 1.1 Frontend Stack

| Layer | Technology | Version | Package Name | Rationale |
|-------|------------|---------|--------------|-----------|
| Framework | React | 18.x | `react` | Mature, excellent mobile web support, large ecosystem |
| Language | TypeScript | 5.x | `typescript` | Type safety, better DX, catches errors early |
| State Management | Zustand | 4.x | `zustand` | Lightweight, minimal boilerplate, simple API |
| Data Fetching | Native fetch + SWR | 2.x | `swr` | Simple caching, revalidation, lightweight |
| Routing | React Router | 6.x | `react-router-dom` | Standard React routing, simple for this app |
| Styling | Tailwind CSS | 3.x | `tailwindcss` | Rapid UI development, mobile utilities, small bundle |
| Component Library | Custom + Radix UI | — | `@radix-ui/react-*` | Accessible primitives, unstyled (we control look) |
| Form Handling | Native + Zod | 3.x | `zod` | Lightweight, TypeScript-first validation |
| Syntax Highlighting | Shiki | 1.x | `shiki` | Accurate highlighting, VSCode themes, fast |
| Build Tool | Vite | 5.x | `vite` | Fast builds, excellent DX, native ESM |
| Package Manager | pnpm | 8.x | — | Fast, disk-efficient, strict dependencies |

### 1.2 Backend Stack

| Layer | Technology | Version | Package Name | Rationale |
|-------|------------|---------|--------------|-----------|
| Runtime | Node.js | 20.x LTS | — | Stable, ubiquitous, same language as frontend |
| Language | TypeScript | 5.x | `typescript` | Type safety, shared types with frontend |
| Framework | Express | 4.x | `express` | Simple, well-documented, mature |
| API Style | REST | — | — | Simple for this use case, no need for GraphQL complexity |
| File Watching | chokidar | 3.x | `chokidar` | Cross-platform, reliable file watching |
| Process Management | execa | 8.x | `execa` | Better child process handling than native |
| YAML Parsing | yaml | 2.x | `yaml` | Parse template config files |
| Git Operations | simple-git | 3.x | `simple-git` | Clean Git CLI wrapper |
| Validation | Zod | 3.x | `zod` | Shared with frontend, TypeScript-first |

### 1.3 Database & Storage

| Component | Technology | Version/Tier | Hosted By | Rationale |
|-----------|------------|--------------|-----------|-----------|
| Primary Database | None (file-based) | — | Local filesystem | Claude manages JSONL; we only read |
| App Settings | JSON file | — | `~/.gogogadgetclaude/` | Simple config, no DB needed |
| Session State | localStorage | — | Browser | Remember last project, UI preferences |
| Conversation Data | JSONL | — | `~/.claude/projects/` | Claude Code's native format (read-only) |

### 1.4 Infrastructure & DevOps

| Component | Technology | Tier/Plan | Rationale |
|-----------|------------|-----------|-----------|
| Network Access | Tailscale | Free (Personal) | Secure, easy setup, works through NAT |
| Hosting | Local laptop | — | No cloud costs, data stays local |
| Notifications | macOS AppleScript | — | Native, free, reliable, no external service |
| Voice Transcription | Groq Whisper API | Free tier | Excellent accuracy, generous free tier |
| Voice Fallback | Web Speech API | — | Built into browser, zero cost backup |

### 1.5 Observability & Monitoring

| Component | Technology | Tier/Plan | Purpose |
|-----------|------------|-----------|---------|
| Error Tracking | Console logging | — | Simple, sufficient for single-user local app |
| Log Aggregation | Console + file | — | Development debugging |
| Uptime Monitoring | None needed | — | Local app, no external monitoring required |
| Analytics | None | — | Personal tool, no analytics needed |

### 1.6 Development Tools

| Tool | Purpose | Configuration File |
|------|---------|-------------------|
| Linter | ESLint | `eslint.config.js` |
| Formatter | Prettier | `.prettierrc` |
| Type Checker | TypeScript | `tsconfig.json` |
| Test Runner | Vitest | `vitest.config.ts` |
| Git Hooks | Husky + lint-staged | `.husky/`, `package.json` |
| Environment Variables | dotenv | `.env`, `.env.example` |

---

## 2. System Architecture

### 2.1 Architecture Pattern
**Pattern:** Client-Server (Local)

**Description:**  
A Node.js server runs on the user's laptop, serving a React web app and providing REST APIs. The phone connects via Tailscale's private network. The server watches Claude Code's JSONL session files and exposes endpoints for conversation state, sending prompts, and controlling the agent.

### 2.2 High-Level Architecture Diagram

```
┌─────────────────────┐              ┌──────────────────────────────────────────────┐
│   iPhone Safari     │              │   Laptop (macOS)                             │
│                     │   Tailscale  │                                              │
│  ┌───────────────┐  │   Private    │  ┌──────────────┐    ┌───────────────────┐  │
│  │  React SPA    │◄─┼───Network────┼─►│  Node.js     │◄──►│  Claude Code CLI  │  │
│  │  (Vite build) │  │   :3456      │  │  Express     │    │                   │  │
│  └───────────────┘  │              │  │  Server      │    └─────────┬─────────┘  │
│                     │              │  └───────┬──────┘              │            │
└─────────────────────┘              │          │                     │            │
                                     │          ▼                     ▼            │
                                     │  ┌──────────────┐    ┌───────────────────┐  │
                                     │  │ ~/.claude/   │    │  Git Repos        │  │
                                     │  │ projects/    │    │  (Your Projects)  │  │
                                     │  │ (JSONL)      │    │                   │  │
                                     │  └──────────────┘    └───────────────────┘  │
                                     │          │                                  │
                                     │          ▼                                  │
                                     │  ┌──────────────┐                           │
                                     │  │ AppleScript  │──────► iMessage to Phone  │
                                     │  │ (osascript)  │                           │
                                     │  └──────────────┘                           │
                                     └──────────────────────────────────────────────┘
```

### 2.3 Service Boundaries & Responsibilities

| Service/Module | Responsibility | Exposes | Consumes |
|----------------|----------------|---------|----------|
| Express Server | HTTP API, static file serving | REST endpoints | File system, Git CLI, Claude CLI |
| JSONL Watcher | Monitor conversation files for changes | Internal events | `~/.claude/projects/` |
| Session Manager | Parse sessions, track state | API via server | JSONL files |
| Git Service | Generate diffs, list changes | API via server | Git CLI (simple-git) |
| Process Controller | Start/stop Claude Code | API via server | execa, Claude CLI |
| Notification Service | Send iMessage on task complete | Triggered by hooks | AppleScript |
| React Web App | User interface | — | Server REST API |

### 2.4 Data Flow Patterns

#### Request Flow (Viewing Conversation)
```
1. React app loads on phone via Tailscale URL
2. App requests /api/sessions/:id/messages
3. Server reads JSONL file from ~/.claude/projects/
4. Server parses JSONL, transforms to API response
5. Response returned to React app
6. React renders conversation UI
```

#### Command Flow (Sending Prompt)
```
1. User types/dictates prompt in React app
2. React POSTs to /api/sessions/:id/send
3. Server spawns `claude -p "prompt" --continue`
4. Claude writes to JSONL file
5. Watcher detects JSONL change
6. Next poll from React fetches new messages
```

#### Notification Flow (Task Complete)
```
1. Claude Code finishes task, fires Stop hook
2. Hook script calls local server endpoint
3. Server triggers AppleScript
4. osascript sends iMessage to user's phone
5. User taps notification, opens web app
```

### 2.5 Communication Patterns

| Pattern | Used For | Implementation |
|---------|----------|----------------|
| Synchronous HTTP | All API calls | Express REST endpoints |
| Polling | Conversation updates | React SWR with 2-3 second interval |
| File Watching | Detecting JSONL changes | chokidar on `~/.claude/projects/` |
| Process Spawn | Sending prompts, stopping agent | execa with Claude CLI |

---

## 3. Project Directory Structure

### 3.1 Monorepo vs Polyrepo
**Structure:** Single Repo  
**Tool:** None (simple npm workspaces not needed)

### 3.2 Directory Tree

```
gogogadgetclaude/
├── .github/                      # GitHub workflows (optional)
│   └── workflows/
├── .husky/                       # Git hooks
│   ├── pre-commit
│   └── _/
├── .vscode/                      # Editor configuration
│   └── settings.json
├── client/                       # React frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/           # UI components
│   │   │   ├── ui/               # Primitive components (Button, Input, etc.)
│   │   │   ├── conversation/     # Conversation view components
│   │   │   ├── files/            # File diff components
│   │   │   └── layout/           # Layout components (Header, Nav)
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useConversation.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useSessions.ts
│   │   │   └── useVoiceInput.ts
│   │   ├── lib/                  # Utility functions
│   │   │   ├── api.ts            # API client
│   │   │   ├── formatters.ts     # Date, text formatting
│   │   │   └── cn.ts             # classnames utility
│   │   ├── stores/               # Zustand stores
│   │   │   └── appStore.ts
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx               # Main app component
│   │   ├── main.tsx              # Entry point
│   │   └── index.css             # Global styles + Tailwind
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── server/                       # Node.js backend
│   ├── src/
│   │   ├── api/                  # Route handlers
│   │   │   ├── projects.ts
│   │   │   ├── sessions.ts
│   │   │   ├── files.ts
│   │   │   ├── transcribe.ts
│   │   │   └── settings.ts
│   │   ├── services/             # Business logic
│   │   │   ├── sessionManager.ts # JSONL parsing, session state
│   │   │   ├── gitService.ts     # Git diff operations
│   │   │   ├── claudeService.ts  # Claude CLI interactions
│   │   │   ├── notificationService.ts # iMessage via AppleScript
│   │   │   └── transcriptionService.ts # Groq Whisper API
│   │   ├── lib/                  # Utilities
│   │   │   ├── jsonlParser.ts    # Parse Claude JSONL format
│   │   │   ├── fileWatcher.ts    # chokidar wrapper
│   │   │   └── config.ts         # Configuration loader
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts
│   │   ├── middleware/           # Express middleware
│   │   │   └── errorHandler.ts
│   │   └── index.ts              # Server entry point
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                       # Shared code (optional)
│   └── types/                    # Types used by both client and server
│       └── index.ts
│
├── scripts/                      # Utility scripts
│   ├── setup-hooks.sh            # Claude Code hooks setup
│   └── install-tailscale.sh      # Tailscale setup helper
│
├── docs/                         # Documentation
│   ├── architecture.md           # This file
│   ├── product_spec.md
│   ├── decision_log.md
│   ├── project_status.md
│   └── changelog.md
│
├── .env.example                  # Environment variable template
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── package.json                  # Root package.json (scripts only)
├── pnpm-workspace.yaml           # pnpm workspace config
└── README.md
```

### 3.3 Key Directory Explanations

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `client/src/components/ui/` | Base UI primitives | Button, Input, Badge, Toast, Modal, etc. |
| `client/src/components/conversation/` | Conversation feature | MessageList, MessageBubble, StatusIndicator, etc. |
| `client/src/components/files/` | File diff feature | FileList, DiffViewer, etc. |
| `server/src/services/` | Business logic layer | All core logic, no HTTP concerns |
| `server/src/api/` | HTTP route handlers | Thin layer, delegates to services |
| `shared/types/` | Shared TypeScript types | Session, Message, Project, etc. |

### 3.4 Business Logic Location

**Primary Location:** `server/src/services/`

**Guidelines:**
- All business rules live in `services/`, never in route handlers
- Route handlers (`api/`) only handle HTTP concerns (parsing, validation, response formatting)
- JSONL parsing logic isolated in `lib/jsonlParser.ts`
- Git operations isolated in `services/gitService.ts`

### 3.5 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `MessageBubble.tsx` |
| Hooks | camelCase with `use` prefix | `useConversation.ts` |
| Services | camelCase with `Service` suffix | `sessionManager.ts` |
| Types | PascalCase | `Session.ts` or `index.ts` |
| Tests | Same name with `.test.ts` suffix | `sessionManager.test.ts` |
| Utilities | camelCase | `formatters.ts` |

---

## 4. Database Design

### 4.1 Database Selection Rationale
**Primary Database:** None (file-based architecture)  
**Why:** This is a single-user local application. Claude Code already manages conversation data in JSONL files. We read from those files and store minimal app config in JSON files. No database complexity needed.

### 4.2 Data Storage Locations

| Data | Location | Format | Managed By |
|------|----------|--------|------------|
| Conversation history | `~/.claude/projects/[path]/[session].jsonl` | JSONL | Claude Code (read-only for us) |
| Prompt templates | `[repo]/.claude/templates.yaml` | YAML | User |
| App settings | `~/.gogogadgetclaude/settings.json` | JSON | Our app |
| Last active project | Browser localStorage | String | Our app |

### 4.3 Data Models

```typescript
// Session (derived from JSONL files)
interface Session {
  id: string;                    // UUID from JSONL filename
  projectPath: string;           // Decoded from folder path
  projectName: string;           // Derived from projectPath
  startedAt: Date;               // First message timestamp
  lastActivityAt: Date;          // Last message timestamp
  messageCount: number;          // Total messages in session
  status: 'working' | 'waiting' | 'idle';
}

// Message (parsed from JSONL)
interface Message {
  id: string;                    // Generated or from JSONL
  sessionId: string;
  type: 'user' | 'assistant';
  content: string;               // May contain markdown
  timestamp: Date;
  toolUse?: ToolUseEvent[];      // File edits, commands, etc.
}

// ToolUseEvent (from JSONL tool_use entries)
interface ToolUseEvent {
  tool: string;                  // e.g., 'write_file', 'run_command'
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'complete' | 'error';
}

// Project (derived from ~/.claude/projects/ structure)
interface Project {
  path: string;                  // Full path to project
  name: string;                  // Basename of path
  encodedPath: string;           // Claude's encoded folder name
  sessionCount: number;
  lastSessionId?: string;
  lastActivityAt?: Date;
}

// Template (from .claude/templates.yaml)
interface Template {
  label: string;
  icon: string;
  prompt: string;
}

// FileChange (from git diff)
interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

// AppSettings (stored in ~/.gogogadgetclaude/settings.json)
interface AppSettings {
  notificationsEnabled: boolean;
  notificationPhoneNumber?: string;  // For iMessage
  defaultTemplates: Template[];
  theme: 'light' | 'dark' | 'system';
}
```

### 4.4 JSONL File Structure (Claude Code Format)

Claude Code stores conversations in JSONL format. Each line is a JSON object:

```jsonl
{"type":"user","message":"Build a hello world app","timestamp":"2024-01-15T10:30:00Z","sessionId":"abc-123","cwd":"/Users/me/project"}
{"type":"assistant","message":"I'll create a simple hello world app...","timestamp":"2024-01-15T10:30:05Z","sessionId":"abc-123"}
{"type":"tool_use","tool":"write_file","input":{"path":"hello.js","content":"console.log('Hello!')"},"timestamp":"2024-01-15T10:30:10Z"}
{"type":"tool_result","tool":"write_file","output":"File written successfully","timestamp":"2024-01-15T10:30:10Z"}
```

---

## 5. API Specification

### 5.1 API Design Philosophy

**Style:** REST  
**Versioning:** None (single-user local app, no versioning needed)  
**Base URL:** `http://[tailscale-hostname]:3456/api`

### 5.2 Authentication & Authorization

#### Authentication Method
**Type:** None

**Rationale:** Tailscale provides network-level authentication. Only devices on your personal Tailscale network can reach the server. This is sufficient security for a personal tool.

**Future (V2):** Okta OIDC for work account support (separate deployment).

### 5.3 Endpoint Groups

#### Group: Projects — `/api/projects`

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/api/projects` | List all projects with sessions | — | `Project[]` |
| GET | `/api/projects/:encodedPath` | Get single project details | — | `Project` |
| GET | `/api/projects/:encodedPath/templates` | Get prompt templates for project | — | `Template[]` |
| GET | `/api/projects/:encodedPath/files` | Get changed files (git status) | — | `FileChange[]` |
| GET | `/api/projects/:encodedPath/files/:filePath` | Get file diff | — | `FileDiff` |

#### Group: Sessions — `/api/sessions`

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/api/sessions` | List recent sessions (all projects) | — | `Session[]` |
| GET | `/api/sessions/:id` | Get session details | — | `Session` |
| GET | `/api/sessions/:id/messages` | Get messages (supports `?since=timestamp`) | — | `Message[]` |
| POST | `/api/sessions/:id/send` | Send prompt to session | `{ prompt: string }` | `{ success: boolean }` |
| POST | `/api/sessions/:id/stop` | Stop running agent | — | `{ success: boolean }` |
| POST | `/api/sessions/new` | Start new session | `{ projectPath: string, prompt?: string }` | `Session` |

#### Group: Transcription — `/api/transcribe`

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| POST | `/api/transcribe` | Transcribe audio to text | `multipart/form-data` with audio file | `{ text: string }` |

#### Group: Settings — `/api/settings`

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/api/settings` | Get app settings | — | `AppSettings` |
| PUT | `/api/settings` | Update app settings | `Partial<AppSettings>` | `AppSettings` |

#### Group: Status — `/api/status`

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/api/status` | Health check + current Claude status | — | `{ healthy: boolean, claudeRunning: boolean }` |

### 5.4 Request/Response Standards

#### Response Format
```typescript
// Success Response
{
  "data": T,  // The actual response data
  "meta"?: {  // Optional metadata
    "timestamp": string
  }
}

// Error Response
{
  "error": {
    "code": string,      // e.g., "SESSION_NOT_FOUND"
    "message": string    // Human-readable message
  }
}
```

#### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (resource created) |
| 400 | Invalid request (bad JSON, missing fields) |
| 404 | Resource not found (session, project, file) |
| 500 | Internal server error |

### 5.5 Rate Limiting

Not required for single-user local application.

---

## 6. External Integrations

### 6.1 Third-Party Services

| Service | Purpose | Integration Type | Criticality | Documentation |
|---------|---------|------------------|-------------|---------------|
| Tailscale | Network access phone → laptop | System install | Critical | [tailscale.com/kb](https://tailscale.com/kb) |
| Groq | Voice transcription (Whisper) | REST API | Important | [console.groq.com/docs](https://console.groq.com/docs) |
| Claude Code | Core functionality | CLI + filesystem | Critical | [docs.anthropic.com](https://docs.anthropic.com) |
| Git | Diff generation | CLI | Important | Built-in |

### 6.2 Integration Details

#### Integration: Tailscale

**Purpose:** Enables secure access to laptop server from phone over any network.

**Integration Pattern:** System-level VPN

**Setup:**
1. Install Tailscale on laptop: `brew install tailscale`
2. Install Tailscale app on iPhone
3. Sign in with same account on both
4. Laptop gets hostname like `your-macbook.tailnet-name.ts.net`

**Configuration:**
```bash
# No app-level config needed
# Tailscale runs as system service
```

**Testing:** `curl http://your-macbook.tailnet-name.ts.net:3456/api/status`

---

#### Integration: Groq Whisper API

**Purpose:** Transcribe voice input to text with high accuracy.

**Integration Pattern:** REST API

**Configuration:**
```bash
# Required environment variable
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

**Implementation Location:** `server/src/services/transcriptionService.ts`

**API Usage:**
```typescript
// POST https://api.groq.com/openai/v1/audio/transcriptions
// Content-Type: multipart/form-data
// - file: audio file (webm, mp3, wav, etc.)
// - model: "whisper-large-v3"
```

**Fallback:** Web Speech API in browser if Groq fails.

**Error Handling:**
- Rate limit exceeded: Return error, client uses Web Speech API fallback
- Invalid audio: Return error with "Try again" message
- Network error: Return error, client uses fallback

---

#### Integration: Claude Code CLI

**Purpose:** Send prompts to Claude Code, manage sessions.

**Integration Pattern:** CLI spawning via execa

**Key Commands:**
```bash
# Send prompt to existing session
claude -p "your prompt" --continue

# Start new session in directory
cd /path/to/project && claude -p "initial prompt"

# Resume specific session (if needed)
claude --continue --session-id <id>
```

**Implementation Location:** `server/src/services/claudeService.ts`

**Process Management:**
- Use `execa` for spawning
- Store PID for stop functionality
- Send SIGINT for graceful stop

---

#### Integration: macOS AppleScript (Notifications)

**Purpose:** Send iMessage notifications when Claude completes tasks.

**Integration Pattern:** CLI (`osascript`)

**Implementation:**
```bash
# Send iMessage via AppleScript
osascript -e 'tell application "Messages" to send "🤖 Task complete in ProjectName" to buddy "+1234567890"'
```

**Configuration:**
```bash
# In settings.json
{
  "notificationPhoneNumber": "+1234567890"
}
```

**Implementation Location:** `server/src/services/notificationService.ts`

**Claude Code Hook Setup:**
```json
// ~/.claude/settings.json (or equivalent)
{
  "hooks": {
    "Stop": ["curl -X POST http://localhost:3456/api/hooks/task-complete"]
  }
}
```

---

### 6.3 Environment Variable Dependencies

#### Required Variables

| Variable | Service | Required In | Description |
|----------|---------|-------------|-------------|
| `GROQ_API_KEY` | Groq | Server | API key for Whisper transcription |
| `PORT` | Server | Server | Server port (default: 3456) |

#### Environment Variable Template
```bash
# .env.example

# Server Configuration
PORT=3456
NODE_ENV=development

# Groq API (Voice Transcription)
# Get your key at: https://console.groq.com/keys
GROQ_API_KEY=gsk_your_api_key_here

# Notification Settings (optional, can be set in UI)
# NOTIFICATION_PHONE=+1234567890
```

---

## 7. Code Patterns & Conventions

### 7.1 Architectural Patterns

| Pattern | Where Used | Implementation |
|---------|------------|----------------|
| Service Layer | Backend | All business logic in `services/`, routes are thin |
| Repository Pattern (lite) | Backend | Services abstract data access (JSONL, git, etc.) |
| Custom Hooks | Frontend | Data fetching and state logic in `hooks/` |
| Container/Presentational | Frontend | Smart components use hooks, dumb components render |

### 7.2 Code Style Guidelines

**Language Style Guide:** ESLint recommended + Prettier

**Key Conventions:**
- Use `const` by default, `let` only when reassignment needed
- Prefer named exports over default exports (except pages/components)
- Use async/await over raw Promises
- Destructure props and function arguments
- Use early returns to reduce nesting

### 7.3 Error Handling Patterns

**Frontend:**
```typescript
// Using SWR for data fetching with error handling
const { data, error, isLoading } = useSWR('/api/sessions', fetcher);

if (error) return <ErrorState message="Failed to load sessions" onRetry={mutate} />;
if (isLoading) return <LoadingState />;
return <SessionList sessions={data} />;
```

**Backend:**
```typescript
// Service layer throws typed errors
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

// Route handler catches and formats
app.get('/api/sessions/:id', async (req, res, next) => {
  try {
    const session = await sessionManager.getSession(req.params.id);
    res.json({ data: session });
  } catch (error) {
    next(error); // Handled by error middleware
  }
});
```

### 7.4 State Management Patterns

**Global State (Zustand):**
```typescript
// stores/appStore.ts
interface AppState {
  currentProjectPath: string | null;
  setCurrentProject: (path: string) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProjectPath: localStorage.getItem('lastProject'),
  setCurrentProject: (path) => {
    localStorage.setItem('lastProject', path);
    set({ currentProjectPath: path });
  },
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));
```

**Server State (SWR):**
```typescript
// hooks/useConversation.ts
export function useConversation(sessionId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    sessionId ? `/api/sessions/${sessionId}/messages` : null,
    fetcher,
    { refreshInterval: 2000 } // Poll every 2 seconds
  );

  return { messages: data, error, isLoading, refresh: mutate };
}
```

### 7.5 Component Patterns

**Component Structure:**
```typescript
// components/conversation/MessageBubble.tsx
import { cn } from '@/lib/cn';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  
  return (
    <div
      className={cn(
        'rounded-lg p-3 max-w-[85%]',
        isUser ? 'bg-accent text-white ml-auto' : 'bg-surface',
        className
      )}
    >
      <p className="text-body">{message.content}</p>
      <time className="text-caption text-tertiary">
        {formatRelativeTime(message.timestamp)}
      </time>
    </div>
  );
}
```

**Props Interface Naming:** `ComponentNameProps`

**Component Composition:** Prefer composition over props drilling. Use children and render props where appropriate.

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────┐
│         Network Security                 │
│    (Tailscale encrypted tunnel)          │
├─────────────────────────────────────────┤
│        Transport Security                │
│   (WireGuard encryption via Tailscale)   │
├─────────────────────────────────────────┤
│       Application Security               │
│  (Input validation, path sanitization)   │
├─────────────────────────────────────────┤
│          Data Security                   │
│     (Local only, no cloud storage)       │
└─────────────────────────────────────────┘
```

### 8.2 Security Measures

| Threat | Mitigation | Implementation |
|--------|------------|----------------|
| Unauthorized Access | Tailscale network auth | Only Tailscale network members can reach server |
| Path Traversal | Sanitize file paths | Validate paths stay within allowed directories |
| Command Injection | Parameterized commands | Use execa with array args, not shell strings |
| XSS | React auto-escaping | Default React behavior, sanitize markdown |
| Sensitive Data Exposure | Local only | No cloud transmission of conversation data |

### 8.3 Sensitive Data Handling

| Data Type | Classification | Storage | Encryption | Retention |
|-----------|---------------|---------|------------|-----------|
| Conversations | Personal | Local filesystem | At-rest (OS-level) | User-controlled |
| Voice recordings | Personal | Transient (not stored) | In-transit (HTTPS to Groq) | Not retained |
| API keys | Sensitive | .env file | None (local only) | Indefinite |
| Phone number | Personal | settings.json | None (local only) | User-controlled |

### 8.4 Secret Management

**Tool:** dotenv + .env file  
**Rotation Policy:** Manual (API keys)  
**Access Control:** File system permissions (user-only read)

**Security Notes:**
- `.env` is gitignored
- API keys never sent to frontend
- All external API calls made server-side

---

## 9. Testing Architecture

### 9.1 Testing Pyramid

```
        ┌─────────┐
        │  E2E    │  ← Manual for MVP
        ├─────────┤
        │ Integr. │  ← API endpoint tests
        ├─────────┤
        │  Unit   │  ← Services, utilities
        └─────────┘
```

### 9.2 Testing Strategy by Layer

| Layer | Test Type | Tools | Coverage Target |
|-------|-----------|-------|-----------------|
| Frontend Components | Unit | Vitest + Testing Library | Key interactions |
| Frontend Hooks | Unit | Vitest + Testing Library | Data transformation |
| API Endpoints | Integration | Vitest + Supertest | All endpoints |
| Services | Unit | Vitest | Business logic |
| JSONL Parser | Unit | Vitest | All edge cases |
| E2E Flows | Manual | Real device | Critical paths |

### 9.3 Test File Organization

```
client/
└── src/
    ├── components/
    │   └── __tests__/           # Component tests
    ├── hooks/
    │   └── __tests__/           # Hook tests
    └── lib/
        └── __tests__/           # Utility tests

server/
└── src/
    ├── services/
    │   └── __tests__/           # Service tests
    ├── api/
    │   └── __tests__/           # API integration tests
    └── lib/
        └── __tests__/           # Parser/utility tests
```

### 9.4 Test Data Strategy

**Approach:** Fixtures + Mocks  
**JSONL Fixtures:** Sample JSONL files in `server/src/__fixtures__/`  
**API Mocking:** MSW for frontend tests  
**Git Mocking:** Mock simple-git in tests

---

## 10. Deployment Architecture

### 10.1 Environments

| Environment | Purpose | URL | Data |
|-------------|---------|-----|------|
| Development | Local dev | `localhost:3456` | Real JSONL files |
| Production | User's laptop | `[tailscale]:3456` | Real JSONL files |

Note: No staging environment needed for single-user local app.

### 10.2 Startup Flow

```bash
# One-time setup
git clone <repo>
cd gogogadgetclaude
pnpm install
cp .env.example .env
# Edit .env to add GROQ_API_KEY

# Configure Claude Code hooks (one-time)
./scripts/setup-hooks.sh

# Start development
pnpm dev          # Runs both client and server in dev mode

# Start production
pnpm build        # Build client
pnpm start        # Run server serving built client
```

### 10.3 Process Management

**Development:** `pnpm dev` runs both client (Vite) and server (tsx watch)

**Production Options:**
1. **Manual:** `pnpm start` in terminal
2. **LaunchAgent:** Auto-start on login (setup script provided)
3. **PM2:** `pm2 start server/dist/index.js` for process management

**LaunchAgent Setup (optional):**
```xml
<!-- ~/Library/LaunchAgents/com.gogogadgetclaude.server.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gogogadgetclaude.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/gogogadgetclaude/server/dist/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

---

## 11. Performance Considerations

### 11.1 Frontend Performance

| Metric | Target | Optimization Strategy |
|--------|--------|----------------------|
| Initial Load | < 1s | Vite code splitting, minimal bundle |
| Conversation Update | < 3s | SWR polling with 2s interval |
| Voice Transcription | < 5s | Groq API is fast, show loading state |
| Bundle Size | < 200KB | Tree shaking, minimal dependencies |

### 11.2 Backend Performance

| Metric | Target | Optimization Strategy |
|--------|--------|----------------------|
| API Response (p50) | < 100ms | JSONL parsing is fast, cache parsed sessions |
| File Watching | Real-time | chokidar is efficient |
| Git Diff | < 500ms | simple-git is fast for typical repos |

### 11.3 Caching Strategy

| Layer | Cache Type | TTL | Invalidation |
|-------|------------|-----|--------------|
| Browser | SWR cache | 2s refresh | Manual mutate or refetch |
| Server | In-memory session cache | 30s | File watcher triggers invalidation |

---

## 12. Scalability Architecture

### 12.1 Current Capacity

| Dimension | Current | Notes |
|-----------|---------|-------|
| Concurrent Users | 1 | Single-user local app |
| Projects | Unlimited | Limited by filesystem |
| Sessions per Project | Unlimited | Limited by ~/.claude storage |
| Message History | 10,000+ | JSONL scales well |

### 12.2 Scaling Considerations

This is a single-user local application. Scalability is not a concern. If future versions support multiple users (V2 work accounts), that would be a separate deployment with different architecture.

---

## 13. AI/LLM Integration Guidelines

> This section provides context for AI coding assistants (like Claude) working on this codebase.

### 13.1 Code Generation Preferences

**Preferred Patterns:**
- Functional components with hooks
- Named exports
- Service layer for business logic
- Zod for validation
- Early returns over nested conditionals

**Avoid:**
- Class components
- `any` type (use `unknown` and narrow)
- Direct DOM manipulation
- Inline styles (use Tailwind)
- Default exports (except for pages)

### 13.2 File Organization Rules

- New components go in: `client/src/components/[feature]/`
- New API routes go in: `server/src/api/`
- New services go in: `server/src/services/`
- New types go in: `shared/types/` or local `types/` folder
- Tests co-located: Yes, in `__tests__/` subfolder

### 13.3 Import Conventions

**Path Aliases:**
```typescript
// tsconfig.json paths
{
  "@/*": ["./src/*"],
  "@shared/*": ["../shared/*"]
}
```

**Import Order:**
1. External packages (`react`, `express`, etc.)
2. Internal packages (`@shared/*`)
3. Absolute imports (`@/*`)
4. Relative imports (`./`, `../`)

### 13.4 Common Tasks Reference

| Task | Files to Modify | Pattern to Follow |
|------|-----------------|-------------------|
| Add new API endpoint | `server/src/api/[name].ts`, `server/src/index.ts` | See existing routes |
| Add new component | `client/src/components/[feature]/[Name].tsx` | See `MessageBubble.tsx` |
| Add new service | `server/src/services/[name]Service.ts` | See `sessionManager.ts` |
| Add new hook | `client/src/hooks/use[Name].ts` | See `useConversation.ts` |
| Add shared type | `shared/types/index.ts` | Add to existing file |

### 13.5 Testing Requirements

- Unit tests required for: Services, utilities, complex hooks
- Integration tests required for: API endpoints
- Test file naming: `[name].test.ts`
- Minimum coverage: Focus on business logic, not UI

---

## Appendix A: Decision Log Reference

For architecture decisions and their rationale, see `decision_log.md`.

Key decisions affecting this architecture:
- **Tailscale over cloud hosting:** Keeps data local, free, simple
- **Polling over WebSockets:** Simpler, "good enough" for 2-3s updates
- **No database:** Claude manages data, we just read it
- **AppleScript for notifications:** Native, free, reliable on macOS

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| JSONL | JSON Lines format - one JSON object per line |
| Tailscale | VPN service that creates private networks between devices |
| Claude Code | Anthropic's CLI-based AI coding assistant |
| Session | A conversation with Claude Code (stored as one JSONL file) |
| Project | A directory with code that Claude Code works on |

---

## Appendix C: Related Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| Product Spec | What we're building | `product_spec.md` |
| Decision Log | Why we chose things | `decision_log.md` |
| Changelog | What changed | `changelog.md` |
| Project Status | Current progress | `project_status.md` |

---

*Last Updated: 2026-01-13*
