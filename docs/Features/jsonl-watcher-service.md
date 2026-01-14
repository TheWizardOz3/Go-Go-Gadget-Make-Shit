# Feature Spec: JSONL Watcher Service

## 1. Overview

### 1.1 One-Line Summary

Parse Claude Code's JSONL session files to provide real-time conversation data and status tracking for the mobile web interface.

### 1.2 User Story

> As a **developer using GoGoGadgetClaude**, I want to **see my Claude Code conversation in real-time on my phone**, so that **I can monitor what the agent is doing while away from my laptop**.

### 1.3 Problem Statement

Claude Code stores all conversation data in JSONL files under `~/.claude/projects/`. The mobile app needs to:
1. Discover which projects have Claude Code sessions
2. Parse the JSONL format to extract messages, tool usage, and status
3. Detect when new messages arrive (file watching)
4. Determine agent status (working/waiting/idle)

Without this data layer, no conversation viewing, status indicators, or session management features can work.

### 1.4 Business Value

- **User Impact:** Enables the core value proposition—seeing what Claude is doing from your phone
- **Business Impact:** This is the foundational data layer; all user-facing features depend on it
- **Technical Impact:** Establishes patterns for JSONL parsing, file watching, and session state management

---

## 2. Scope & Requirements

### 2.1 Functional Requirements

| ID   | Requirement | Priority | Notes |
|------|-------------|----------|-------|
| FR-1 | Parse Claude Code JSONL format (user messages, assistant responses, tool usage) | MUST | Core parsing logic |
| FR-2 | Scan `~/.claude/projects/` to discover projects with sessions | MUST | Project discovery |
| FR-3 | Decode Claude's path encoding scheme for project folder names | MUST | `/Users/me/project` → encoded format |
| FR-4 | List sessions for a project (sorted by recency) | MUST | Session picker needs this |
| FR-5 | Get messages for a session with optional `since` filter | MUST | Efficient polling support |
| FR-6 | Detect agent status: working, waiting, idle | MUST | Status indicator depends on this |
| FR-7 | Watch JSONL files for changes and invalidate cache | SHOULD | Real-time updates |
| FR-8 | Handle malformed JSONL lines gracefully (skip, log warning) | MUST | Resilience |

### 2.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Parse Time | < 100ms for 1000 messages | Manual testing |
| Memory | Cache limited to active sessions | Code review |
| Resilience | No crashes from malformed data | Test with edge cases |

### 2.3 Acceptance Criteria

- [x] **Given** a project with Claude Code sessions, **when** calling `GET /api/projects`, **then** the project appears in the list with session count
- [x] **Given** a session with messages, **when** calling `GET /api/sessions/:id/messages`, **then** messages are returned in chronological order with proper typing
- [x] **Given** a session where Claude is actively generating, **when** checking status, **then** status is "working"
- [x] **Given** a session where Claude finished and awaits input, **when** checking status, **then** status is "waiting"
- [x] **Given** no Claude process running for a session, **when** checking status, **then** status is "idle"
- [x] **Given** a JSONL file with malformed lines, **when** parsing, **then** valid lines are parsed and malformed lines are skipped with a warning

### 2.4 Out of Scope

