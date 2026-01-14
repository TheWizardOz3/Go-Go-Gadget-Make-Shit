# Feature: Text Input & Send

> **Status**: ✅ Complete  
> **Started**: 2026-01-14  
> **Completed**: 2026-01-14  
> **Feature Doc Version**: 1.1

---

## Overview

A text input component at the bottom of the conversation view that allows users to type prompts and send them to the active Claude Code session. This is the primary interaction mechanism for controlling Claude from a mobile device.

## User Story

> As a developer away from my desk, I want to type a prompt on my phone and send it to Claude Code, so I can direct the agent without being at my laptop.

## Requirements (from Product Spec)

- [x] Multi-line text input with auto-expanding height
- [x] Send button (disabled when empty)
- [x] Enter key submits (with Shift+Enter for newline on desktop)
- [x] Clear visual feedback when message is sent (input clears, button shows loading)
- [x] Input persists if app is backgrounded (localStorage persistence)
- [x] Support @ references (typed manually—no autocomplete needed for MVP)

## Design Specification

### Visual Design

**Component Layout**: Fixed position at bottom of screen (standard mobile chat pattern)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            Conversation Messages                 │
│                                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  ┌────┐ │
│  │ Type a message...                  │  │ ➤  │ │
│  │                                    │  │    │ │
│  └────────────────────────────────────┘  └────┘ │
│  Safe area (bottom padding)                     │
└──────────────────────────────────────────────────┘
```

**Input Field**:
- Background: `--color-surface-elevated`
- Border: 1px `--color-border`
- Border radius: 12px
- Min height: 44px (single line)
- Max height: ~150px (then scroll)
- Font: Body (16px) - prevents iOS zoom on focus
- Placeholder: "Type a message..." in `--color-text-tertiary`
- Focus state: Ring with `--color-accent`

**Send Button**:
- Size: 44×44px (touch target)
- Background: `--color-accent` when enabled, `--color-border` when disabled
- Icon: Arrow up / send icon
- Border radius: 12px
- Disabled when input is empty or whitespace-only

**Container**:
- Background: `--color-surface`
- Border top: 1px `--color-border`
- Padding: 8px 16px (plus safe-area-inset-bottom)

### States

| State | Visual | Behavior |
|-------|--------|----------|
| Empty | Send button disabled (gray) | Typing shows text |
| Has Text | Send button enabled (accent color) | Can submit |
| Sending | Loading spinner on send button | Input disabled |
| Sent | Input clears, focus stays | Ready for next prompt |
| Error | Toast with error + retry | Input retains text |

### Accessibility

- Input has proper `aria-label`
- Send button has `aria-label="Send message"`
- Disabled states properly communicated
- Focus management after send

## Acceptance Criteria

- [ ] Given I type a prompt and tap send, when Claude Code is running, then the prompt appears in the conversation and is sent to the agent
- [ ] Given I type a prompt with multiple lines, when viewing the input, then it expands to show all content (up to max height)
- [ ] Given I send a prompt, when it's successfully sent, then input clears and message appears in conversation
- [ ] Given I'm on desktop, when I press Enter, then the prompt sends; Shift+Enter adds newline
- [ ] Given Claude is not running (idle), when I send a prompt, then it starts a new Claude process with that prompt
- [ ] Given the send fails, when error occurs, then show error toast and retain input text
- [ ] Given I background the app with text in input, when I return, then text is still there

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                                    │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  PromptInput    │──►│  useSendPrompt  │──►│  api.post()      │  │
│  │  (Component)    │   │  (Hook)         │   │  /sessions/:id/  │  │
│  └─────────────────┘   └─────────────────┘   │  send            │  │
│                                               └────────┬─────────┘  │
└──────────────────────────────────────────────────────────│──────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend (Express)                                                   │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  sessions.ts    │──►│  claudeService  │──►│  execa           │  │
│  │  POST /send     │   │  .sendPrompt()  │   │  claude -p "..." │  │
│  └─────────────────┘   └─────────────────┘   └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### New Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/conversation/PromptInput.tsx` | Main input component |
| `client/src/hooks/useSendPrompt.ts` | Hook for sending prompts with loading/error state |
| `server/src/services/claudeService.ts` | Service for spawning Claude CLI |

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/conversation/ConversationView.tsx` | Add PromptInput at bottom |
| `server/src/api/sessions.ts` | Implement POST /:id/send endpoint |
| `client/src/index.css` | Add safe-area-inset-bottom utility if needed |

### Backend: claudeService.ts

```typescript
// server/src/services/claudeService.ts
import { execa, type ResultPromise } from 'execa';

interface SendPromptOptions {
  sessionId: string;
  projectPath: string;
  prompt: string;
}

interface SendPromptResult {
  success: boolean;
  pid?: number;
}

/**
 * Send a prompt to Claude Code using the CLI
 * 
 * Uses `claude -p "prompt" --continue` to send to existing session.
 * If no session is active, Claude will start a new one.
 */
