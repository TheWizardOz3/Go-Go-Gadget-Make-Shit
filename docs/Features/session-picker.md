# Feature: Session Picker

**Feature Owner:** MVP  
**Status:** ✅ Complete  
**Created:** 2026-01-14  
**Completed:** 2026-01-14  
**Dependencies:** JSONL Watcher Service ✅, Project Switcher ✅

---

## 1. Overview

### 1.1 User Story
> As a developer, I want to view and resume previous sessions, so I can continue work from earlier conversations.

### 1.2 Description
A modal/view for selecting from recent sessions within the current project. Shows session previews with first message snippet, timestamp, and message count. Allows resuming past sessions or starting a new one.

### 1.3 Success Metrics
- User can view all sessions for current project
- User can switch between sessions
- User can start a new session
- Last selected session persists across app refreshes

---

## 2. Requirements

### 2.1 Functional Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | List recent sessions for current project | P0 |
| 2 | Show session preview: first message snippet, timestamp, message count | P0 |
| 3 | Tap to select/resume session and view its conversation | P0 |
| 4 | "New Session" button to start fresh | P0 |
| 5 | Sessions ordered by most recent first | P0 |
| 6 | Current/active session visually highlighted | P1 |
| 7 | Search/filter sessions (if > 10 sessions) | P2 |

### 2.2 Non-Functional Requirements
- Session list loads within 1 second
- Smooth modal animation (consistent with ProjectPicker)
- Touch targets minimum 44×44px

---

## 3. Design

### 3.1 UI/UX Specifications

**Entry Point:**
- Tappable element in header showing current session info
- Located next to or below project name
- Shows truncated first message or "Session from [time]"

**Session Picker Modal:**
- Full-screen modal sliding up from bottom (same as ProjectPicker)
- Header: "Select Session" with close button and count
- "New Session" button at top (prominent action)
- Scrollable list of sessions
- Search input if > 10 sessions

**Session List Item:**
- First message preview (truncated to ~60 chars)
- Relative timestamp ("2h ago", "Yesterday")
- Message count badge
- Selected state indicator (checkmark or highlight)

**Empty State:**
- Message: "No sessions yet"
- Guidance: "Start a conversation with Claude to create a session"

### 3.2 Component Hierarchy

```
SessionPicker (modal)
├── Header
│   ├── Title ("Select Session")
│   ├── Count badge
│   └── Close button
├── NewSessionButton
├── SearchInput (conditional: > 10 sessions)
└── SessionList
    └── SessionListItem (repeated)
        ├── Preview text
        ├── Timestamp
        ├── Message count
        └── Selected indicator
```

### 3.3 State Management
- `selectedSession` - already exists in App.tsx
- `isSessionPickerOpen` - new boolean for modal state
- Persist `selectedSession` to localStorage (key: `gogogadgetclaude:lastSession:{projectPath}`)

---

## 4. Technical Design

### 4.1 API Changes

**Enhance Session Summary Response:**

Current `SessionSummary` type:
```typescript
interface SessionSummary {
  id: string;
  filePath: string;
  startedAt: Date | null;
  lastActivityAt: Date | null;
  messageCount: number;
}
```

Enhanced to add preview:
```typescript
interface SessionSummary {
  id: string;
  filePath: string;
  startedAt: Date | null;
  lastActivityAt: Date | null;
  messageCount: number;
  preview: string | null;  // NEW: First user message (truncated)
}
```

**New Session Endpoint (implement existing stub):**

`POST /api/sessions/new`
```typescript
// Request
{ projectPath: string, prompt?: string }

// Response
{ 
  success: boolean,
  sessionId: string,
  pid?: number 
}
```

### 4.2 Backend Changes

1. **projectScanner.ts** - Add preview extraction to `getSessionsForProject()`
2. **claudeService.ts** - Implement `startNewSession()` function
3. **sessions.ts** - Complete the `POST /sessions/new` handler

### 4.3 Frontend Changes

1. **New Components:**
   - `SessionPicker.tsx` - Modal component
   - `SessionListItem.tsx` - Individual session row

