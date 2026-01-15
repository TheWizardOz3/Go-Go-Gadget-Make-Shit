# Product Specification: GoGoGadgetClaude

## 1. Executive Summary

### 1.1 Product Vision Statement
A mobile-first web interface that lets you monitor, control, and interact with Claude Code sessions running on your laptop—from anywhere in your home or office.

### 1.2 Problem Statement
When using AI coding agents like Claude Code, developers must sit at their computer watching the agent work or risk missing important moments (task completion, errors, needing input). This creates friction for people who want to step away, walk around, or multitask while their agent handles coding tasks. There's no good way to monitor progress, send follow-up prompts, or review changes from a mobile device.

### 1.3 Target Audience / User Personas

| Persona | Description | Primary Goals | Pain Points |
|---------|-------------|---------------|-------------|
| Solo Developer (Primary) | Technical individual using Claude Code for personal projects, comfortable with CLI tools, values efficiency | Monitor agent progress while away from desk, send quick prompts, review changes on the go | Stuck at computer waiting for agent, can't check progress on walks, misses task completions |

### 1.4 Key Value Proposition
The only way to control Claude Code from your phone—see what it's doing, send prompts via voice or text, get notified when it's done, and review code changes—all without being chained to your laptop.

---

## 2. User Experience Guidelines

### 2.1 Design Principles

- **Walk-Friendly:** Designed for one-handed use while moving. Large touch targets, simple gestures, no precision required.
- **Progressive Disclosure:** Show essential controls upfront, reveal complexity only when needed. Primary actions always visible; secondary actions tucked away.
- **Instant Clarity:** Status should be obvious at a glance. Is the agent working? Waiting? What project am I in?
- **Minimal Friction:** Reduce taps to accomplish common tasks. Quick-select templates over typing when possible.
- **Respectful of Attention:** Don't demand focus. Notifications inform but don't interrupt. UI is calm, not noisy.

### 2.2 Visual Design System

#### Design Philosophy
Inspired by Linear's precision and polish, Olauncher's radical minimalism, and Claude/ChatGPT's voice mode interfaces. Clean typography, generous whitespace, purposeful use of color only for status and actions.

#### Color Palette
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-background` | `#FAFAFA` | `#0A0A0A` | Page background |
| `--color-surface` | `#FFFFFF` | `#141414` | Cards, panels |
| `--color-surface-elevated` | `#FFFFFF` | `#1C1C1C` | Modals, dropdowns |
| `--color-text-primary` | `#0A0A0A` | `#FAFAFA` | Headings, primary text |
| `--color-text-secondary` | `#6B6B6B` | `#8B8B8B` | Muted text, labels |
| `--color-text-tertiary` | `#9B9B9B` | `#5B5B5B` | Timestamps, hints |
| `--color-border` | `#E5E5E5` | `#2A2A2A` | Subtle borders |
| `--color-accent` | `#6366F1` | `#818CF8` | Primary actions, links |
| `--color-success` | `#10B981` | `#34D399` | Success states, additions |
| `--color-error` | `#EF4444` | `#F87171` | Errors, deletions, stop button |
| `--color-warning` | `#F59E0B` | `#FBBF24` | Warnings, pending states |
| `--color-working` | `#3B82F6` | `#60A5FA` | Active/working status |

#### Typography
| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| H1 (Screen Title) | System SF Pro / Inter | 28px | 600 | Used sparingly |
| H2 (Section) | System SF Pro / Inter | 20px | 600 | Section headers |
| Body | System SF Pro / Inter | 16px | 400 | Primary content |
| Body Large | System SF Pro / Inter | 18px | 400 | Conversation messages |
| Code | SF Mono / JetBrains Mono | 14px | 400 | Code blocks, file names |
| Caption | System SF Pro / Inter | 13px | 400 | Timestamps, metadata |
| Button | System SF Pro / Inter | 16px | 500 | All buttons |

#### Spacing & Layout
- **Base unit:** 4px
- **Touch targets:** Minimum 44×44px (Apple HIG), prefer 48×48px for primary actions
- **Padding:** 16px horizontal page padding, 12px vertical element spacing
- **Border radius:** 8px for cards, 12px for buttons, 16px for modals
- **Max content width:** 100% (mobile-optimized, no max-width constraints)

### 2.3 Accessibility Standards
- **Compliance Level:** WCAG 2.1 AA
- **Touch Targets:** Minimum 44×44px per Apple Human Interface Guidelines
- **Color Contrast:** Minimum 4.5:1 for text, 3:1 for UI components
- **Motion:** Respect `prefers-reduced-motion`
- **Focus Indicators:** Visible focus rings for keyboard navigation (when applicable)

### 2.4 Responsiveness Strategy
- **Approach:** Mobile-first (this is primarily a mobile web app)
- **Primary Target:** iPhone Safari (375px - 430px width)
- **Secondary:** Tablet portrait, desktop browser (for testing/debugging)
- **Breakpoints:**
  - Mobile: < 640px (primary experience)
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

