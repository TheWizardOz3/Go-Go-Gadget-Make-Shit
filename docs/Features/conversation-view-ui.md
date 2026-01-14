# Feature Spec: Conversation View UI

## 1. Overview

### 1.1 One-Line Summary

A mobile-first chat interface that displays Claude Code conversations with markdown rendering, syntax-highlighted code blocks, and real-time polling.

### 1.2 User Story

> As a **developer using GoGoGadgetClaude**, I want to **see my Claude Code conversation on my phone in real-time**, so that **I can monitor what the agent is doing while away from my laptop**.

### 1.3 Problem Statement

The backend now provides conversation data via `/api/sessions/:id/messages`, but there's no UI to display it. Developers need a clean, readable mobile interface that:
1. Shows messages in a familiar chat-style layout
2. Renders markdown and code properly (not raw text)
3. Updates automatically as Claude works
4. Works well on small screens with touch interaction

Without this, users have no way to see what Claude is doing — the core value proposition of the app.

### 1.4 Business Value

- **User Impact:** Enables the primary use case — checking on Claude from your phone
- **Business Impact:** This is the main screen of the app; without it, the product has no value
- **Technical Impact:** Establishes component patterns and data fetching hooks for all other UI features

---

## 2. Scope & Requirements

### 2.1 Functional Requirements

| ID   | Requirement | Priority | Notes |
|------|-------------|----------|-------|
| FR-1 | Display messages in chronological order (oldest first) | MUST | Oldest at top, latest at bottom |
| FR-2 | Differentiate user vs assistant messages visually | MUST | Cursor-style: labels, icons, subtle background differences |
| FR-3 | Render markdown content (headers, lists, bold, italic, links) | MUST | Use react-markdown or similar |
| FR-4 | Syntax highlight code blocks with language detection | MUST | Use Shiki as per architecture.md |
| FR-5 | Show tool usage events (file edits, commands) as collapsible cards | MUST | Expand on tap to see details |
| FR-6 | Display relative timestamps ("2m ago") on messages | MUST | Update periodically |
| FR-7 | Auto-scroll to latest message on new content | MUST | Standard chat behavior |
| FR-8 | Disable auto-scroll when user scrolls up to review history | MUST | Show "Jump to latest" button |
| FR-9 | Poll for new messages every 2-3 seconds | MUST | Use SWR refreshInterval |
| FR-10 | Show loading state when first loading conversation | SHOULD | Skeleton or spinner |
| FR-11 | Show error state with retry option if API fails | SHOULD | Toast or inline error |
| FR-12 | Pull-to-refresh gesture support | SHOULD | Mobile UX convention |
| FR-13 | Truncate very long messages with "Show more" | COULD | After ~500 chars |

### 2.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Initial Render | < 500ms after data arrives | Manual testing |
| Re-render on Poll | < 100ms for 10 new messages | Manual testing |
| Touch Targets | ≥ 44×44px | Visual inspection |
| Code Block Scroll | Horizontal scroll works smoothly | Test on iPhone |

### 2.3 Acceptance Criteria

- [ ] **Given** a session with messages, **when** opening the conversation view, **then** messages display in chronological order with proper styling
- [ ] **Given** a message with markdown, **when** viewing it, **then** headers, lists, bold, and code are rendered (not raw markdown syntax)
- [ ] **Given** a message with a code block, **when** viewing it, **then** code is syntax highlighted with the correct language colors
- [ ] **Given** Claude is actively working, **when** new messages arrive, **then** they appear within 3 seconds and view scrolls to show them
- [ ] **Given** user scrolled up in history, **when** new messages arrive, **then** auto-scroll is disabled and "Jump to latest" button appears
- [ ] **Given** a tool_use event in the conversation, **when** viewing it, **then** it shows as a card with tool name, and expands on tap to show details

### 2.4 Out of Scope

- Text input / sending prompts (separate feature: Text Input & Send)
- Status indicator in header (separate feature: Status Indicator)
- Project/session switching (separate features: Project Switcher, Session Picker)
- Voice input (separate feature: Voice Input)
- Stop button (separate feature: Stop Button)

---

## 3. User Experience

### 3.1 User Flow

```
Open App → Load Session → Display Messages → Poll for Updates
                              ↓
                        Scroll Up → Show "Jump to Latest" → Tap → Scroll Down
```