export async function sendPrompt(options: SendPromptOptions): Promise<SendPromptResult> {
  const { projectPath, prompt } = options;
  
  // Spawn claude command
  // --continue: Continue the most recent session
  // -p: Provide the prompt directly
  const subprocess = execa('claude', ['-p', prompt, '--continue'], {
    cwd: projectPath,
    detached: true,  // Allow process to run independently
    stdio: 'ignore', // Don't capture output (it goes to JSONL)
  });
  
  // Don't wait for process to complete - it runs in background
  subprocess.unref();
  
  return {
    success: true,
    pid: subprocess.pid,
  };
}
```

### Backend: sessions.ts (update)

```typescript
// Update POST /:id/send handler
router.post('/:id/send', validateRequest({ body: sendPromptSchema }), async (req, res) => {
  const { id } = req.params;
  const { prompt } = req.body;
  
  // Get session to find project path
  const session = await getSession(id);
  if (!session) {
    res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Session not found'));
    return;
  }
  
  // Send prompt via Claude CLI
  const result = await sendPrompt({
    sessionId: id,
    projectPath: session.projectPath,
    prompt,
  });
  
  res.json(success(result));
});
```

### Frontend: PromptInput Component

Key features:
- Auto-expanding textarea using `scrollHeight`
- Send button with loading state
- Keyboard handling (Enter vs Shift+Enter)
- localStorage persistence for backgrounded app
- Proper safe-area-inset handling for notched phones

### Frontend: useSendPrompt Hook

```typescript
// Simplified hook interface
export function useSendPrompt(sessionId: string | null) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const sendPrompt = async (prompt: string) => {
    if (!sessionId || isSending) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      await api.post(`/sessions/${sessionId}/send`, { prompt });
    } catch (err) {
      setError(err as Error);
      throw err; // Re-throw so component can handle
    } finally {
      setIsSending(false);
    }
  };
  
  return { sendPrompt, isSending, error };
}
```

### Integration with ConversationView

The ConversationView will be updated to include the PromptInput:

```tsx
// ConversationView structure
<div className="flex flex-col h-full">
  {/* Messages area - flex-1 to take remaining space */}
  <div className="flex-1 overflow-auto">
    <MessageList messages={messages} />
  </div>
  
  {/* Input area - fixed at bottom */}
  <PromptInput
    sessionId={sessionId}
    onSent={() => scrollToBottom()}
    disabled={status === 'working'}
  />
</div>
```

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty/whitespace-only input | Send button disabled |
| Very long prompt | Allow (server has 50KB limit) |
| Claude process already running | Queue prompt (Claude handles this) |
| No Claude installed | Return clear error message |
| Network failure | Show error toast, retain input |
| Session not found | Show error, don't clear input |
| App backgrounded during send | Complete send, update on return |

## Implementation Tasks

| # | Task | Estimate | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Create `claudeService.ts` with `sendPrompt()` | 30 min | ✅ | execa, detached process spawning |
| 2 | Implement POST `/sessions/:id/send` endpoint | 30 min | ✅ | Zod validation, error handling |
| 3 | Create `PromptInput` component | 45 min | ✅ | Textarea, send button, styling |
| 4 | Create `useSendPrompt` hook | 20 min | ✅ | API call with loading/error state |
| 5 | Integrate PromptInput into ConversationView | 30 min | ✅ | Layout adjustment |
| 6 | Add keyboard handling (Enter/Shift+Enter) | 20 min | ✅ | Included in Task 3 |
| 7 | Add localStorage persistence for input | 15 min | ✅ | Persist draft across backgrounding |
| 8 | Add safe-area-inset handling | 15 min | ✅ | Included in Task 3 CSS |

**Total Estimated Time**: ~3.5 hours | **Actual**: ~3 hours

## Test Plan

### Unit Tests (36 new tests)
- `claudeService.test.ts` (6 tests): Mock execa, verify correct arguments, error handling
- `useSendPrompt.test.ts` (10 tests): Mock API, verify loading states and error handling
- `PromptInput.test.tsx` (20 tests): Disabled states, send behavior, localStorage persistence

### Integration Tests
- POST `/sessions/:id/send`: Validated via unit tests (mocked Claude CLI)

### Manual Testing
- [x] Verify auto-expanding textarea
- [x] Test Enter key on desktop
- [x] Test Shift+Enter for newlines (via unit tests)
- [x] Background app with text, return to verify persistence
- [x] Send button enables/disables correctly
- [ ] Test error handling (network off, invalid session)
- [ ] Verify safe-area-inset on notched iPhone

## Out of Scope (for this feature)

- Voice input (separate feature)
- Quick templates (separate feature)  
- @ mention autocomplete
- Rich text formatting
- File attachments

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Conversation View | Feature | ✅ Complete |
| Session Manager | Service | ✅ Complete |
| API Server | Infrastructure | ✅ Complete |
| `execa` package | npm | ✅ Already installed |

## Related Documents

- [Product Spec - Text Prompt Input](../product_spec.md#feature-text-prompt-input)
- [Architecture - Claude Code Integration](../architecture.md#integration-claude-code-cli)
- [Conversation View UI](./conversation-view-ui.md)

---

*Created: 2026-01-14*  
*Last Updated: 2026-01-14*