### 2.5 Interaction Patterns
- **Animations:** Subtle, functional. 150-200ms transitions. No decorative animation.
- **Loading States:** Skeleton loaders for content, spinner only for actions
- **Error Handling:** Inline errors with clear recovery actions
- **Empty States:** Helpful guidance with clear next action
- **Pull to Refresh:** Supported on conversation view
- **Haptic Feedback:** On send, stop, and important state changes (via Taptic API)

---

## 3. Functional Requirements

### 3.1 Feature Overview Matrix

| Feature | Priority | Milestone | Complexity | Dependencies |
|---------|----------|-----------|------------|--------------|
| Conversation View | P0 | MVP | Medium | JSONL parsing |
| Status Indicator | P0 | MVP | Low | JSONL parsing |
| Text Prompt Input | P0 | MVP | Low | Claude Code CLI |
| Voice Prompt Input | P0 | MVP | Medium | Groq Whisper API |
| Stop Agent | P0 | MVP | Low | Process management |
| Project Switcher | P0 | MVP | Medium | File system scanning |
| Quick-Select Templates | P0 | MVP | Medium | YAML parsing |
| Files Changed View | P0 | MVP | Medium | Git integration |
| File Diff View | P0 | MVP | High | Git diff + syntax highlighting |
| Session Picker | P0 | MVP | Medium | JSONL session management |
| iMessage Notifications | P0 | MVP | Medium | macOS Shortcuts/AppleScript |
| File Tree View | P1 | V0.75 | Medium | File system scanning |
| Model Switching | P1 | V0.75 | Medium | Claude CLI integration |
| Voice Waveform | P1 | V0.75 | Low | Audio visualization |
| Slack Notifications | P1 | V1 | Medium | Slack Webhook API |
| Telegram Notifications | P1 | V1 | Medium | Telegram Bot API |
| Serverless Execution | P1 | V1 | High | Cloud compute |
| Cursor Support | P2 | V2 | High | Cursor CLI (if available) |
| Email Notifications | P2 | V2 | Medium | SMTP or email service |
| Enhanced Diff View | P2 | V2 | Medium | UI improvements |
| Work Account Support | P2 | V2 | High | Okta integration |
| Super App Integration | P2 | V2 | Medium | API design |

### 3.2 Detailed Feature Specifications

---

#### Feature: Conversation View

**User Story:**  
> As a developer, I want to see my current Claude Code conversation on my phone, so that I can follow along with what the agent is doing while I'm away from my desk.

**Description:**  
The primary view showing the current conversation with Claude Code. Displays user prompts, agent responses, tool usage (file edits, commands), and status. Updates in near-real-time by polling the JSONL session files.

**Requirements:**
- [ ] Display conversation messages in chronological order
- [ ] Render markdown content properly (headers, lists, bold, italic)
- [ ] Syntax highlight code blocks with language detection
- [ ] Show tool usage events (file edits, shell commands) with appropriate formatting
- [ ] Auto-scroll to latest message when new content arrives
- [ ] Allow manual scroll to review history (disable auto-scroll when user scrolls up)
- [ ] Pull-to-refresh to force update
- [ ] Show timestamps on messages (relative: "2m ago")

**Acceptance Criteria:**
- [ ] Given Claude Code is running, when a new message appears in the JSONL, then it displays in the conversation within 3 seconds
- [ ] Given a conversation with code blocks, when viewing on phone, then code is syntax highlighted and horizontally scrollable
- [ ] Given the user scrolls up in conversation, when new messages arrive, then auto-scroll is disabled until user taps "Jump to latest"

**UI/UX Notes:**  
- Messages styled like a chat interface (user messages right-aligned, agent messages left-aligned)
- Code blocks have a subtle background, monospace font, and horizontal scroll
- Tool usage shown as collapsed cards that expand on tap
- "Jump to latest" floating button appears when scrolled up

**Edge Cases:**
- Very long messages: Truncate with "Show more" after ~500 chars
- Very long code blocks: Horizontally scrollable, max height with "Expand" option
- Empty conversation: Show friendly empty state with guidance

---

#### Feature: Status Indicator

**User Story:**  
> As a developer, I want to see at a glance whether Claude is working, waiting for input, or idle, so I know if I need to take action.

**Description:**  
A persistent status indicator showing the current state of the Claude Code session.

**Requirements:**
- [ ] Display one of three states: Working, Waiting, Idle
- [ ] "Working" shown when Claude is actively processing/generating
- [ ] "Waiting" shown when Claude has finished and awaits input
- [ ] "Idle" shown when no active session
- [ ] Visual distinction (color + icon) for each state
- [ ] Visible at top of screen at all times

**Acceptance Criteria:**
- [ ] Given Claude is generating a response, when viewing the app, then status shows "Working" with blue indicator
- [ ] Given Claude has finished and printed its response, when viewing the app, then status shows "Waiting" with green/yellow indicator
- [ ] Given no Claude Code process is running, when viewing the app, then status shows "Idle" with gray indicator

**UI/UX Notes:**  
- Pill-shaped badge in header: `● Working`, `● Waiting`, `● Idle`
- Subtle pulse animation on "Working" state
- Status is the first thing visible when opening app

---

#### Feature: Text Prompt Input

**User Story:**  
> As a developer, I want to type a prompt on my phone and send it to Claude Code, so I can direct the agent without being at my laptop.