**Happy Path:**
1. User opens app (session is auto-selected or from URL)
2. Conversation loads and displays with most recent at bottom
3. User scrolls to see messages, code blocks, tool usage
4. New messages appear automatically as Claude works
5. User taps "Jump to latest" if they scrolled up

**Alternate Paths:**
- Loading state while fetching initial data
- Error state if API is unreachable (with retry button)
- Empty state if session has no messages yet

### 3.2 Visual Design

**Cursor-Style Message Layout:**
- All messages left-aligned in a single column (document/thread style, not chat bubbles)
- Full-width messages that span the content area
- Clear visual separation between user and assistant turns

**User Messages:**
- Header row: User icon (circle with initials or generic user icon) + "You" label + timestamp
- Content below header, full width
- Subtle background tint or left border accent to distinguish from assistant
- Clean, minimal styling

**Assistant Messages:**
- Header row: Claude icon (sparkle/star or Claude logo) + "Claude" label + timestamp
- Content below header, full width
- Default surface background
- Thinking/reasoning blocks can be collapsible (if present)

**Code Blocks:**
- Full-width within message area
- Monospace font (JetBrains Mono or SF Mono)
- Dark background (surface-elevated or darker)
- Horizontal scroll for long lines
- Rounded corners, subtle border
- Language label in top-right corner (e.g., "typescript")
- Optional copy button on hover/tap

**Tool Usage Cards:**
- Inline with message flow (not separate bubbles)
- Collapsed by default: icon + tool name + brief summary (e.g., "Wrote file: src/App.tsx")
- Expanded: full input/output details
- Different icons per tool type (📄 file, 💻 terminal, 🔍 search, etc.)
- Subtle border or background to distinguish from regular text

**Layout:**
- Full-screen conversation area
- 16px horizontal padding
- Clear visual breaks between message turns (spacing or subtle divider)
- 16-24px vertical spacing between turns
- Timestamps in caption size, tertiary color, next to sender label

---

## 4. Technical Approach

### 4.1 Architecture Fit

**Affected Areas:**
| Area | Impact | Description |
|------|--------|-------------|
| Frontend | NEW | New components, hooks, and views |
| Backend | NONE | Uses existing `/api/sessions/:id/messages` endpoint |
| Database | NONE | No database changes |
| External Services | NONE | No new external services |

**Alignment with Existing Patterns:**
- Uses api client from `client/src/lib/api.ts`
- Uses shared types from `shared/types/index.ts` (MessageSerialized, etc.)
- Follows component patterns from `architecture.md` Section 7
- Uses Tailwind for styling as per tech stack

### 4.2 Key Implementation Details

**Data Fetching with SWR:**
```typescript
// hooks/useConversation.ts
export function useConversation(sessionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MessagesResponse>(
    sessionId ? `/sessions/${sessionId}/messages` : null,
    (path) => api.get(path),
    { refreshInterval: 2500 }
  );
  return { messages: data?.messages, status: data?.status, error, isLoading, refresh: mutate };
}
```

**Auto-Scroll Logic:**
```typescript
// Track if user manually scrolled up
const [userScrolled, setUserScrolled] = useState(false);
const messagesEndRef = useRef<HTMLDivElement>(null);

// Scroll to bottom when new messages arrive (if not manually scrolled)
useEffect(() => {
  if (!userScrolled && messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages, userScrolled]);

// Detect scroll position
const handleScroll = (e: React.UIEvent) => {
  const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
  setUserScrolled(!isNearBottom);
};
```

**Markdown Rendering:**
- Use `react-markdown` for markdown parsing
- Use `rehype-highlight` or custom Shiki integration for code highlighting
- Sanitize HTML output for security

**File Structure:**
```
client/src/
├── components/
│   ├── conversation/
│   │   ├── ConversationView.tsx    # Main container with scroll logic
│   │   ├── MessageList.tsx         # List wrapper
│   │   ├── MessageTurn.tsx         # Individual message turn (Cursor-style)
│   │   ├── MessageHeader.tsx       # Icon + label + timestamp row
│   │   ├── ToolUseCard.tsx         # Collapsible tool usage
│   │   ├── CodeBlock.tsx           # Syntax highlighted code
│   │   ├── JumpToLatest.tsx        # Floating button
│   │   └── EmptyState.tsx          # No messages state
│   └── ui/
│       ├── Skeleton.tsx            # Loading skeleton
│       └── ErrorState.tsx          # Error with retry
├── hooks/
│   └── useConversation.ts          # Data fetching hook
├── lib/
│   ├── formatters.ts               # Relative time formatting
│   └── markdown.ts                 # Markdown config
```