- Writing to JSONL files (Claude Code owns these, we only read)
- Sending prompts to Claude (that's the Claude Service feature)
- Git diff generation (that's Files Changed feature)
- UI components (that's Conversation View UI feature)
- Voice transcription

---

## 3. User Experience

### 3.1 User Flow

This is a backend service, not directly user-facing. The flow for developers using the API:

```
API Request → Session Manager → JSONL Parser → File System
                    ↓
              Cache (if hit)
```

**Data Flow:**
1. React app calls `/api/projects` to list available projects
2. User selects project, app calls `/api/sessions` for that project
3. User selects session, app calls `/api/sessions/:id/messages`
4. App polls every 2-3 seconds with `?since=timestamp` for new messages
5. Status indicator uses session status from message parsing

---

## 4. Technical Approach

### 4.1 Architecture Fit

**Affected Areas:**
| Area | Impact | Description |
|------|--------|-------------|
| Frontend | NONE | No frontend changes in this feature |
| Backend | NEW | New services: `sessionManager.ts`, `jsonlParser.ts`, `projectScanner.ts`, `fileWatcher.ts` |
| Database | NONE | Reading Claude's JSONL files (no DB) |
| External Services | NONE | No external services |

**Alignment with Existing Patterns:**
- Follows service layer pattern from `architecture.md` Section 3
- Uses data models defined in `architecture.md` Section 4
- Implements API endpoints defined in `architecture.md` Section 5
- Uses chokidar for file watching as specified in tech stack

### 4.2 Key Implementation Details

**Claude Code JSONL Format:**
```jsonl
{"type":"user","message":{"role":"user","content":"Build a hello world app"},"timestamp":"2024-01-15T10:30:00Z","sessionId":"abc-123","cwd":"/Users/me/project"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I'll create..."}]},"timestamp":"2024-01-15T10:30:05Z"}
{"type":"tool_use","tool":"write_file","input":{"path":"hello.js","content":"console.log('Hello!')"},"timestamp":"2024-01-15T10:30:10Z"}
{"type":"tool_result","tool":"write_file","result":"File written","timestamp":"2024-01-15T10:30:10Z"}
```

**Path Encoding Scheme:**
Claude encodes project paths for folder names by replacing `/` with `-`:
- `/Users/derek/myproject` → `-Users-derek-myproject`

**Important Discovery:** This encoding is NOT reversible since directory names can contain hyphens. For example:
- `/Users/derek/Doubleo/agents-dev` → `-Users-derek-Doubleo-agents-dev`
- Naive decoding would incorrectly produce `/Users/derek/Doubleo/agents/dev`

**Solution:** Extract the actual project path from the JSONL `cwd` field instead of decoding the folder name. Falls back to folder decoding only if JSONL files are empty.

**Status Detection Logic:**
```typescript
function detectStatus(messages: Message[], isClaudeRunning: boolean): Status {
  if (!isClaudeRunning) return 'idle';
  
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.type === 'assistant' && !hasPendingToolUse(messages)) {
    return 'waiting';
  }
  return 'working';
}
```

**File Structure:**
```
server/src/
├── services/
│   ├── sessionManager.ts    # Main service: sessions, messages, status
│   └── projectScanner.ts    # Scan ~/.claude/projects/
├── lib/
│   ├── jsonlParser.ts       # Parse JSONL format
│   ├── pathEncoder.ts       # Encode/decode Claude path format
│   └── fileWatcher.ts       # chokidar wrapper
```

---

## 5. Implementation Tasks

### Task 1: Create JSONL parser library
**Estimated Time:** 45 min  
**Description:** Create a parser for Claude Code's JSONL format that extracts messages and tool usage.

**Deliverables:**
- `server/src/lib/jsonlParser.ts` - Parse JSONL file into typed messages
- Handle all message types: user, assistant, tool_use, tool_result
- Skip malformed lines with warning (don't crash)
- TypeScript types for parsed structures

**Key Functions:**
```typescript
export function parseJsonlFile(filePath: string): Promise<RawJsonlEntry[]>
export function transformToMessages(entries: RawJsonlEntry[]): Message[]
```

**Files Created:**
- `server/src/lib/jsonlParser.ts`

---

### Task 2: Create path encoder/decoder utility
**Estimated Time:** 30 min  
**Description:** Utility to encode/decode Claude's project path format used in `~/.claude/projects/`.

**Deliverables:**
- `server/src/lib/pathEncoder.ts` - Encode and decode project paths
- Reverse engineer Claude's encoding scheme from existing folders
- Handle edge cases (spaces, special characters)

**Key Functions:**
```typescript
export function encodePath(absolutePath: string): string
export function decodePath(encodedPath: string): string
export function getProjectName(absolutePath: string): string
```

**Files Created:**
- `server/src/lib/pathEncoder.ts`

---

### Task 3: Create project scanner service
**Estimated Time:** 45 min  
**Description:** Service to scan `~/.claude/projects/` and list all projects with sessions.

**Deliverables:**
- `server/src/services/projectScanner.ts` - Scan and list projects
- Return project metadata: path, name, session count, last activity
- Sort by most recently active

**Key Functions:**
```typescript
export async function scanProjects(): Promise<Project[]>
export async function getProject(encodedPath: string): Promise<Project | null>
export async function getSessionsForProject(encodedPath: string): Promise<SessionSummary[]>
```

**Files Created:**
- `server/src/services/projectScanner.ts`

---

### Task 4: Create session manager service
**Estimated Time:** 60 min  
**Description:** Main service for loading sessions, getting messages, and tracking status.

**Deliverables:**
- `server/src/services/sessionManager.ts` - Session data access
- Load and parse session JSONL files
- Support `since` parameter for efficient polling
- Detect and return session status (working/waiting/idle)
- Basic in-memory cache for parsed sessions

**Key Functions:**
```typescript
export async function getSession(sessionId: string): Promise<Session | null>
export async function getMessages(sessionId: string, since?: Date): Promise<Message[]>
export async function getSessionStatus(sessionId: string): Promise<SessionStatus>
```

**Files Created:**
- `server/src/services/sessionManager.ts`

---

### Task 5: Create file watcher service
**Estimated Time:** 30 min  
**Description:** Watch `~/.claude/projects/` for changes and notify session manager to invalidate cache.

**Deliverables:**
- `server/src/lib/fileWatcher.ts` - chokidar wrapper for JSONL watching
- Watch for file changes and additions
- Emit events that session manager can subscribe to
- Debounce rapid changes

**Key Functions:**
```typescript
export function startWatching(): void
export function stopWatching(): void
export function onSessionChange(callback: (sessionId: string) => void): void
```

**Files Created:**
- `server/src/lib/fileWatcher.ts`

---

### Task 6: Wire up Projects API endpoints
**Estimated Time:** 30 min  
**Description:** Connect the placeholder projects routes to the new services.

**Deliverables:**
- Update `server/src/api/projects.ts` to use projectScanner service
- Implement `GET /api/projects` - list all projects
- Implement `GET /api/projects/:encodedPath` - get project details

**Files Modified:**
- `server/src/api/projects.ts`

---

### Task 7: Wire up Sessions API endpoints
**Estimated Time:** 45 min  
**Description:** Connect the placeholder sessions routes to the new services.

**Deliverables:**
- Update `server/src/api/sessions.ts` to use sessionManager service
- Implement `GET /api/sessions` - list recent sessions
- Implement `GET /api/sessions/:id` - get session details
- Implement `GET /api/sessions/:id/messages` - get messages with `?since=` support

**Files Modified:**
- `server/src/api/sessions.ts`

---

### Task 8: Add shared types for Session/Message/Project
**Estimated Time:** 20 min  
**Description:** Add TypeScript types to shared package for use by both client and server.

**Deliverables:**
- Update `shared/types/index.ts` with Session, Message, Project, ToolUseEvent types
- Ensure types match architecture.md data models

**Files Modified:**
- `shared/types/index.ts`

---

## 6. Test Plan

### Unit Tests
- JSONL parser with valid input
- JSONL parser with malformed lines (should skip, not crash)
- Path encoder/decoder round-trip
- Status detection logic for working/waiting/idle states
- Message transformation from raw JSONL entries

### Integration Tests
- Project scanner finds projects in mock ~/.claude/projects/
- Session manager loads and caches session data
- API endpoints return expected shapes
- `since` parameter filters messages correctly

### Manual Testing
- Point at real ~/.claude/projects/ with actual Claude Code sessions
- Verify projects are discovered and displayed correctly
- Verify messages parse correctly (user, assistant, tool_use)
- Verify status detection matches Claude Code's actual state

---

## 7. Dependencies

### Upstream Dependencies
- [x] Project Scaffolding complete
- [x] API Server Setup complete (middleware, router structure, validation)

### Downstream Dependents
- **Conversation View UI** - needs `/api/sessions/:id/messages`
- **Status Indicator** - needs session status
- **Project Switcher** - needs `/api/projects`
- **Session Picker** - needs `/api/projects/:path/sessions`
- **Quick Templates** - needs project-level API (templates will be added in separate feature)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Claude Code JSONL format changes | Low | High | Log warnings for unknown message types; graceful degradation |
| Path encoding scheme unknown | Medium | Medium | Inspect actual ~/.claude/projects/ folders to reverse engineer |
| Large session files cause slowness | Medium | Medium | Implement `since` filtering to avoid re-parsing entire file |
| File watcher misses rapid changes | Low | Low | Debounce + periodic full refresh as fallback |

---

## 9. Implementation Summary

**Status:** ✅ Complete

### Files Created
| File | Purpose |
|------|---------|
| `server/src/lib/jsonlParser.ts` | Parse JSONL format, transform to Messages, extract metadata |
| `server/src/lib/pathEncoder.ts` | Encode/decode Claude's path format, get project names |
| `server/src/lib/fileWatcher.ts` | Watch JSONL files for changes using chokidar |
| `server/src/services/projectScanner.ts` | Scan ~/.claude/projects/, list projects and sessions |
| `server/src/services/sessionManager.ts` | Session loading, caching, status detection |

### Files Modified
| File | Changes |
|------|---------|
| `server/src/api/projects.ts` | Implemented list/get projects, get sessions for project |
| `server/src/api/sessions.ts` | Implemented list sessions, get messages with `?since=` |
| `server/src/index.ts` | Integrated file watcher with cache invalidation |
| `server/package.json` | Added `chokidar` dependency |

### Key Implementation Notes
1. **Caching:** In-memory cache with 30s TTL for sessions, 5min TTL for project list
2. **File Watching:** Uses chokidar with `awaitWriteFinish` to debounce rapid changes
3. **Path Resolution:** Extracts actual path from JSONL `cwd` field (not folder name decoding)
4. **Status Detection:** Checks Claude process, pending tool_use, and last message type
5. **Message Filtering:** Excludes `file-history-snapshot`, `isMeta`, and `isApiErrorMessage` entries

### API Endpoints Implemented
- `GET /api/projects` - List all projects with session counts
- `GET /api/projects/:encodedPath` - Get single project details
- `GET /api/projects/:encodedPath/sessions` - List sessions for a project
- `GET /api/sessions` - List recent sessions across all projects
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/:id/messages` - Get messages with optional `?since=` filter
- `GET /api/sessions/:id/status` - Get session status (working/waiting/idle)

---

*Created: 2026-01-14*  
*Completed: 2026-01-14*