**Description:**  
A text input field for sending prompts to the active Claude Code session.

**Requirements:**
- [ ] Multi-line text input with auto-expanding height
- [ ] Send button (disabled when empty)
- [ ] Enter key submits (with shift+enter for newline on desktop)
- [ ] Clear visual feedback when message is sent
- [ ] Input persists if app is backgrounded
- [ ] Support @ references (typed manually—no autocomplete needed for MVP)

**Acceptance Criteria:**
- [ ] Given I type a prompt and tap send, when Claude Code is running, then the prompt appears in the conversation and is sent to the agent
- [ ] Given I type a prompt with multiple lines, when viewing the input, then it expands to show all content
- [ ] Given I send a prompt, when it's successfully sent, then input clears and message appears in conversation

**UI/UX Notes:**  
- Large, thumb-friendly send button
- Input at bottom of screen (standard mobile chat pattern)
- Keyboard should not obscure the input field

---

#### Feature: Voice Prompt Input

**User Story:**  
> As a developer walking around, I want to dictate a prompt with my voice and review it before sending, so I can interact with Claude Code hands-free.

**Description:**  
Voice input that transcribes speech to text, allows review/editing, then sends on explicit confirmation.

**Requirements:**
- [ ] Tap-to-record button (hold not required—tap to start, tap to stop)
- [ ] Visual feedback during recording (icon change, subtle animation)
- [ ] Transcribe audio using Groq Whisper API (primary) or Web Speech API (fallback)
- [ ] Display transcription in text input for review
- [ ] User can edit transcription before sending
- [ ] User must explicitly tap send (no auto-send)

**Acceptance Criteria:**
- [ ] Given I tap the voice button and speak, when I tap stop, then my speech is transcribed into the text input
- [ ] Given a transcription appears, when I review it, then I can edit it before sending
- [ ] Given I tap send after voice input, when Claude Code is running, then the transcribed prompt is sent to the agent

**UI/UX Notes:**  
- Voice button next to send button (microphone icon)
- Recording state: button turns red, subtle pulse
- Transcription appears in text input so user can review/edit naturally
- If transcription fails, show error toast with "Try again" option

**Edge Cases:**
- No microphone permission: Show permission request with explanation
- Transcription API failure: Fall back to Web Speech API, show toast if both fail
- Empty transcription: Don't populate input, show "Couldn't understand, try again"

---

#### Feature: Stop Agent

**User Story:**  
> As a developer, I want to immediately stop Claude Code if it's going off the rails, so I can prevent unwanted changes to my code.

**Description:**  
Emergency stop button that kills the Claude Code process immediately.

**Requirements:**
- [ ] Prominent stop button visible when agent is working
- [ ] Single tap to stop (no confirmation modal—speed matters)
- [ ] Sends SIGINT/SIGTERM to Claude Code process
- [ ] Visual feedback when stop is triggered
- [ ] Status updates to "Idle" after stop

**Acceptance Criteria:**
- [ ] Given Claude Code is running, when I tap stop, then the process terminates within 1 second
- [ ] Given I tap stop, when the process terminates, then status changes to "Idle"
- [ ] Given Claude Code is idle/waiting, when viewing the app, then stop button is hidden or disabled

**UI/UX Notes:**  
- Red stop button (square icon, like media stop)
- Only visible/enabled when status is "Working"
- Haptic feedback on tap
- Toast confirmation: "Agent stopped"

**Technical Notes:**  
- Use `process.kill()` with SIGINT first, SIGTERM if needed
- Note: May result in partial file writes—user accepts this risk (git can recover)

---

#### Feature: Project Switcher

**User Story:**  
> As a developer working on multiple projects, I want to switch between projects from my phone, so I can manage different codebases without being at my laptop.

**Description:**  
Dropdown/modal for selecting the active project. Remembers last active project.

**Requirements:**
- [ ] Display current project name prominently in header
- [ ] Tap to open project list
- [ ] Show all projects with Claude Code sessions (scan ~/.claude/projects/)
- [ ] Most recent/active projects at top
- [ ] Selecting a project loads its conversation and session state
- [ ] Remember last selected project (persist to local storage)

**Acceptance Criteria:**
- [ ] Given I have sessions in multiple projects, when I open the project switcher, then I see all projects listed
- [ ] Given I select a different project, when it loads, then I see that project's conversation history
- [ ] Given I close and reopen the app, when it loads, then it opens to the last selected project

**UI/UX Notes:**  
- Current project shown in header with chevron indicating tappable
- Full-screen modal with project list (not a tiny dropdown)
- Projects show: name, last activity time, session count
- Search/filter if > 10 projects

---

#### Feature: Quick-Select Templates

**User Story:**  
> As a developer, I want to send common prompts with a single tap, so I don't have to type repetitive commands on my phone.

**Description:**  
Pre-defined prompt templates displayed as tappable buttons. Templates are defined per-project in a YAML file.

**Requirements:**
- [ ] Load templates from `.claude/templates.yaml` in project root (or similar)
- [ ] Display templates as tappable buttons/chips above the input
- [ ] Tap to insert template text into input (user can review/edit before sending)
- [ ] Support template variables: `{{branch}}`, `{{file}}` (optional for MVP)
- [ ] Fallback to default templates if no project-specific file exists
- [ ] Horizontally scrollable if many templates