---

## 5. Implementation Tasks

### Task 1: Install dependencies and set up SWR
**Estimated Time:** 20 min  
**Description:** Add required npm packages for data fetching and markdown rendering.

**Deliverables:**
- Install `swr` for data fetching with caching and polling
- Install `react-markdown` for markdown rendering
- Install `shiki` for syntax highlighting
- Install `date-fns` for relative time formatting
- Update `client/package.json`

**Files Modified:**
- `client/package.json`

---

### Task 2: Create useConversation hook with SWR
**Estimated Time:** 30 min  
**Description:** Data fetching hook that polls for conversation messages.

**Deliverables:**
- `client/src/hooks/useConversation.ts` - SWR-based hook for messages
- Poll every 2.5 seconds
- Support `since` parameter for efficient delta fetching (future optimization)
- Return messages, status, loading, error, and refresh function

**Key Implementation:**
```typescript
export function useConversation(sessionId: string | null) {
  // Returns { messages, status, isLoading, error, refresh }
}
```

**Files Created:**
- `client/src/hooks/useConversation.ts`

---

### Task 3: Create formatters utility (relative time)
**Estimated Time:** 15 min  
**Description:** Utility functions for formatting timestamps as "2m ago".

**Deliverables:**
- `client/src/lib/formatters.ts` - Format dates as relative time
- Use `date-fns` `formatDistanceToNow` or similar
- Handle edge cases (just now, invalid dates)

**Files Created:**
- `client/src/lib/formatters.ts`

---

### Task 4: Create base UI components (Skeleton, ErrorState)
**Estimated Time:** 30 min  
**Description:** Reusable loading and error state components.

**Deliverables:**
- `client/src/components/ui/Skeleton.tsx` - Animated loading placeholder
- `client/src/components/ui/ErrorState.tsx` - Error message with retry button

**Files Created:**
- `client/src/components/ui/Skeleton.tsx`
- `client/src/components/ui/ErrorState.tsx`

---

### Task 5: Create MessageTurn component
**Estimated Time:** 45 min  
**Description:** Individual message turn display with Cursor-style layout.

**Deliverables:**
- `client/src/components/conversation/MessageTurn.tsx`
- Full-width, left-aligned design (document/thread style)
- Header row with icon, sender label ("You" / "Claude"), and timestamp
- User messages: user icon + subtle accent tint or left border
- Assistant messages: Claude icon + default surface background
- Clear visual separation between turns

**Files Created:**
- `client/src/components/conversation/MessageTurn.tsx`

---

### Task 6: Add markdown rendering to MessageTurn
**Estimated Time:** 45 min  
**Description:** Render markdown content (headers, lists, bold, links) inside messages.

**Deliverables:**
- Configure `react-markdown` with safe defaults
- Style markdown elements with Tailwind (prose classes or custom)
- Handle inline code and links

**Files Modified:**
- `client/src/components/conversation/MessageTurn.tsx`
- `client/src/lib/markdown.ts` (new - markdown config)

**Files Created:**
- `client/src/lib/markdown.ts`

---

### Task 7: Create CodeBlock component with syntax highlighting
**Estimated Time:** 60 min  
**Description:** Syntax-highlighted code blocks using Shiki.

**Deliverables:**
- `client/src/components/conversation/CodeBlock.tsx`
- Detect language from code fence or auto-detect
- Dark theme (matches app aesthetic)
- Horizontal scroll for long lines
- Copy button (optional for MVP)
- Language label in corner

**Technical Notes:**
- Shiki requires async loading of themes/languages
- Consider `@shikijs/rehype` for integration with react-markdown
- Fallback to non-highlighted if Shiki fails

**Files Created:**
- `client/src/components/conversation/CodeBlock.tsx`

---

### Task 8: Create ToolUseCard component
**Estimated Time:** 45 min  
**Description:** Collapsible card for displaying tool usage (file edits, commands).

**Deliverables:**
- `client/src/components/conversation/ToolUseCard.tsx`
- Collapsed state: icon + tool name + brief summary
- Expanded state: full input/output
- Tap to toggle expand
- Icons for different tool types (Write File, Run Command, etc.)

**Files Created:**
- `client/src/components/conversation/ToolUseCard.tsx`

---

### Task 9: Create MessageList and ConversationView components
**Estimated Time:** 45 min  
**Description:** Main conversation container with scroll handling.

