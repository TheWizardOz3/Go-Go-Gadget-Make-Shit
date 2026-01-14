# Feature: Stop Button

**Status:** Complete  
**Priority:** P0 (MVP)  
**Dependencies:** API Server Setup ✅  
**Feature Doc Created:** 2026-01-14

---

## Overview

### User Story

> As a developer, I want to immediately stop Claude Code if it's going off the rails, so I can prevent unwanted changes to my code.

### Description

An emergency stop button that kills the Claude Code process immediately. This is a safety-critical feature that allows users to halt a runaway agent before it makes unwanted changes. Speed is essential—the stop action should be a single tap with no confirmation modal.

### Key Requirements (from Product Spec)

- [x] Prominent stop button visible when agent is working
- [x] Single tap to stop (no confirmation modal—speed matters)
- [x] Sends SIGINT/SIGTERM to Claude Code process
- [x] Visual feedback when stop is triggered
- [x] Status updates to "Idle" after stop

### Acceptance Criteria

- [x] Given Claude Code is running, when I tap stop, then the process terminates within 1 second
- [x] Given I tap stop, when the process terminates, then status changes to "Idle"
- [x] Given Claude Code is idle/waiting, when viewing the app, then stop button is hidden or disabled

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────┐     ┌─────────────────────────────────────────┐
│  Frontend               │     │  Backend                                │
│                         │     │                                         │
│  ┌───────────────────┐  │     │  ┌─────────────────────────────────┐   │
│  │ StopButton        │  │────►│  │ POST /api/sessions/:id/stop     │   │
│  │ (visible when     │  │     │  └──────────────┬──────────────────┘   │
│  │  working)         │  │     │                 │                       │
│  └───────────────────┘  │     │                 ▼                       │
│                         │     │  ┌─────────────────────────────────┐   │
│  ┌───────────────────┐  │     │  │ processManager.ts               │   │
│  │ useStopAgent      │  │     │  │ - trackProcess(sessionId, pid)  │   │
│  │ hook              │  │     │  │ - stopProcess(sessionId)        │   │
│  └───────────────────┘  │     │  │ - getActiveProcess(sessionId)   │   │
│                         │     │  └──────────────┬──────────────────┘   │
└─────────────────────────┘     │                 │                       │
                                │                 ▼                       │
                                │  ┌─────────────────────────────────┐   │
                                │  │ Claude Code Process             │   │
                                │  │ (receives SIGINT → terminates)  │   │
                                │  └─────────────────────────────────┘   │
                                └─────────────────────────────────────────┘
```

### Process Management Strategy

The key challenge is tracking Claude Code processes so we can stop them. Since our server spawns claude processes in `sendPrompt()`, we need to:

1. **Track active processes:** Store PID → sessionId mapping when spawning
2. **Clean up on exit:** Remove from tracking when process exits naturally
3. **Stop on demand:** Send SIGINT (graceful) then SIGTERM (forceful) if needed

### Signal Handling

```typescript
// Order of signals to try:
// 1. SIGINT (Ctrl+C equivalent) - allows Claude to clean up
// 2. SIGTERM (if SIGINT doesn't work within 2 seconds) - forceful termination
// 3. SIGKILL (last resort after another 2 seconds) - immediate kill
```

### API Endpoint

```
POST /api/sessions/:id/stop

Response (success):
{
  "data": {
    "success": true,
    "sessionId": "abc-123",
    "processKilled": true
  }
}