**Acceptance Criteria:**
- [ ] Given a project has templates.yaml, when I open the app, then I see the templates as buttons
- [ ] Given I tap a template, when it's selected, then the template text appears in my input field
- [ ] Given no templates.yaml exists, when I open the app, then I see default templates ("Continue", "Run tests", etc.)

**UI/UX Notes:**  
- Chips/pills style buttons in a horizontal scroll area
- Most-used templates first
- Subtle visual distinction from regular buttons
- Icon + short label: "▶ Continue", "🧪 Test", "📝 Commit"

**Template File Format:**
```yaml
# .claude/templates.yaml
templates:
  - label: "Continue"
    icon: "▶"
    prompt: "Continue to the next task."
  - label: "Test"
    icon: "🧪"
    prompt: "Run the test suite and fix any failures."
  - label: "Commit"
    icon: "📝"
    prompt: "Commit the current changes with a descriptive message."
  - label: "Review"
    icon: "👀"
    prompt: "Review the changes you just made and explain what you did."
```

---

#### Feature: Files Changed View

**User Story:**  
> As a developer, I want to see which files Claude has modified, so I can quickly understand the scope of changes.

**Description:**  
A list view showing all files modified in the current session.

**Requirements:**
- [ ] List files changed since session start (via git diff or tool usage parsing)
- [ ] Show file path and change type (added, modified, deleted)
- [ ] Tap file to open diff view
- [ ] Badge/count in navigation showing number of changed files
- [ ] Distinguish between staged and unstaged changes (if relevant)

**Acceptance Criteria:**
- [ ] Given Claude has modified files, when I open files changed view, then I see a list of all modified files
- [ ] Given I tap a file, when it opens, then I see the diff view for that file
- [ ] Given no files have been changed, when I open files changed view, then I see an empty state

**UI/UX Notes:**  
- Access via tab/button in navigation
- File list shows: icon (file type), path, +/- line counts
- Green dot for added, yellow for modified, red for deleted
- Pull to refresh

---

#### Feature: File Diff View

**User Story:**  
> As a developer, I want to see the full file content with changes highlighted, so I can review what Claude did to my code.

**Description:**  
Full file view with additions highlighted in green and deletions highlighted in red.

**Requirements:**
- [ ] Show full file content (not just diff hunks)
- [ ] Highlight added lines with green background
- [ ] Highlight deleted lines with red background
- [ ] Syntax highlighting based on file type
- [ ] Line numbers
- [ ] Horizontally scrollable for long lines
- [ ] Easy way to return to file list

**Acceptance Criteria:**
- [ ] Given I open a modified file, when viewing, then I see the full file with changes highlighted
- [ ] Given a file has additions, when viewing, then added lines have green background
- [ ] Given a file has deletions, when viewing, then deleted lines have red background (shown inline or in separate section)

**UI/UX Notes:**  
- Unified diff view (not side-by-side—too cramped on mobile)
- Deleted lines shown with strikethrough or in collapsible section
- Copy button for code sections
- Pinch to zoom for small text (or use native text scaling)

**Technical Notes:**  
- Use `git diff` under the hood
- Parse diff output and merge with full file content
- Use highlight.js or Prism for syntax highlighting

---

#### Feature: Session Picker

**User Story:**  
> As a developer, I want to view and resume previous sessions, so I can continue work from earlier conversations.

**Description:**  
View recent sessions for the current project, resume a previous session, or start a new one.

**Requirements:**
- [ ] List recent sessions for current project (from ~/.claude/projects/[project])
- [ ] Show session preview: first message, timestamp, message count
- [ ] Tap to resume session (loads conversation history, uses `--continue` or session flag)
- [ ] "New Session" button to start fresh
- [ ] Sessions ordered by most recent first

**Acceptance Criteria:**
- [ ] Given I have multiple sessions, when I open session picker, then I see recent sessions listed
- [ ] Given I tap a previous session, when it loads, then I see that session's conversation history
- [ ] Given I tap "New Session", when it starts, then I get a fresh conversation

**UI/UX Notes:**  
- Access via button in header or conversation view
- Session preview cards with truncated first message
- Current/active session highlighted
- Swipe to delete session (optional for MVP)

---

#### Feature: iMessage Notifications

**User Story:**  
> As a developer away from my laptop, I want to receive a notification when Claude finishes a task, so I know when to check the app.

**Description:**  
Push notifications via iMessage when Claude Code completes a task (using macOS Shortcuts/AppleScript).

**Requirements:**
- [ ] Detect task completion via Claude Code hooks (Stop event)
- [ ] Trigger macOS Shortcut or AppleScript to send iMessage
- [ ] Message includes: project name, brief status, link to app (Tailscale URL)
- [ ] Configurable on/off toggle
- [ ] Rate limit to avoid spam (max 1 notification per minute)

**Acceptance Criteria:**
- [ ] Given Claude finishes a task, when the hook fires, then I receive an iMessage within 10 seconds
- [ ] Given notifications are disabled, when Claude finishes a task, then no iMessage is sent
- [ ] Given the message arrives, when I tap the link, then it opens the web app