**Deliverables:**
- `client/src/components/conversation/MessageList.tsx` - Renders list of messages
- `client/src/components/conversation/ConversationView.tsx` - Main container
- Scroll container with padding
- Handle empty state
- Wire up to useConversation hook

**Files Created:**
- `client/src/components/conversation/MessageList.tsx`
- `client/src/components/conversation/ConversationView.tsx`

---

### Task 10: Implement auto-scroll and "Jump to Latest" behavior
**Estimated Time:** 45 min  
**Description:** Auto-scroll to new messages, disable when user scrolls up.

**Deliverables:**
- `client/src/components/conversation/JumpToLatest.tsx` - Floating button
- Auto-scroll to bottom when new messages arrive
- Detect when user scrolls up (disable auto-scroll)
- Show "Jump to latest" floating button when scrolled up
- Tap to scroll to bottom

**Files Created:**
- `client/src/components/conversation/JumpToLatest.tsx`

**Files Modified:**
- `client/src/components/conversation/ConversationView.tsx`

---

### Task 11: Wire up ConversationView to App.tsx
**Estimated Time:** 30 min  
**Description:** Integrate the conversation view into the main app.

**Deliverables:**
- Update `App.tsx` to render ConversationView
- For MVP: Use most recent session automatically (or first from list)
- Add basic project/session selection later (separate feature)
- Create `useProjects` and `useSessions` hooks for session discovery

**Files Modified:**
- `client/src/App.tsx`

**Files Created:**
- `client/src/hooks/useProjects.ts`
- `client/src/hooks/useSessions.ts`

---

### Task 12: Add pull-to-refresh support
**Estimated Time:** 30 min  
**Description:** Allow users to pull down to refresh messages.

**Deliverables:**
- Detect pull-down gesture at top of scroll area
- Trigger `refresh()` from useConversation
- Show brief loading indicator during refresh
- Works on iOS Safari (primary target)

**Technical Notes:**
- Consider using a library like `react-pull-to-refresh` or native overscroll behavior
- May need to handle touch events manually for iOS Safari

**Files Modified:**
- `client/src/components/conversation/ConversationView.tsx`

---

## 6. Test Plan

### Unit Tests
- `formatters.ts`: Relative time formatting edge cases
- `MessageTurn`: Renders user vs assistant styles correctly (icon, label, styling)
- `ToolUseCard`: Expand/collapse toggle works

### Integration Tests
- `useConversation`: Returns data from mock API
- `ConversationView`: Renders messages from hook

### Manual Testing
- Load real session data and verify messages display correctly
- Scroll behavior: auto-scroll when at bottom, stops when scrolled up
- "Jump to latest" button appears/disappears correctly
- Code blocks: syntax highlighting, horizontal scroll
- Markdown: headers, lists, bold render correctly
- Tool usage cards: expand/collapse, shows correct tool info
- Pull-to-refresh: gesture triggers refresh on iOS Safari
- Test on real iPhone Safari

---

## 7. Dependencies

### Upstream Dependencies
- [x] JSONL Watcher Service complete (provides `/api/sessions/:id/messages`)
- [x] API Server Setup complete (middleware, error handling)
- [x] Shared types defined (`MessageSerialized`, `SessionStatus`)

### Downstream Dependents
- **Status Indicator** - will add to the header/layout this feature creates
- **Text Input & Send** - will add input bar below conversation
- **Project Switcher** - will add project selector to header
- **Session Picker** - will add session selector

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shiki bundle size is large | Medium | Medium | Use dynamic imports, load only needed languages |
| Code highlighting causes render delays | Medium | Low | Async highlighting, show unhighlighted first |
| iOS Safari pull-to-refresh conflicts | Medium | Medium | Test early, may need custom touch handling |
| Very long conversations slow down | Low | Medium | Consider virtualization in future if needed |

---

## 9. Design Reference

### Color Tokens (from product_spec.md)
- Background: `#0A0A0A` (dark mode)
- Surface: `#141414`
- Surface Elevated: `#1C1C1C`
- Text Primary: `#FAFAFA`
- Text Secondary: `#8B8B8B`
- Text Tertiary: `#5B5B5B`
- Accent: `#818CF8`
- Success: `#34D399`
- Error: `#F87171`
- Working: `#60A5FA`

### Typography
- Body Large: 18px for message content
- Sender Label: 14px, semi-bold
- Code: SF Mono / JetBrains Mono 14px
- Caption: 13px for timestamps

