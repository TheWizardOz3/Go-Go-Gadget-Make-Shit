# Changelog: GoGoGadgetClaude

> **Purpose:** Development history tracking all notable changes. Follows [Keep a Changelog](https://keepachangelog.com/) conventions. For architectural decisions and rationale, see `decision_log.md`.

**Related Documents:**
- `decision_log.md` — Why changes were made
- `architecture.md` — Technical implementation details
- `product_spec.md` — Product requirements

---

## Version Index

| Version | Date | Type | Summary |
|---------|------|------|---------|
| 0.13.0 | 2026-01-15 | prerelease | Voice Input complete |
| 0.12.0 | 2026-01-15 | prerelease | File Diff View complete |
| 0.11.0 | 2026-01-14 | prerelease | Files Changed View complete |
| 0.10.0 | 2026-01-14 | prerelease | Quick Templates complete |
| 0.9.0 | 2026-01-14 | prerelease | Session Picker complete |
| 0.8.0 | 2026-01-14 | prerelease | Project Switcher complete |
| 0.7.0 | 2026-01-14 | prerelease | Stop Button complete |
| 0.6.0 | 2026-01-14 | prerelease | Text Input & Send complete |
| 0.5.0 | 2026-01-14 | prerelease | Status Indicator complete |
| 0.4.0 | 2026-01-14 | prerelease | Conversation View UI complete |
| 0.3.0 | 2026-01-14 | prerelease | JSONL Watcher Service complete |
| 0.2.0 | 2026-01-14 | prerelease | API Server Setup complete |
| 0.1.0 | 2026-01-13 | prerelease | Project scaffolding complete |
| 0.0.2 | 2026-01-13 | prerelease | Technical architecture documentation |
| 0.0.1 | 2026-01-13 | prerelease | Initial product specification |

**Types:** `major` | `minor` | `patch` | `prerelease`

---

## Releases

<!-- Add new versions below this line, newest first -->

## [Unreleased]

*Nothing unreleased*

---

## [0.13.0] - 2026-01-15

### Added
- **Voice Input** — Dictate prompts with Groq Whisper transcription for hands-free interaction
  - Tap-to-record button (tap to start, tap to stop—not hold-to-record)
  - Visual feedback: microphone icon (idle), stop icon with red pulse (recording), spinner (processing)
  - Transcription via Groq Whisper API (primary) with Web Speech API fallback
  - Transcribed text appears in input field for review/editing before send
  - Recording duration tracking with 2-minute max auto-stop
  - Haptic feedback on button tap (mobile devices)

- **VoiceButton Component** — `client/src/components/conversation/VoiceButton.tsx`
  - Three visual states: idle (microphone), recording (stop + pulse), processing (spinner)
  - Disabled state handling during send/processing
  - Accessible aria-labels that update based on state
  - 44×44px touch target for mobile usability

- **useVoiceInput Hook** — `client/src/hooks/useVoiceInput.ts`
  - MediaRecorder API for audio capture with optimal settings for Whisper
  - Web Speech API parallel recording as fallback transcription source
  - Automatic cleanup of media streams and recognition on unmount
  - State machine: idle → recording → processing → idle (or error)
  - Min recording duration check (0.5s) to avoid accidental taps

- **Transcription Service** — `server/src/services/transcriptionService.ts`
  - Groq Whisper API integration (`whisper-large-v3` model)
  - 30-second request timeout with proper abort handling
  - Error handling for 401 (invalid key), 429 (rate limit), 413 (file too large)
  - Audio size validation (25MB max per Whisper limit)
  - MIME type to file extension mapping for proper file naming

- **Transcription API Endpoint** — `POST /api/transcribe`
  - Accepts multipart/form-data with audio file
  - Multer middleware for memory storage (no disk writes)
  - 25MB file size limit enforced
  - Returns `{ text, empty }` on success
  - Proper error codes: VALIDATION_ERROR, SERVICE_UNAVAILABLE, RATE_LIMITED, etc.

- **API Client Upload Method** — `api.upload()` for FormData requests
  - Handles multipart/form-data without manually setting Content-Type
  - Proper error handling with ApiError class

- **Error Toast Enhancement** — Toast now supports error styling
  - Red background with error icon for voice input failures
  - Auto-dismiss after 3 seconds
  - Error messages: permission denied, no microphone, transcription failed

### Changed
- **PromptInput** — Integrated VoiceButton between textarea and send button
  - Voice input disabled when Claude is working or during send
  - Textarea disabled during recording/processing
  - Transcription appends to existing text or replaces if empty

### Dependencies
- Added `multer` (^2.0.2) for multipart form data parsing
- Added `@types/multer` (^2.0.0) for TypeScript support

### Tests
- 46 new tests for Voice Input feature (460 total)
  - `transcriptionService.test.ts`: 13 tests
  - `useVoiceInput.test.ts`: 15 tests  
  - `VoiceButton.test.tsx`: 18 tests

---

## [0.12.0] - 2026-01-15

### Added
- **File Diff View** — Full file content display with green/red change highlighting for mobile code review
  - Tap a file in Files Changed View to see its full diff
  - Green background for added lines, red background with subtle styling for deleted lines
  - Line numbers displayed for all lines
  - Horizontal scrolling for long lines
  - Binary file detection with friendly message ("Cannot display diff for binary files")
  - Large file warning (5000+ lines) with "Load anyway" button to prevent mobile performance issues
  - Loading skeleton with shimmer animation matching diff structure
  - Error states with retry functionality
  - Empty state for files with no changes
  - "Jump to next change" floating action button (UI ready, scroll logic TODO)
  - Sticky header with file path (tap to expand/collapse long paths)
  - Back navigation to Files Changed View

- **Git Diff Service** — Extended `gitService.ts` for detailed file diffs
  - `getFileDiff()` function with options object `{ projectPath, filePath, context }`
  - Unified diff parsing into structured `FileDiff` → `DiffHunk[]` → `DiffLine[]`
  - Binary file detection via `git diff --numstat` (shows `-\t-\t` for binary)
  - Language detection from file extension (40+ extensions mapped to Shiki languages)
  - Large file flagging (`isTooBig: true` for 10,000+ line diffs)
  - Path traversal prevention (rejects `../` and absolute paths)
  - Handles new files, deleted files, and modified files

- **File Diff API Endpoint**
  - `GET /api/projects/:encodedPath/files/*filepath` — Returns `FileDiff` structure
  - Query param: `?context=N` for context lines (default: full file)
  - Security: Path validation prevents directory traversal attacks
  - Proper error responses for not-found, not-git-repo, invalid-path

- **useFileDiff Hook** — SWR-based data fetching for file diffs
  - No automatic revalidation (diffs are static until refreshed)
  - Keep previous data while revalidating
  - Manual refresh via `mutate()` function
  - Error retry with 1s interval, max 2 retries

- **Diff UI Components**
  - `DiffViewer` — Main container orchestrating all states (loading, error, binary, success)
  - `DiffHeader` — Sticky header with back button, file path, optional menu
  - `DiffContent` — Renders hunks with large file warning/confirmation
  - `DiffLine` — Single line with background color based on type
  - `DiffLineNumber` — Line number with +/- indicators
  - `DiffLoadingSkeleton` — Animated skeleton matching diff structure
  - `DiffEmptyState` — Error, not-found, and no-changes states
  - `BinaryFileView` — Friendly message for binary files
  - `JumpToChangeButton` — Floating button showing remaining changes

- **Mobile UX Enhancements**
  - Pinch-to-zoom enabled via viewport meta tag (`user-scalable=yes, maximum-scale=5.0`)
  - Touch-friendly 44×44px minimum touch targets
  - Monospace font for code readability

### Technical Details
- **Files Created (Frontend):**
  - `client/src/hooks/useFileDiff.ts` — SWR hook for fetching diffs
  - `client/src/hooks/useFileDiff.test.ts` — 14 unit tests
  - `client/src/lib/languageDetector.ts` — File extension to language mapping
  - `client/src/lib/languageDetector.test.ts` — 34 unit tests
  - `client/src/components/files/diff/` — 9 new components with barrel export

- **Files Modified (Backend):**
  - `server/src/services/gitService.ts` — Added `getFileDiff()`, diff parsing utilities
  - `server/src/services/gitService.test.ts` — Extended with 6 new tests for `getFileDiff`
  - `server/src/api/projects.ts` — Implemented `/files/*filepath` endpoint

- **Shared Types Extended:**
  - `FileDiff` — Added `isBinary`, `isTooBig`, `language`, `oldPath` fields

### Tests
- 54 new tests across client and server
- Total test count: **414 tests** (277 client + 137 server)
- All tests passing, lint clean, typecheck clean

### Notes
- Syntax highlighting with Shiki not yet integrated (lines render without highlighting)
- "Jump to next change" button has UI but scroll-to-change logic is TODO
- Virtualization with `react-window` not yet implemented (considered for V1 if needed)

---

## [0.11.0] - 2026-01-14

### Added
- **Files Changed View** — List view showing all files modified in the current project
  - Bottom tab navigation with Chat and Files tabs
  - Badge on Files tab showing count of changed files (99+ max display)
  - File list showing filename, directory path, and +/- line counts
  - Status icons: green + for added, yellow pencil for modified, red - for deleted
  - Tap file to navigate to diff view placeholder
  - Back button returns to file list
  - Empty state when no files changed
  - Loading skeletons during fetch
  - 5-second polling interval for file changes

- **Git Service** — Backend service for Git operations
  - `gitService.ts` using `simple-git` package
  - `isGitRepo()` — Check if path is a git repository
  - `getChangedFiles()` — Get staged, unstaged, and untracked files
  - `getRepoRoot()` — Get repository root directory
  - Combines staged and unstaged diff stats
  - Handles binary files gracefully (no line counts)

- **Files API Endpoint** — New endpoint for fetching changed files
  - `GET /api/projects/:encodedPath/files` — Returns `FileChange[]`
  - `GET /api/projects/:encodedPath/files/*` — Placeholder for file diff (501 Not Implemented)
  - Returns empty array for non-git projects

- **useFilesChanged Hook** — SWR-based data fetching for changed files
  - 5-second polling interval
  - `count` property for badge display
  - Revalidates on window focus
  - Keeps previous data while revalidating

- **File Diff Types** — Shared types for future diff view feature
  - `DiffLine`, `DiffHunk`, `FileDiff` interfaces in `shared/types/index.ts`

- **FileDiffPlaceholder Component** — Placeholder for upcoming File Diff View feature
  - Shows file path and "Coming Soon" message
  - Back button for navigation

### Dependencies
- Added `simple-git@^3.27.0` to server

### Tests
- 65 new tests across 5 test files
- Total test count now: 360

---

## [0.10.0] - 2026-01-14

### Added
- **Quick Templates** — One-tap prompt templates for common vibe-coding workflow commands
  - Horizontally scrollable chips displayed above the prompt input
  - 6 default templates matching vibe-coding-prompts workflow:
    - 📋 Plan Milestone, 📝 Plan Feature, 🔨 Build Task
    - 🧪 Test, ✅ Finalize, 🔧 Fix/Update
  - Templates load from per-project `.claude/templates.yaml` with default fallback
  - YAML schema: `templates: [{label, icon?, prompt}]`
  - Template tap inserts prompt into input field for review before sending
  - Haptic feedback on tap (30ms vibration via Vibration API)
  - Disabled state when Claude is working
  - Loading skeleton while templates are being fetched
  - 44px minimum touch targets for accessibility

- **Template Service** — Backend service for loading templates
  - `templateService.ts` with `getTemplates()` and `getDefaultTemplates()`
  - YAML parsing with `yaml` package
  - Graceful fallback to defaults on file not found, parse errors, or invalid schema
  - Filters out invalid templates (missing label or prompt)

- **Templates API Endpoint** — New endpoint for fetching project templates
  - `GET /api/projects/:encodedPath/templates`
  - Returns project-specific templates or defaults

- **useTemplates Hook** — SWR-based data fetching for templates
  - 1-minute deduping interval (templates don't change often)
  - No auto-refresh (static data)
  - Error handling with single retry

- **TemplateChips Component** — UI component for template display
  - `TemplateChips` — Horizontal scrollable toolbar of template buttons
  - `TemplateChipsSkeleton` — Loading state with animated placeholders
  - Icons rendered with `aria-hidden="true"` for accessibility
  - Proper ARIA labels for screen readers

### Fixed
- **Empty conversation templates** — Templates weren't rendering when conversation was empty (no messages). Fixed by adding TemplateChips to the empty messages return block in `ConversationView.tsx`.

### Technical Details
- **Dependencies Added:**
  - `yaml@^2.4.5` (server) — YAML parsing for templates.yaml files

- **Files Created:**
  - `server/src/services/templateService.ts` — Template loading service
  - `server/src/services/templateService.test.ts` — 16 unit tests
  - `client/src/hooks/useTemplates.ts` — SWR hook for templates
  - `client/src/hooks/useTemplates.test.ts` — 11 unit tests
  - `client/src/components/conversation/TemplateChips.tsx` — UI component + skeleton
  - `client/src/components/conversation/TemplateChips.test.tsx` — 24 unit tests

- **Files Modified:**
  - `server/src/api/projects.ts` — Added templates endpoint
  - `client/src/components/conversation/ConversationView.tsx` — Integrated templates
  - `client/src/components/conversation/PromptInput.tsx` — External value control
  - `client/src/App.tsx` — Pass encodedPath to ConversationView

### Verified
- All 8 implementation tasks complete
- `pnpm lint` passes with 0 errors
- `pnpm typecheck` passes with 0 errors
- `pnpm test` passes with **295 tests** (180 client + 115 server)
- **51 new tests** (244 → 295 total)
- Manual browser testing: templates load, scroll, insert on tap

---

## [0.9.0] - 2026-01-14

### Added
- **Session Picker** — Switch between multiple sessions within a project
  - Tappable "Select session" row in header below project name
  - Full-screen modal with slide-up animation and dark backdrop (matches ProjectPicker)
  - Session list showing chat bubble icon, preview text (first user message), relative timestamp, message count
  - Selected session highlighted with accent color and checkmark
  - Search input when >10 sessions (case-insensitive filtering on preview text)
  - Empty states for no sessions and no search results
  - Keyboard accessibility (Escape to close, Enter/Space to select)

- **Session Preview** — Show first user message as session identifier
  - `getFirstUserMessagePreview()` extracts and truncates first user message to 100 chars
  - `preview` field added to `SessionSummary` type (shared types)
  - Displays "Empty session" (italic, muted) for sessions without user messages

- **New Session API** — Start fresh Claude Code sessions from mobile
  - `POST /api/sessions/new` endpoint with `projectPath` and optional `prompt`
  - `startNewSession()` in claudeService spawns `claude -p` process
  - Prominent "New Session" button with accent color and plus icon
  - Loading state with spinner during session creation
  - Error display on failure

- **Per-Project Session Persistence** — Remember selected session per project
  - Key: `gogogadgetclaude:lastSession:{encodedPath}`
  - Auto-selects most recent session when switching projects
  - Graceful fallback when stored session no longer exists

### Changed
- Header now has two-row layout: project name (top) + session indicator (bottom)
- Touch targets verified at 44×44px minimum for all interactive elements

### Technical Details
- New components: `SessionPicker.tsx`, `SessionListItem.tsx`
- Barrel export: `client/src/components/session/index.ts`
- Backend: `getFirstUserMessagePreview()` in `jsonlParser.ts`
- Backend: `startNewSession()` in `claudeService.ts`
- API: `POST /sessions/new` with Zod validation
- **49 new tests** (195 → 244 total)

---

## [0.8.0] - 2026-01-14

### Added
- **Project Switcher** — Switch between multiple Claude Code projects from mobile
  - Tappable project name in header with chevron dropdown indicator
  - Full-screen modal with slide-up animation and dark backdrop
  - Project list showing folder icon, name, last activity (relative time), session count
  - Selected project highlighted with blue background and checkmark
  - Search input when >10 projects (case-insensitive filtering)
  - Keyboard accessibility (Escape to close, Enter/Space to select)
  - Body scroll lock when modal is open

- **localStorage Persistence** — Selected project remembered across sessions
  - Key: `gogogadgetclaude:lastProject`
  - Graceful fallback when stored project no longer exists
  - Handles localStorage unavailability (private browsing)

- **Custom CSS Animations** — Modal transitions without external dependencies
  - `animate-fade-in` / `animate-fade-out` for backdrop
  - `animate-slide-up` / `animate-slide-down` for modal
  - Full `prefers-reduced-motion` support

- **Unit Tests** — 35 new tests for the feature
  - `ProjectListItem.test.tsx` (13 tests): Rendering, selection states, interaction
  - `ProjectPicker.test.tsx` (22 tests): Visibility, closing behavior, search, accessibility

### Files Created
- `client/src/components/project/ProjectListItem.tsx` — Single project row component
- `client/src/components/project/ProjectListItem.test.tsx` — Unit tests
- `client/src/components/project/ProjectPicker.tsx` — Full modal component with search
- `client/src/components/project/ProjectPicker.test.tsx` — Unit tests
- `client/src/components/project/index.ts` — Barrel export

### Files Modified
- `client/src/App.tsx` — Modal state, tappable header, localStorage persistence
- `client/src/index.css` — Custom modal animations with reduced-motion support

### Verified
- All 6 implementation tasks complete
- `pnpm lint` passes with 0 errors
- `pnpm typecheck` passes with 0 errors
- `pnpm test` passes with 195 tests (106 client + 89 server)
- Manual UI testing verified: modal opens, project selection works, persistence works

---

## [0.7.0] - 2026-01-14

### Added
- **Stop Button** — Emergency stop button for halting Claude Code when it goes off the rails
  - Red stop button (square icon) replaces send button when Claude is working
  - Single-tap to stop with no confirmation modal (speed matters)
  - Haptic feedback on tap via Vibration API
  - Toast notification "Agent stopped" on successful stop
  - Optimistic UI update (status changes to idle immediately)

- **Process Management** — Backend service for tracking and stopping Claude processes
  - `processManager.ts` — In-memory tracking of active Claude processes by session ID
  - `trackProcess()`, `untrackProcess()`, `getActiveProcess()`, `hasActiveProcess()`
  - Automatic cleanup when processes exit naturally

- **Stop Agent Function** — Graceful shutdown with escalating signals
  - `stopAgent()` function in `claudeService.ts`
  - Signal escalation: SIGINT → SIGTERM (2s timeout) → SIGKILL (2s timeout)
  - Returns detailed result with `processKilled`, `signal`, and `message`

- **Stop API Endpoint** — New endpoint for stopping sessions
  - `POST /api/sessions/:id/stop`
  - Returns 404 for non-existent sessions
  - Returns `processKilled: false` when no active process
  - Returns `processKilled: true` with signal used when process was killed

- **useStopAgent Hook** — React hook for stop functionality
  - Tracks `isStopping` loading state and `error` state
  - Optimistic UI update with SWR mutation
  - Automatic conversation refresh after successful stop

- **Unit Tests** — 27 new tests for the feature
  - `processManager.test.ts` (15 tests): Track, untrack, multi-session handling
  - `claudeService.test.ts` (3 new tests): stopAgent behavior
  - `useStopAgent.test.ts` (8 tests): Hook states, error handling, debouncing

### Files Created
- `server/src/services/processManager.ts` — Process tracking service
- `server/src/services/processManager.test.ts` — Unit tests
- `client/src/components/conversation/StopButton.tsx` — Stop button component
- `client/src/hooks/useStopAgent.ts` — Stop agent hook
- `client/src/hooks/useStopAgent.test.ts` — Unit tests

### Files Modified
- `server/src/services/claudeService.ts` — Added process tracking and stopAgent function
- `server/src/services/claudeService.test.ts` — Updated tests for process tracking
- `server/src/api/sessions.ts` — Implemented stop endpoint
- `client/src/components/conversation/PromptInput.tsx` — Integrated StopButton
- `client/src/components/conversation/ConversationView.tsx` — Wired up stop functionality and toast

### Verified
- All 7 implementation tasks complete
- `pnpm lint` passes with 0 errors
- `pnpm typecheck` passes with 0 errors
- `pnpm test` passes with 160 tests (71 client + 89 server)
- UI verified: Stop button hidden when idle, shows when working

---

## [0.6.0] - 2026-01-14

### Added
- **Text Input & Send** — Send prompts to Claude Code from the mobile UI
  - Auto-expanding textarea (44px min, 150px max height)
  - Send button with enabled/disabled states and loading spinner
  - Enter key submits on desktop, Shift+Enter for newlines
  - localStorage persistence for draft text (survives app backgrounding)
  - Safe-area-inset handling for iPhone notch/home bar
  - Mobile-optimized: 16px font (prevents iOS zoom), 44×44px touch targets

- **Claude CLI Integration** — Backend service for spawning Claude processes
  - `claudeService.ts` with `sendPrompt()` function
  - Spawns `claude -p "prompt" --continue` as detached background process
  - Process runs independently, writes to JSONL files (picked up by polling)
  - Availability check for Claude CLI installation

- **Send Prompt API** — New endpoint for sending prompts
  - `POST /api/sessions/:id/send` with Zod validation
  - Returns `{ success: true, pid }` on successful spawn
  - Proper error handling for missing session, CLI not found, spawn failure

- **Unit Tests** — 36 new tests for the feature
  - `claudeService.test.ts` (6 tests): Spawn arguments, error handling
  - `useSendPrompt.test.ts` (10 tests): Loading states, error handling, validation
  - `PromptInput.test.tsx` (20 tests): Disabled states, send behavior, localStorage

### Dependencies Added

**Client:**
- `@testing-library/user-event@^14.6.1` — User event simulation for tests

**Server:**
- `execa@^8.0.1` — Process spawning for Claude CLI

### Files Created
- `server/src/services/claudeService.ts` — Claude CLI integration service
- `server/src/services/claudeService.test.ts` — Unit tests
- `client/src/components/conversation/PromptInput.tsx` — Text input component
- `client/src/components/conversation/PromptInput.test.tsx` — Unit tests
- `client/src/hooks/useSendPrompt.ts` — Send prompt hook
- `client/src/hooks/useSendPrompt.test.ts` — Unit tests

### Files Modified
- `server/src/api/sessions.ts` — Added POST /:id/send endpoint
- `client/src/components/conversation/ConversationView.tsx` — Integrated PromptInput

### Verified
- All 8 implementation tasks complete
- `pnpm lint` passes with 0 errors
- `pnpm typecheck` passes with 0 errors
- `pnpm test` passes with 133 tests (63 client + 70 server)
- Manual UI testing verified: input renders, button enables, localStorage works

---

## [0.5.0] - 2026-01-14

### Added
- **Status Indicator** — Visual feedback for Claude Code session state in app header
  - Pill-shaped badge showing Working (blue), Waiting (amber), or Idle (gray) status
  - Pulse animation for "Working" state with `prefers-reduced-motion` support
  - Status dot + label format with proper accessibility (role="status", aria-live="polite")
  - Loading skeleton while status is being fetched
  - Defaults to "Idle" when status is undefined or no session selected

- **Warning Color Token** — Added `--color-warning` design token
  - Light mode: `#F59E0B`
  - Dark mode: `#FBBF24`
  - Added to both CSS variables and Tailwind config

- **Unit Tests** — 9 new tests for StatusIndicator component
  - Tests for all three status states (Working, Waiting, Idle)
  - Tests for undefined status handling
  - Tests for accessibility attributes
  - Tests for custom className support
  - Tests for skeleton component

### Technical Details
- **New Files:**
  - `client/src/components/ui/StatusIndicator.tsx` — Main component + skeleton
  - `client/src/components/ui/StatusIndicator.test.tsx` — 9 unit tests

- **Modified Files:**
  - `client/src/App.tsx` — Integrated StatusIndicator into Header
  - `client/src/index.css` — Added warning color token and pulse animation
  - `client/tailwind.config.js` — Added warning color to theme

### Verified
- All 4 implementation tasks complete
- `pnpm lint` passes with 0 errors
- `pnpm typecheck` passes with 0 errors
- `pnpm test` passes with 97 tests (33 client + 64 server)
- Manual UI testing verified in browser

---

## [0.4.0] - 2026-01-14

### Added
- **Conversation View UI** — Primary mobile interface for viewing Claude Code conversations
  - Cursor-style document layout with full-width messages
  - Message turns with distinct user/assistant styling (icons, headers, borders)
  - Markdown rendering with `react-markdown` for headers, lists, links, etc.
  - Syntax-highlighted code blocks using Shiki with copy button
  - Collapsible tool usage cards showing tool inputs/outputs
  - Auto-scroll to latest messages (pauses when user scrolls up)
  - "Jump to Latest" floating button for quick navigation
  - Pull-to-refresh gesture for manual refresh on iOS Safari
  - Loading skeletons and error states
  - Status badge (Working/Waiting/Idle) with refresh indicator
  - Empty states for no session selected or no messages

- **Data Fetching** — SWR-based hook for efficient conversation polling
  - `useConversation` hook with 2.5s polling interval
  - Automatic cache revalidation on focus
  - Error retry with exponential backoff
  - Refresh function for manual invalidation

- **Utilities** — Supporting functions and configuration
  - `formatters.ts` — Relative time formatting (e.g., "2m ago")
  - `markdown.tsx` — React-markdown component configuration
  - Path aliases (`@/` and `@shared/`) for clean imports

- **Testing Infrastructure** — Vitest setup for client and server packages
  - Client: `formatters.test.ts` with 24 unit tests
  - Server: `jsonlParser.test.ts` with 21 unit tests
  - Server: `pathEncoder.test.ts` with 29 unit tests
  - Server: `sessionManager.test.ts` with 14 unit tests
  - **Total: 88 unit tests across both packages**

### Fixed
- **User message parsing bug** — Claude Code JSONL stores user message content as arrays of content blocks (not just strings). Updated `server/src/lib/jsonlParser.ts` to handle both formats correctly.

### Dependencies Added

**Client:**
- `swr@^2.3.8` — Data fetching with caching and polling
- `react-markdown@^10.1.0` — Markdown rendering
- `shiki@^3.21.0` — Syntax highlighting
- `date-fns@^4.1.0` — Date formatting
- `vitest@^4.0.17` — Unit testing framework
- `@testing-library/react@^16.3.1` — React testing utilities
- `@testing-library/jest-dom@^6.9.1` — DOM assertions
- `jsdom@^27.4.0` — DOM environment for tests

**Server:**
- `vitest@^4.0.17` — Unit testing framework

### Files Created
- `client/src/hooks/useConversation.ts`
- `client/src/hooks/useProjects.ts`
- `client/src/hooks/useSessions.ts`
- `client/src/lib/formatters.ts`
- `client/src/lib/markdown.tsx`
- `client/src/components/conversation/ConversationView.tsx`
- `client/src/components/conversation/MessageList.tsx`
- `client/src/components/conversation/MessageTurn.tsx`
- `client/src/components/conversation/CodeBlock.tsx`
- `client/src/components/conversation/ToolUseCard.tsx`
- `client/src/components/conversation/JumpToLatest.tsx`
- `client/src/components/conversation/EmptyState.tsx`
- `client/src/components/conversation/PullToRefresh.tsx`
- `client/src/components/ui/Skeleton.tsx`
- `client/src/components/ui/ErrorState.tsx`
- `client/src/lib/formatters.test.ts`
- `client/vitest.config.ts`
- `client/src/test/setup.ts`
- `server/vitest.config.ts`
- `server/src/lib/jsonlParser.test.ts`
- `server/src/lib/pathEncoder.test.ts`
- `server/src/services/sessionManager.test.ts`

### Verified
- All 12 implementation tasks complete
- `pnpm lint` passes with 0 errors
- `pnpm typecheck` passes with 0 errors
- `pnpm -r test` passes with 88 tests (24 client + 64 server)
- Components ready for integration testing

---

## [0.3.0] - 2026-01-14

### Added
- **JSONL Watcher Service** — Core data layer for parsing Claude Code session files
  - JSONL parser for Claude Code's session format (user, assistant, tool_use messages)
  - Project scanner to discover projects in `~/.claude/projects/`
  - Session manager with in-memory caching (30s TTL for sessions, 5min for projects)
  - File watcher using chokidar with automatic cache invalidation
  - Path encoder/decoder for Claude's folder naming scheme
  - Status detection logic (working/waiting/idle) based on Claude process + message state

- **API Endpoints** — Full implementation of session and project data endpoints
  - `GET /api/projects` — List all projects with session counts and last activity
  - `GET /api/projects/:encodedPath` — Get single project details
  - `GET /api/projects/:encodedPath/sessions` — List sessions for a specific project
  - `GET /api/sessions` — List recent sessions across all projects (with `?limit=`)
  - `GET /api/sessions/:id` — Get full session details with messages
  - `GET /api/sessions/:id/messages` — Get messages with `?since=` for efficient polling
  - `GET /api/sessions/:id/status` — Get current session status

### Fixed
- **Path Decoding Bug** — Claude's folder encoding is not reversible since directories can contain hyphens. Now extracts actual path from JSONL `cwd` field instead of decoding folder names.

### Technical Details
- **New Files:**
  - `server/src/lib/jsonlParser.ts` — Parse JSONL, transform to Messages, extract metadata
  - `server/src/lib/pathEncoder.ts` — Encode/decode paths, get project names
  - `server/src/lib/fileWatcher.ts` — Watch JSONL files with chokidar
  - `server/src/services/projectScanner.ts` — Scan projects directory
  - `server/src/services/sessionManager.ts` — Session loading, caching, status

- **Dependencies Added:**
  - `chokidar@^3.6.0` — File system watching

### Verified
- All 6 acceptance criteria passing
- 9 API endpoint tests passing (all return expected HTTP status codes)
- File watcher starts and registers callbacks on server startup
- Caching working (cache hits visible in server logs)
- Error handling working (404 for not found, 400 for invalid input)
- `pnpm lint` and `pnpm typecheck` pass with 0 errors

---

## [0.2.0] - 2026-01-14

### Added
- **API Server Setup** — Complete Express API infrastructure for MVP features
  - Express middleware stack: JSON parsing (10MB limit), CORS, request logging
  - API router structure with placeholder routes for all endpoint groups
  - Static file serving for production (serves built React app from `/`)
  - SPA catch-all route for client-side routing support
  - Standardized response utilities (`success()`, `error()`) with TypeScript types
  - Zod validation middleware with field-level error details
  - Custom error classes (`AppError`, `ValidationError`, `NotFoundError`, etc.)
  - Enhanced error handler supporting all error types
  - API 404 handler returning proper JSON errors for unmatched routes
  - Client-side API fetch wrapper with auto base URL detection
  - Server-side logging utility with levels (error, warn, info, debug)

- **Environment Configuration** — Complete development environment setup
  - `.env.example` with all documented environment variables
  - `README.md` with comprehensive setup instructions
  - `scripts/setup-hooks.sh` for Claude Code hook configuration
  - Tailscale setup guide for phone access
  - Groq API key instructions for voice transcription

### Changed
- **Client App** — Now fetches and displays server status (Server: Healthy, Claude: Idle)
- **Client tsconfig** — Added Vite client types for `import.meta.env` support

### Technical Details
- **New Server Files:**
  - `server/src/api/index.ts` — Main API router
  - `server/src/api/projects.ts` — Projects endpoints (placeholders)
  - `server/src/api/sessions.ts` — Sessions endpoints with validation
  - `server/src/api/transcribe.ts` — Transcription endpoint (placeholder)
  - `server/src/api/settings.ts` — Settings endpoints (placeholders)
  - `server/src/lib/responses.ts` — Response utilities and types
  - `server/src/lib/errors.ts` — Custom error classes
  - `server/src/lib/logger.ts` — Logging utility
  - `server/src/middleware/requestLogger.ts` — Request logging middleware
  - `server/src/middleware/validateRequest.ts` — Zod validation middleware

- **New Client Files:**
  - `client/src/lib/api.ts` — Typed API fetch wrapper

### Verified
- All 6 acceptance criteria passing
- 11 manual tests passing (health check, CORS, validation, error handling, etc.)
- UI displays live server status fetched via API client
- `pnpm lint` and `pnpm typecheck` pass with 0 errors

---

## [0.1.0] - 2026-01-13

### Added
- **Project Scaffolding** — Complete monorepo setup with all development tooling
  - pnpm workspace with `client/`, `server/`, `shared/` packages
  - Express 4 server on port 3456 with health check endpoint (`GET /api/status`)
  - React 18 + Vite 6 client with mobile-first placeholder UI
  - Tailwind CSS with design tokens from product spec (colors, typography, spacing)
  - Shared TypeScript types package with all data models
  - ESLint 9 flat config + Prettier for code quality
  - Husky + lint-staged pre-commit hooks
  - TypeScript path aliases (`@/*`) in all packages
  - `.env.example` with documented environment variables

### Technical Details
- **Client**: React 18.3, Vite 6.4, Tailwind 3.4 — builds to 46KB gzipped
- **Server**: Express 4.21, TypeScript 5.9, tsx for development
- **Tooling**: ESLint 9, Prettier 3.7, Husky 9, pnpm 9

### Verified
- Fresh `pnpm install` succeeds in <4 seconds
- `pnpm dev` starts both servers concurrently
- `pnpm lint` and `pnpm typecheck` pass with 0 errors
- `pnpm build` produces optimized production bundle
- Pre-commit hooks block commits with lint errors
- Hot reload works for client changes

---

## [0.0.2] - 2026-01-13

### Added
- Complete technical architecture document (`docs/architecture.md`)
  - Tech stack definition (frontend, backend, infrastructure)
  - System architecture diagram and component breakdown
  - Project directory structure with file naming conventions
  - Data models and storage strategy (file-based, no database)
  - API specification with all endpoints documented
  - External integrations (Tailscale, Groq, Claude Code, AppleScript)
  - Security architecture and sensitive data handling
  - Testing strategy and deployment architecture
  - AI/LLM integration guidelines for coding assistants
- Decision log entries for 5 key architectural decisions (`docs/decision_log.md`)
- Updated `AGENTS.md` with project-specific configuration

### Decisions Made
- **Package Manager:** pnpm (fast, disk-efficient)
- **Project Structure:** Single repo with `/client` and `/server` directories
- **Port:** 3456 (avoids common dev server conflicts)
- **Notifications:** AppleScript/osascript for iMessage (free, no extra app)
- **Updates:** HTTP polling with SWR (simpler than WebSockets)
- **Storage:** File-based only, no database needed

---

## [0.0.1] - 2026-01-13

### Added
- Complete product specification document (`docs/product_spec.md`)
  - Executive summary with vision, problem statement, and target persona
  - UX guidelines with design principles and visual design system
  - 11 feature specifications with user stories and acceptance criteria
  - 4 user flow diagrams covering primary use cases
  - 3 milestones defined (MVP, V1, V2) with explicit scope boundaries
  - Engineering design requirements including architecture, tech stack, and API design
  - Non-functional requirements (performance, reliability, browser support)
- Project documentation structure

### Decisions Made
- **Product Name:** GoGoGadgetClaude
- **Tech Stack:** Node.js + React (Vite) + Tailwind CSS
- **Architecture:** Local server on laptop, accessed via Tailscale from phone
- **Voice Transcription:** Groq Whisper API (primary), Web Speech API (fallback)
- **Notifications:** iMessage via macOS Shortcuts for MVP
- **Auth Strategy:** Tailscale as security boundary (no app-level auth for MVP)

---