**UI/UX Notes:**  
- Setup requires one-time configuration of macOS Shortcut
- Settings page to enable/disable notifications
- Message format: "🤖 GoGoGadgetClaude: Task complete in [project]. [link]"

**Technical Notes:**  
- Use Claude Code's hooks system to detect Stop event
- Hook script triggers `osascript` for AppleScript or `shortcuts run` for Shortcuts
- Alternative: use macOS `terminal-notifier` as simpler option for local notifications

---

## 4. User Flows

### 4.1 Primary Flow: Check Agent Status and Send Follow-up

**Trigger:** Developer steps away from laptop, wants to check on Claude Code  
**Actor:** Solo Developer  
**Goal:** See what Claude did, send the next prompt

```
Open App → See Status (Working/Waiting) → Review Conversation → Send Prompt → Close App
                     ↓
              If Working: Wait or Stop
```

**Steps:**
1. Open GoGoGadgetClaude on phone (Tailscale URL bookmarked)
2. See current project and status at top
3. Review recent conversation messages
4. If agent is waiting, either:
   - Tap quick-select template ("Continue", "Test", etc.)
   - Type/dictate a custom prompt
5. Tap send
6. Optionally review files changed
7. Close app or wait for next completion

**Success State:** Prompt sent successfully, appears in conversation  
**Failure States:** Agent not running, network unreachable, Claude process crashed

---

### 4.2 Flow: Review Code Changes

**Trigger:** Claude finished a task, developer wants to review what changed  
**Actor:** Solo Developer  
**Goal:** Understand and verify code changes before continuing

```
Open App → Tap "Files Changed" → See File List → Tap File → View Diff → Return to Conversation
```

**Steps:**
1. Open app, see "Waiting" status
2. Tap "Files Changed" tab/button
3. See list of modified files with +/- counts
4. Tap a file to see full diff view
5. Scroll through changes (green additions, red deletions)
6. Return to file list or conversation
7. Send follow-up prompt or switch to laptop for detailed review

**Success State:** Developer understands what changed and can make informed decision  
**Failure States:** Git state corrupted, files too large to display

---

### 4.3 Flow: Stop Runaway Agent

**Trigger:** Developer sees Claude doing something wrong  
**Actor:** Solo Developer  
**Goal:** Immediately stop the agent to prevent damage

```
Open App → See Problem in Conversation → Tap Stop → Confirm Stopped → Review Damage
```

**Steps:**
1. Receive notification or open app proactively
2. See "Working" status
3. Notice problematic output in conversation
4. Tap Stop button (red, prominent)
5. Agent terminates immediately
6. Status changes to "Idle"
7. Review files changed to assess damage
8. Use git to revert if needed (on laptop)

**Success State:** Agent stopped within 1 second, no additional damage  
**Failure States:** Process doesn't respond to signal, partial file corruption

---

### 4.4 Critical User Journeys

| Journey | Entry Point | Key Steps | Success Metric |
|---------|-------------|-----------|----------------|
| Quick Check | Push notification | Open → Review → Close | < 30 seconds |
| Send Follow-up | App icon | Open → Review → Send template → Close | < 1 minute |
| Full Review | App icon | Open → Review conversation → View all diffs → Send prompt | < 3 minutes |
| Emergency Stop | App icon | Open → Stop | < 5 seconds |
| Switch Project | App icon | Open → Switch → Review → Send | < 1 minute |

---

## 5. Milestones

### 5.1 MVP (Minimum Loveable Product)

**Functionality Summary:** Monitor and control a single Claude Code session from your phone—see conversation, send prompts (text/voice), view file changes, get notified when done.

**User Goals:**
- Check what Claude is doing without being at my laptop
- Send follow-up prompts via voice or text
- Get notified when tasks complete
- Stop the agent if something goes wrong
- Review code changes on the go

**Features Included:**
| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| Conversation View | See full conversation with markdown/code rendering | Messages display within 3 seconds of JSONL update |
| Status Indicator | Working/Waiting/Idle at a glance | Accurate state shown at all times |
| Text Input | Send prompts via typing | Prompt sent and appears in conversation |
| Voice Input | Dictate prompts with Groq Whisper | Transcription appears for review before send |
| Stop Button | Kill agent immediately | Process terminates within 1 second |
| Project Switcher | Switch between projects | Can switch and see different conversation |
| Quick Templates | One-tap common prompts | Templates load from YAML, insert on tap |
| Files Changed | See list of modified files | All git-tracked changes shown |
| File Diff View | Full file with green/red highlighting | Changes clearly visible with syntax highlighting |
| Session Picker | Resume previous sessions | Can load and continue past sessions |
| iMessage Notifications | Get notified on task complete | iMessage arrives within 10 seconds of completion |

**Technical Scope:**
- Node.js local server (Express or Fastify)
- React web app (Vite build)
- Tailscale for network access
- JSONL file watching for conversation state
- Claude Code hooks integration
- Git CLI for diff generation
- Groq Whisper API for voice transcription
- macOS AppleScript/Shortcuts for iMessage

---

### 5.2 V0.75 (Navigation & Model Control)