2. **Modified Components:**
   - `App.tsx` - Add session picker trigger in header, modal state

3. **Hooks:**
   - Enhance `useSessions.ts` if needed (may work as-is)

### 4.4 Data Flow

```
1. User taps session indicator in header
2. SessionPicker modal opens
3. useSessions hook fetches /api/projects/:path/sessions
4. API reads JSONL files, extracts first message preview
5. User selects session → setSelectedSession()
6. ConversationView loads selected session's messages
7. Session ID persisted to localStorage
```

---

## 5. Implementation Summary

### Files Created
| File | Purpose |
|------|---------|
| `client/src/components/session/SessionListItem.tsx` | Individual session row component |
| `client/src/components/session/SessionListItem.test.tsx` | 16 unit tests |
| `client/src/components/session/SessionPicker.tsx` | Modal for session selection |
| `client/src/components/session/SessionPicker.test.tsx` | 23 unit tests |
| `client/src/components/session/index.ts` | Barrel export |

### Files Modified
| File | Changes |
|------|---------|
| `shared/types/index.ts` | Added `preview` field to `SessionSummary` |
| `server/src/lib/jsonlParser.ts` | Added `getFirstUserMessagePreview()` function |
| `server/src/lib/jsonlParser.test.ts` | Added 10 unit tests for preview extraction |
| `server/src/services/projectScanner.ts` | Integrated preview extraction into session scanning |
| `server/src/services/claudeService.ts` | Added `startNewSession()` function |
| `server/src/api/sessions.ts` | Implemented `POST /api/sessions/new` endpoint |
| `client/src/App.tsx` | Two-row header, modal integration, localStorage persistence |

### Test Coverage
- **49 new tests added** (195 → 244 total)
- SessionListItem: 16 tests (rendering, selection, interaction, accessibility)
- SessionPicker: 23 tests (visibility, list, empty state, search, closing, accessibility)
- getFirstUserMessagePreview: 10 tests (content extraction, truncation, edge cases)

---

## 6. Test Plan ✅

### 6.1 Unit Tests (Completed)
- ✅ `SessionListItem.test.tsx` - 16 tests covering rendering, selection, interaction, accessibility
- ✅ `SessionPicker.test.tsx` - 23 tests covering modal, search, empty states, accessibility
- ✅ `jsonlParser.test.ts` - 10 new tests for `getFirstUserMessagePreview()`
- ✅ `formatters.ts` - relative time formatting (existing tests)

### 6.2 Integration Tests
- ✅ `GET /api/projects/:path/sessions` - verified returns sessions with preview field
- ✅ `POST /api/sessions/new` - endpoint implemented and tested

### 6.3 Manual Testing (Completed)
- ✅ Open session picker with various session counts
- ✅ Verified search appears only when > 10 sessions
- ✅ Tested session switching
- ✅ Tested New Session button functionality
- ✅ Verified localStorage persistence across refreshes
- ⏳ Test on real iPhone Safari (deferred to device testing)

---

## 7. Edge Cases

| Case | Handling |
|------|----------|
| No sessions for project | Show empty state with guidance |
| Session with no user messages | Show "Empty session" as preview |
| Very long first message | Truncate to 100 chars with ellipsis |
| Session file deleted while viewing | Show error, offer refresh |
| New session fails to start | Show error toast, keep picker open |
| Many sessions (100+) | Virtual scrolling (future enhancement) |

---

## 8. Cross-Environment Session Visibility (Phase 1)

**Added:** 2026-01-19

### 8.1 Overview

Sessions from both local (laptop) and cloud (Modal) environments are now merged into a single unified list. This enables users to:
- See all sessions for a project regardless of where they were executed
- Distinguish between local and cloud sessions with visual badges
- Continue work seamlessly across environments

### 8.2 Implementation

**New Type Fields:**
- `projectIdentifier` - Git remote URL or project name for cross-environment matching
- `source` - Either `'local'` or `'cloud'` to indicate session origin
- `continuedFrom` - (Phase 2 prep) Tracks when a session continues from another environment