### Spacing (Cursor-Style Layout)
- Turn padding: 16px vertical, 16px horizontal
- Turn gap: 16-24px between turns
- Message content: full width
- Icon size: 24-28px
- Header gap: 8px between icon and label

### Visual Hierarchy
- User turns: subtle left border (accent color) or light background tint
- Assistant turns: default surface background
- Clear whitespace between turns for readability
- Code blocks: elevated background, full width

---

## 10. Implementation Summary

**Status:** ✅ Complete

### Files Created
| File | Purpose |
|------|---------|
| `client/src/hooks/useConversation.ts` | SWR-based hook for fetching messages with polling |
| `client/src/hooks/useProjects.ts` | Hook for fetching project list |
| `client/src/hooks/useSessions.ts` | Hook for fetching sessions for a project |
| `client/src/lib/formatters.ts` | Relative time formatting, text truncation |
| `client/src/lib/markdown.tsx` | React-markdown component configuration |
| `client/src/components/conversation/ConversationView.tsx` | Main container with scroll logic, status badge |
| `client/src/components/conversation/MessageList.tsx` | Renders list of MessageTurn components |
| `client/src/components/conversation/MessageTurn.tsx` | Individual message turn with Cursor-style layout |
| `client/src/components/conversation/CodeBlock.tsx` | Syntax-highlighted code with Shiki |
| `client/src/components/conversation/ToolUseCard.tsx` | Collapsible tool usage display |
| `client/src/components/conversation/JumpToLatest.tsx` | Floating button to scroll to bottom |
| `client/src/components/conversation/EmptyState.tsx` | Empty/no-selection state display |
| `client/src/components/conversation/PullToRefresh.tsx` | Pull-to-refresh indicator |
| `client/src/components/ui/Skeleton.tsx` | Loading skeleton components |
| `client/src/components/ui/ErrorState.tsx` | Error display with retry |
| `client/src/lib/formatters.test.ts` | Unit tests for formatters (24 tests) |
| `client/vitest.config.ts` | Vitest test configuration |
| `client/src/test/setup.ts` | Test setup file |
| `server/vitest.config.ts` | Server Vitest configuration |
| `server/src/lib/jsonlParser.test.ts` | Unit tests for JSONL parser (21 tests) |
| `server/src/lib/pathEncoder.test.ts` | Unit tests for path encoding (29 tests) |
| `server/src/services/sessionManager.test.ts` | Unit tests for status detection (14 tests) |

### Files Modified
| File | Changes |
|------|---------|
| `client/src/App.tsx` | Integrated ConversationView, added project/session auto-selection |
| `client/package.json` | Added dependencies (swr, react-markdown, shiki, date-fns, vitest) |
| `client/tsconfig.json` | Added @shared path alias |
| `client/vite.config.ts` | Added @shared resolve alias |
| `server/src/lib/jsonlParser.ts` | Fixed user message content parsing (content blocks support) |
| `server/package.json` | Added vitest dependency and test scripts |

### Key Implementation Notes
1. **Data Fetching:** SWR with 2.5s polling interval, auto-revalidation on focus
2. **Markdown:** react-markdown v10 with custom component styling
3. **Code Highlighting:** Shiki with async loading, fallback for unhighlighted code
4. **Scroll Behavior:** Auto-scroll when at bottom, pauses when user scrolls up
5. **Pull-to-Refresh:** Custom touch event handling for iOS Safari compatibility
6. **Tool Cards:** Collapsible with tool-specific icons and status indicators
7. **Session Discovery:** Auto-selects most recent project and session on load

### Bug Fixes During Implementation
- **react-markdown assertion error:** User message `content` in Claude Code JSONL can be an array of content blocks (not just a string). Fixed by updating `jsonlParser.ts` to use `extractTextFromContent()` for both user and assistant messages.

### Dependencies Added

**Client:**
- `swr@^2.3.8` — Data fetching with caching and polling
- `react-markdown@^10.1.0` — Markdown rendering
- `shiki@^3.21.0` — Syntax highlighting
- `date-fns@^4.1.0` — Date formatting
- `vitest@^4.0.17` — Unit testing
- `@testing-library/react@^16.3.1` — React component testing
- `@testing-library/jest-dom@^6.9.1` — DOM assertions
- `jsdom@^27.4.0` — DOM environment for tests

**Server:**
- `vitest@^4.0.17` — Unit testing

---

*Created: 2026-01-14*  
*Completed: 2026-01-14* — All 12 implementation tasks complete. See `changelog.md` v0.4.0.