**Functionality Summary:** Enhanced project navigation, model switching, and improved voice input UX.

**User Goals:**
- Browse project file tree from my phone
- Switch Claude models without laptop access
- See visual feedback when recording voice prompts

**Features Added/Evolved:**
| Feature | Change from MVP | Rationale |
|---------|-----------------|-----------|
| File Tree View | NEW - Browse project files | Navigate codebase on mobile |
| Model Switching | NEW - Change Claude model | Use different models for different tasks |
| Voice Waveform | NEW - Visual feedback during recording | Know recording is working |

**Technical Scope:**
- File system tree API endpoint
- Claude CLI model switching (`claude config model`)
- Audio visualization (Web Audio API)

---

### 5.3 V1 (Version 1.0)

**Functionality Summary:** Multiple notification channels and serverless execution.

**User Goals:**
- Get notifications via my preferred channel (Slack, Telegram)
- Run agents without keeping laptop awake

**Features Added/Evolved:**
| Feature | Change from MVP | Rationale |
|---------|-----------------|-----------|
| Notification Channel Abstraction | NEW - Pluggable notification system | Easy to add new channels |
| Slack Notifications | NEW - Webhook integration | Many developers live in Slack |
| Telegram Notifications | NEW - Bot API integration | Popular for personal notifications |
| Serverless Execution | NEW - Cloud compute for agents | True async operation |

**Technical Scope:**
- Notification channel abstraction layer
- Slack webhook integration
- Telegram bot setup
- Cloud compute integration (AWS Lambda, Modal, or similar)

---

### 5.4 V2 (Version 2.0)

**Functionality Summary:** Enterprise-ready with work account support, Cursor integration, and enhanced UX.

**User Goals:**
- Use this for work projects with proper security
- Monitor Cursor sessions (when supported)
- Enhanced diff viewing for large changes
- Get email notifications as fallback

**Features Added/Evolved:**
| Feature | Change from MVP | Rationale |
|---------|-----------------|-----------|
| Work Account Support | NEW - Okta SSO integration | Enterprise security requirements |
| GitHub Org Repos | NEW - Org repo support with auth | Access work codebases |
| Cursor Support | NEW - Observe/control Cursor | If Cursor adds CLI agent mode |
| Super App Integration | NEW - Embeddable API/component | Part of larger productivity suite |
| Account Segregation | NEW - Fully separate work/personal | Security and compliance |
| Email Notifications | NEW - SMTP integration | Universal fallback option |
| Enhanced Diff View | ENHANCED - Expand/collapse, better navigation | Large diffs more manageable |

**Technical Scope:**
- Okta OIDC integration
- GitHub OAuth with org permissions
- Cursor observation/control layer (pending Cursor CLI)
- Separate deployment for work instance
- API design for embedding
- Data isolation architecture
- SMTP client (nodemailer)
- Improved diff UI components

---

### 5.5 Not In Scope (Explicit Exclusions)

**Rationale:** Keeping MVP focused on core value proposition; deferring complexity and enterprise features.

| Item | Reason for Exclusion | Potential Future Milestone |
|------|---------------------|---------------------------|
| Multi-session monitoring | Complexity, user said not needed | V2+ if demand arises |
| Real-time streaming | Polling is "good enough", streaming is complex | V1 if latency is painful |
| Command history/favorites | Nice-to-have, not core | V2+ |
| Git operations (commit, push, branch) | Better done on laptop, risky on mobile | V2+ |
| Undo/revert from phone | Risky, git CLI on laptop is safer | Never (by design) |
| Custom themes | System preference is sufficient | Never |
| iPad/tablet optimization | Mobile is primary; tablet works but not optimized | V2+ |

**Boundaries:**
- We will NOT support Cursor (GUI app) in MVP—Claude Code CLI only (V2 target)
- We will NOT run agents in the cloud in MVP—laptop must be awake (V1 adds serverless)
- We will NOT provide authentication on the web UI—Tailscale is the security boundary
- We will NOT auto-send voice prompts—user must explicitly tap send
- We will NOT allow destructive git operations from the phone

---

## 6. Engineering Design Requirements

### 6.1 System Architecture

#### Architecture Overview
**Pattern:** Client-Server (local)  
**Description:** A Node.js server running on the user's laptop serves a React web app. The phone connects via Tailscale private network. Server watches Claude Code's JSONL files and exposes REST API.

```
┌─────────────────┐         ┌─────────────────────────────────────────┐
│   iPhone        │         │   Laptop (macOS)                        │
│   Safari        │         │                                         │
│                 │ Tailscale│  ┌─────────────┐    ┌───────────────┐  │
│  ┌───────────┐  │ Private  │  │  Node.js    │    │  Claude Code  │  │
│  │  React    │◄─┼─Network──┼─►│  Server     │◄──►│  (CLI)        │  │
│  │  Web App  │  │         │  │  :3000      │    │               │  │
│  └───────────┘  │         │  └──────┬──────┘    └───────────────┘  │
│                 │         │         │                    │          │
└─────────────────┘         │         ▼                    ▼          │
                            │  ┌─────────────┐    ┌───────────────┐  │
                            │  │  ~/.claude/ │    │  Git Repo     │  │
                            │  │  (JSONL)    │    │  (Projects)   │  │
                            │  └─────────────┘    └───────────────┘  │
                            │         │                              │
                            │         ▼                              │
                            │  ┌─────────────┐                       │
                            │  │  macOS      │                       │
                            │  │  Shortcuts  │──► iMessage           │
                            │  └─────────────┘                       │
                            └─────────────────────────────────────────┘
```