**Session Matching Logic:**
1. **Primary:** Match by `projectIdentifier` (git remote URL) for accurate cross-repo matching
2. **Fallback:** Match by extracted project name from paths

**UI Enhancements:**
- Source badges (green for local, violet for cloud) shown on all sessions
- Session count breakdown in picker header (e.g., "3 local · 2 cloud")
- Merged session list sorted by most recent activity

### 8.3 Files Modified
- `shared/types/index.ts` - Added `projectIdentifier`, `source`, `continuedFrom` fields
- `server/src/services/projectScanner.ts` - Include git remote URL in session scanning
- `client/src/hooks/useSessions.ts` - Improved session merging with projectIdentifier
- `client/src/components/session/SessionListItem.tsx` - Show source badge for all sessions
- `client/src/components/session/SessionPicker.tsx` - Display source counts in header
- `client/src/App.tsx` - Pass counts to SessionPicker

---

## 9. Context Continuation (Phase 2)

**Added:** 2026-01-20

### 9.1 Overview

Users can now continue sessions from one environment to another (local → cloud or cloud → local) with automatic context transfer. When continuing a session, a compact summary of the conversation is generated and injected as a preamble to the new session.

### 9.2 User Flow

1. User views session list with sessions from both environments
2. User clicks the "Continue in..." button (arrow + target environment icon) on a session
3. System fetches context summary from the source environment
4. Context preamble is injected into the prompt input
5. Session picker closes, user is on the conversation tab with context pre-filled
6. User can optionally add to the prompt before sending to start new session with context

### 9.3 Context Summary Format

```
=== CONTEXT FROM PREVIOUS SESSION ===
Project: {projectName}
Source: {Local laptop | Cloud (Modal)}
Session: {sessionId}...
Messages: {count}

--- Summary ---
Topic: {first user message}
Message counts: {x} user, {y} assistant
Tools used: {tool(count), ...}

--- Recent Messages ---
[{n}] User:
{content}

[{n+1}] Assistant:
{content}
...

=== END PREVIOUS CONTEXT ===

Please continue from where this session left off.
```

### 9.4 API Endpoints

**Local Server:**
```
GET /api/sessions/:id/context-summary?source=local|cloud
```

**Modal Cloud:**
```
GET /api/sessions/{session_id}/context-summary?encoded_path=...
```

### 9.5 Files Added/Modified

**New Files:**
- `server/src/services/contextSummaryService.ts` - Context summary generation
- `client/src/hooks/useContextContinuation.ts` - Client hook for continuation flow

**Modified Files:**
- `server/src/api/sessions.ts` - Added `/context-summary` endpoint
- `modal/modal_app.py` - Added `get_context_summary()` and API endpoint
- `shared/types/index.ts` - Added `ContextSummary` interface
- `client/src/components/session/SessionListItem.tsx` - Added "Continue in..." button
- `client/src/components/session/SessionPicker.tsx` - Pass continuation props
- `client/src/App.tsx` - Handle continuation flow

### 9.6 Visibility Conditions

The "Continue in..." action is only visible when:
- Sessions exist in BOTH environments (local and cloud)
- This ensures there's a meaningful target environment

---

## 10. Future Enhancements

- Swipe to delete session
- Session rename/labeling
- Session pinning/favorites
- Multi-select for batch operations
- Virtual scrolling for large session lists

---

## 11. Open Questions

1. ~~Should "New Session" require an initial prompt, or start empty?~~ → Start with optional prompt (can be empty)
2. ~~Should we show session status (working/waiting/idle) in the list?~~ → Nice to have, not MVP
3. ~~What happens to selected session when project changes?~~ → Reset to most recent (existing behavior)

---

## 12. References

- [Product Spec - Session Picker](../product_spec.md#feature-session-picker)
- [Architecture - API Endpoints](../architecture.md#53-endpoint-groups)
- [Project Switcher Feature](./project-switcher.md) - Similar UI pattern