Response (no active process):
{
  "data": {
    "success": true,
    "sessionId": "abc-123",
    "processKilled": false,
    "message": "No active Claude process for this session"
  }
}
```

### UI/UX Design

**Button Placement:** Next to the send button in the `PromptInput` area

**Visual States:**
- Hidden/not rendered when status is not 'working'
- Prominent red stop button (square icon like media stop) when working
- Disabled state briefly during stop action
- Success feedback: toast "Agent stopped"

**Button Specifications:**
- Size: 44×44px minimum (matching send button)
- Color: `--color-error` (red)
- Icon: Square (stop) icon
- Haptic feedback on tap (if available)

---

## Implementation Tasks

### Task 1: Add Process Tracking Module ✅
**Estimate:** 30 min  
**File:** `server/src/services/processManager.ts`

Create a new service to track active Claude processes by session ID:

- [x] Create `ProcessInfo` interface (pid, sessionId, startedAt)
- [x] Create in-memory Map to store active processes
- [x] Implement `trackProcess(sessionId: string, pid: number)`
- [x] Implement `untrackProcess(sessionId: string)`
- [x] Implement `getActiveProcess(sessionId: string): ProcessInfo | null`
- [x] Implement `hasActiveProcess(sessionId: string): boolean`
- [x] Export functions for use by claudeService and sessions API

---

### Task 2: Integrate Process Tracking into claudeService ✅
**Estimate:** 30 min  
**File:** `server/src/services/claudeService.ts`

Update `sendPrompt` to track the spawned process and clean up on exit:

- [x] Import process tracking functions from `processManager`
- [x] After spawning, call `trackProcess(sessionId, pid)`
- [x] Attach exit handler to untrack process when it exits naturally
- [x] Handle case where process exits with error
- [x] Update return type to include tracking status

---

### Task 3: Implement stopAgent Function ✅
**Estimate:** 45 min  
**File:** `server/src/services/claudeService.ts`

Add the `stopAgent` function with graceful shutdown:

- [x] Create `StopAgentOptions` interface
- [x] Create `StopAgentResult` interface
- [x] Check if session has active process via `processManager`
- [x] If no active process, return success with `processKilled: false`
- [x] Send SIGINT first (graceful shutdown)
- [x] Wait up to 2 seconds for process to exit
- [x] If still running, send SIGTERM
- [x] Wait up to 2 more seconds
- [x] If still running, send SIGKILL as last resort
- [x] Return result indicating success/failure and method used
- [x] Add comprehensive logging for debugging

---

### Task 4: Implement Stop Endpoint ✅
**Estimate:** 20 min  
**File:** `server/src/api/sessions.ts`

Replace the placeholder stop endpoint with real implementation:

- [x] Import `stopAgent` from `claudeService`
- [x] Validate session exists before attempting stop
- [x] Call `stopAgent` with session ID
- [x] Return appropriate response based on result
- [x] Handle errors gracefully with proper error codes

---

### Task 5: Create useStopAgent Hook ✅
**Estimate:** 30 min  
**File:** `client/src/hooks/useStopAgent.ts`

Create a React hook for calling the stop API:

- [x] Create hook that accepts `sessionId`
- [x] Implement `stopAgent` async function
- [x] Track `isStopping` loading state
- [x] Track `error` state
- [x] Return `{ stopAgent, isStopping, error }`
- [x] Add optimistic UI update (immediately mutate status to 'idle')
- [x] Trigger conversation refresh after successful stop

---

### Task 6: Create StopButton Component ✅
**Estimate:** 45 min  
**File:** `client/src/components/conversation/StopButton.tsx`

Create the stop button UI component:

- [x] Create component that accepts `onStop`, `isStopping`, `disabled` props
- [x] Implement red stop button with square icon
- [x] Add disabled state styling
- [x] Add loading spinner when stopping
- [x] Size: 44×44px to match send button
- [x] Add haptic feedback on tap (navigator.vibrate if available)
- [x] Ensure touch-friendly (no accidental taps)
- [x] Add aria-label for accessibility

---

### Task 7: Integrate StopButton into PromptInput ✅
**Estimate:** 30 min  
**Files:** `client/src/components/conversation/PromptInput.tsx`, `ConversationView.tsx`

Add the stop button to the input area:

- [x] Update `PromptInputProps` to accept `status`, `onStop`, `isStopping`
- [x] Conditionally render StopButton when `status === 'working'`
- [x] Position stop button to the right of the text input
- [x] When stop button visible, send button should be hidden/replaced
- [x] Update ConversationView to pass stop-related props
- [x] Wire up `useStopAgent` hook in ConversationView
- [x] Add success toast after stopping ("Agent stopped")

---

## Test Plan

### Unit Tests

**processManager.ts:**
- Track and untrack process
- Get active process returns correct data
- hasActiveProcess returns correct boolean
- Multiple sessions tracked independently

**claudeService.ts (stopAgent):**
- Returns success with processKilled: false when no active process
- Sends SIGINT to active process
- Escalates to SIGTERM if SIGINT doesn't work
- Returns correct result based on signal used

**useStopAgent.ts:**
- Calls API with correct session ID
- Sets isStopping during request
- Clears isStopping on success
- Handles error state

### Integration Tests

**POST /api/sessions/:id/stop:**
- Returns 404 for non-existent session
- Returns success with processKilled: false when no active process
- Returns success with processKilled: true when process was running

### Manual Testing

- [ ] Start Claude working on a task
- [ ] While working, tap stop button
- [ ] Verify process stops within 1-2 seconds
- [ ] Verify status changes to idle
- [ ] Verify conversation reflects stopped state
- [ ] Test stop when no process running (should handle gracefully)
- [ ] Test rapid stop button taps (should debounce)
- [ ] Test on real iPhone Safari

---

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| No active Claude process | Return success with `processKilled: false` |
| Process doesn't respond to SIGINT | Escalate to SIGTERM, then SIGKILL |
| Session doesn't exist | Return 404 error |
| Process exits during stop request | Handle gracefully, return success |
| Network error during stop | Show error toast, allow retry |
| Rapid button taps | Disable button during stop operation |

---

## UI/UX Notes

From product spec:
- Red stop button (square icon, like media stop)
- Only visible/enabled when status is "Working"
- Haptic feedback on tap
- Toast confirmation: "Agent stopped"
- No confirmation modal—speed matters

**Animation considerations:**
- Button should appear/disappear smoothly when status changes
- Loading spinner while stopping (brief, usually <1s)

---

## Technical Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Process doesn't respond to signals | Escalate SIGINT → SIGTERM → SIGKILL |
| Partial file writes when stopped | Document as known behavior; git can recover |
| PID tracking gets out of sync | Clean up on process exit; refresh on server restart |
| Race condition: stop while process starting | Check process exists before sending signals |

---

## Dependencies

- **API Server Setup** ✅ - Express server and routing
- **JSONL Watcher Service** ✅ - Session status detection
- **Conversation View UI** ✅ - UI container for stop button
- **Text Input & Send** ✅ - PromptInput where stop button lives

---

## References

- [Product Spec - Stop Agent Feature](../product_spec.md#feature-stop-agent)
- [Architecture - Claude CLI Integration](../architecture.md#integration-claude-code-cli)
- [Node.js Process Signals](https://nodejs.org/api/process.html#signal-events)