#### Component Breakdown
| Component | Responsibility | Technology | Notes |
|-----------|---------------|------------|-------|
| Web App | UI, user interaction | React + Vite | Mobile-first PWA |
| API Server | REST endpoints, file watching | Node.js + Express | Runs on laptop |
| JSONL Watcher | Monitor conversation files | chokidar (Node) | Real-time file watching |
| Claude Code Hooks | Detect task completion | Shell scripts | Configured in Claude settings |
| Git Interface | Generate diffs | Node child_process → git | CLI wrapper |
| Voice Transcription | Audio to text | Groq Whisper API | External API call |
| Notification Service | Send alerts | AppleScript/Shortcuts | Local macOS integration |

### 6.2 Technology Stack

#### Frontend
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Framework | React | 18.x | Mature, great mobile web support |
| Build Tool | Vite | 5.x | Fast builds, good DX |
| Styling | Tailwind CSS | 3.x | Rapid UI development, mobile utilities |
| State Management | Zustand | 4.x | Simple, lightweight, no boilerplate |
| Syntax Highlighting | Shiki | 1.x | Accurate highlighting, many themes |
| HTTP Client | Native fetch | - | Built-in, no dependencies |

#### Backend
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Runtime | Node.js | 20.x LTS | Stable, ubiquitous |
| Framework | Express | 4.x | Simple, well-documented |
| File Watching | chokidar | 3.x | Cross-platform file watcher |
| Process Management | execa | 8.x | Better child process handling |
| YAML Parsing | yaml | 2.x | Parse template files |
| Git Operations | simple-git | 3.x | Git CLI wrapper |

#### Infrastructure
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Network Access | Tailscale | Free, secure, easy setup |
| Notifications | macOS Shortcuts/AppleScript | Native, free, reliable |
| Voice Transcription | Groq Whisper API | Free tier, excellent accuracy |
| Voice Fallback | Web Speech API | Built into browser, no cost |

### 6.3 Data Architecture

#### Data Models
```
Session: {
  id: string (UUID),
  projectPath: string,
  projectName: string,
  startedAt: timestamp,
  lastActivityAt: timestamp,
  messageCount: number,
  status: 'working' | 'waiting' | 'idle'
}

Message: {
  id: string,
  sessionId: string,
  type: 'user' | 'assistant',
  content: string,
  timestamp: timestamp,
  toolUse?: ToolUseEvent[]
}

ToolUseEvent: {
  tool: string,
  input: object,
  output?: string,
  status: 'pending' | 'complete' | 'error'
}

Project: {
  path: string,
  name: string,
  lastSessionId: string,
  sessionCount: number,
  templates: Template[]
}

Template: {
  label: string,
  icon: string,
  prompt: string
}

FileChange: {
  path: string,
  status: 'added' | 'modified' | 'deleted',
  additions: number,
  deletions: number
}
```

#### Data Storage
| Data | Storage Location | Format |
|------|------------------|--------|
| Conversations | ~/.claude/projects/[path]/[session].jsonl | JSONL (Claude-managed) |
| Templates | [repo]/.claude/templates.yaml | YAML |
| App Settings | ~/.gogogadgetclaude/settings.json | JSON |
| Last Project | localStorage (browser) | String |

#### Data Flow
1. **Read:** Server watches JSONL files → parses → serves via API → React fetches → displays
2. **Write:** User types prompt → React sends to API → Server spawns `claude -p` → Claude writes JSONL → cycle continues
3. **Notifications:** Claude hook fires → Server receives → triggers AppleScript → iMessage sent

### 6.4 API Design

#### API Style
**Type:** REST  
**Base URL:** `http://[tailscale-host]:3000/api`  
**Format:** JSON

#### Key Endpoints
| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/projects` | GET | List all projects with sessions | No (Tailscale is auth) |
| `/projects/:path/sessions` | GET | List sessions for project | No |
| `/sessions/:id` | GET | Get session details + messages | No |
| `/sessions/:id/messages` | GET | Get messages (supports ?since=timestamp) | No |
| `/sessions/:id/send` | POST | Send prompt to session | No |
| `/sessions/:id/stop` | POST | Stop running agent | No |
| `/projects/:path/files` | GET | Get changed files (git diff) | No |
| `/projects/:path/files/:filepath` | GET | Get file diff | No |
| `/projects/:path/templates` | GET | Get prompt templates | No |
| `/settings` | GET/PUT | App settings | No |
| `/transcribe` | POST | Transcribe audio (multipart) | No |
| `/status` | GET | Server health + Claude status | No |

#### Request/Response Standards
- **Success:** `{ "data": ... }`
- **Error:** `{ "error": { "code": "ERROR_CODE", "message": "Human readable" } }`
- **Timestamps:** ISO 8601 format

### 6.5 Authentication & Authorization

#### Authentication Strategy
- **Method:** None required—Tailscale provides network-level authentication
- **Rationale:** Only devices on your Tailscale network can reach the server. This is sufficient for personal use.

#### Future (V2)
- Okta OIDC for work accounts
- Separate deployment with proper auth

### 6.6 Third-Party Integrations

| Service | Purpose | Integration Method | Criticality |
|---------|---------|-------------------|-------------|
| Tailscale | Network access | System install | Critical |
| Groq | Voice transcription | REST API | Important |
| Claude Code | Core functionality | CLI + file system | Critical |
| macOS Shortcuts | Notifications | AppleScript/CLI | Important |
| Git | Diff generation | CLI | Important |

### 6.7 Security Requirements

#### Security Measures
- [x] **Network Security:** Tailscale encrypted tunnel (WireGuard-based)
- [x] **Data Encryption:** In-transit via Tailscale; at-rest is user's responsibility
- [x] **Input Validation:** Validate all API inputs, sanitize file paths
- [x] **Path Traversal Prevention:** Restrict file access to known project directories
- [ ] **Rate Limiting:** Not required for single-user local app
- [ ] **CSRF:** Not required (same-origin, no cookies for auth)
- [ ] **XSS:** React auto-escapes; sanitize any HTML rendering

#### Sensitive Data Handling
| Data Type | Classification | Storage | Access Control |
|-----------|---------------|---------|----------------|
| Conversation history | Personal | Local filesystem | Tailscale network |
| Voice recordings | Personal | Transient (not stored) | N/A |
| Git credentials | Sensitive | System keychain | Not accessed by app |
| API keys (Groq) | Sensitive | Environment variable | Server-side only |

### 6.8 Error Handling & Logging

#### Error Handling Strategy
- **Client Errors:** Display toast notification with retry option
- **Server Errors:** Log to console, return generic message to client
- **Network Errors:** Show offline banner, auto-retry when reconnected
- **Claude Errors:** Display in conversation view as system message

#### Logging Standards
| Level | When to Use | Example |
|-------|-------------|---------|
| ERROR | Failures requiring attention | Process spawn failed, file read error |
| WARN | Recoverable issues | JSONL parse warning, missing template file |
| INFO | Normal operations | Server started, session loaded, prompt sent |
| DEBUG | Development diagnostics | API request details, file watch events |

### 6.9 Testing Strategy

| Test Type | Coverage Target | Tools | Responsibility |
|-----------|-----------------|-------|----------------|
| Unit Tests | Utility functions, parsers | Vitest | Developer |
| Integration Tests | API endpoints | Vitest + Supertest | Developer |
| E2E Tests | Critical user flows | Playwright | Developer (manual for MVP) |
| Manual Testing | Full app experience | Real device | Developer |

### 6.10 DevOps & Deployment

#### Environments
| Environment | Purpose | URL | Data |
|-------------|---------|-----|------|
| Development | Local dev | localhost:3000 | Real JSONL files |
| Production | User's laptop | [tailscale]:3000 | Real JSONL files |

#### Deployment Strategy
- **Method:** Manual start (npm script or daemon)
- **Future:** LaunchAgent for auto-start on boot
- **Rollback:** Git checkout previous version

#### Startup Flow
```bash
# One-time setup
npm install
cp .env.example .env  # Add Groq API key

# Start server
npm run start  # Runs server on :3000
```

---

## 7. Non-Functional Requirements

### 7.1 Performance Requirements

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Page Load Time | < 1s | Lighthouse |
| Conversation Update Latency | < 3s | Manual testing |
| Voice Transcription | < 5s | Manual testing |
| API Response Time (p50) | < 100ms | Server logs |
| Stop Command Execution | < 1s | Manual testing |

### 7.2 Scalability Requirements

| Dimension | Target | Notes |
|-----------|--------|-------|
| Concurrent Sessions | 1 | Single-user app |
| Projects | Unlimited | Filesystem-limited |
| Message History | 10,000+ | JSONL can grow large |
| Conversation Length | Any | Paginate if needed |

### 7.3 Reliability & Availability

- **Target Uptime:** N/A (local app, depends on laptop)
- **Graceful Degradation:** App works offline for viewing cached data
- **Data Durability:** Relies on Claude's JSONL files (not app's responsibility)

### 7.4 Browser & Device Support

| Browser | Minimum Version | Priority |
|---------|-----------------|----------|
| Safari (iOS) | 15+ | P0 |
| Chrome (iOS) | 100+ | P1 |
| Safari (macOS) | 15+ | P1 (for testing) |
| Chrome (desktop) | 100+ | P2 (for testing) |

| Device Type | Support Level | Notes |
|-------------|---------------|-------|
| iPhone | Full | Primary target |
| iPad | Partial | Works but not optimized |
| Mac | Partial | For development/testing |
| Android | Partial | Should work, not tested |

### 7.5 Internationalization & Localization

- **Supported Languages:** English only (MVP)
- **Date/Time Formats:** Relative ("2m ago") with system locale
- **Future:** i18n framework if expanding to other languages

---

*Last Updated: 2026-01-15*
