# Decision Log: GoGoGadgetClaude

> **Purpose:** This is the Architectural Decision Record (ADR) — the "Why" behind architectural changes, error resolutions, and pattern evolutions. It serves as institutional memory for AI assistants and developers to understand context, avoid repeating mistakes, and maintain consistency.

**Related Documents:**
- `architecture.md` — Technical implementation details (the "How")
- `product_spec.md` — Product requirements (the "What")
- `changelog.md` — Version history and release notes

---

## Quick Reference Index

| ID      | Date       | Category | Status | Summary                                                   |
|---------|------------|----------|--------|-----------------------------------------------------------|
| ADR-023 | 2026-01-17 | arch     | active | Notification channel abstraction layer                    |
| ADR-022 | 2026-01-17 | arch     | active | SharedPromptContext for cross-view voice input sync       |
| ADR-021 | 2026-01-17 | arch     | active | Fire-and-forget execution for scheduled prompts           |
| ADR-020 | 2026-01-17 | data     | active | Git-based file tree using git ls-tree and git show        |
| ADR-019 | 2026-01-17 | ui       | active | Web Audio API for real-time waveform visualization        |
| ADR-018 | 2026-01-15 | infra    | active | Server-side notifications for programmatic sessions       |
| ADR-017 | 2026-01-15 | infra    | active | In-memory rate limiting for notifications                 |
| ADR-016 | 2026-01-15 | ui       | active | Dynamic viewport height (dvh) for mobile Safari           |
| ADR-015 | 2026-01-15 | api      | active | Groq Whisper API with Web Speech fallback for voice input |
| ADR-014 | 2026-01-15 | data     | active | Unified diff parsing for File Diff View                   |
| ADR-013 | 2026-01-14 | infra    | active | simple-git for Git CLI operations                         |
| ADR-012 | 2026-01-14 | ui       | active | Pure CSS animations for modal transitions                 |
| ADR-011 | 2026-01-14 | infra    | active | Signal escalation for stopping Claude processes           |
| ADR-010 | 2026-01-14 | infra    | active | Detached process spawning for Claude CLI                  |
| ADR-009 | 2026-01-14 | ui       | active | Cursor-style layout for conversation view                 |
| ADR-008 | 2026-01-14 | data     | active | Extract project paths from JSONL cwd field                |
| ADR-007 | 2026-01-14 | api      | active | Standardized API response format                          |
| ADR-001 | 2026-01-13 | arch     | active | Local-first architecture via Tailscale                    |
| ADR-002 | 2026-01-13 | data     | active | File-based storage (no database)                          |
| ADR-003 | 2026-01-13 | infra    | active | Polling over WebSockets for conversation updates          |
| ADR-004 | 2026-01-13 | infra    | active | AppleScript for iMessage notifications                    |
| ADR-005 | 2026-01-13 | arch     | active | pnpm + single repo structure                              |
| ADR-006 | 2026-01-13 | infra    | active | ESLint 9 flat config                                      |

**Categories:** `arch` | `data` | `api` | `ui` | `test` | `infra` | `error`

**Statuses:** `active` | `superseded` | `reverted`

---

## Log Entries

<!-- Add new entries below this line, newest first -->

### ADR-023: Notification Channel Abstraction Layer
**Date:** 2026-01-17 | **Category:** arch | **Status:** active

**Trigger:**
- User requested ability to add ntfy notifications alongside existing iMessage
- Tightly coupled iMessage logic in `notificationService.ts` made adding new channels difficult
- Settings schema only supported single notification type

**Decision:**
Implement a pluggable notification channel architecture:
1. **NotificationChannel interface** - Common contract with `isAvailable()`, `isConfigured()`, `send()`, `sendTest()`, rate limiting methods
2. **BaseChannel abstract class** - Shared rate limiting logic (60s window) with protected helpers
3. **IMessageChannel** - Concrete implementation extracting logic from legacy notificationService
4. **NotificationManager singleton** - Orchestrates all channels, broadcasts in parallel, handles errors gracefully
5. **Channel-based settings** - `channels.imessage`, `channels.ntfy`, etc. instead of flat structure

**Rationale:**
- **Open/Closed Principle**: Adding new channels (ntfy, Slack, Telegram) requires only a new class implementing NotificationChannel, no changes to existing code
- **Encapsulation**: Each channel manages its own availability, configuration validation, and rate limiting
- **Resilience**: One channel failing doesn't prevent others from sending (parallel execution with error isolation)
- **Backward Compatibility**: Legacy settings auto-migrate on first read; facade maintains old API signatures

**Alternatives Considered:**
- **Single service with switch statements**: Rejected - violates OCP, scales poorly with more channels
- **Event-based pub/sub**: Rejected - overengineered for 2-5 notification types
- **External notification service**: Rejected - adds dependency and latency for simple push notifications

**AI Instructions:**
- When adding new notification channels, create a class extending `BaseChannel`
- Register new channels in `NotificationManager.constructor()`
- Add channel-specific settings type to `AppSettings.channels`
- Update `SettingsModal` with channel card UI
- Add endpoint validation in `api/hooks.ts` for channel-specific test

**References:**
- [Feature doc](Features/notification-abstraction-layer.md)
- [NotificationChannel interface](../server/src/services/notifications/types.ts)
- [NotificationManager](../server/src/services/notifications/NotificationManager.ts)

---

### ADR-022: SharedPromptContext for Cross-View Voice Input Sync
**Date:** 2026-01-17 | **Category:** arch | **Status:** active

#### Trigger
Implementing the Floating Voice Button required a way to share prompt text between the FloatingVoiceButton (on Files tab) and PromptInput (on Chat tab), so voice recordings from either location accumulate in the same shared prompt.

#### Options Considered
1. **Prop drilling** — Pass state up through App and down to both components
2. **Global state (Zustand/Jotai)** — Full state management library
3. **React Context** — Lightweight context for just the shared prompt text
4. **localStorage + events** — Sync via localStorage with custom events

#### Decision
Use a minimal React Context (`SharedPromptContext`) that holds:
- `promptText: string` — The current accumulated prompt text
- `shouldSend: boolean` — Flag to request send from floating button
- Functions: `setPromptText`, `appendText`, `clearText`, `requestSend`, `clearSendRequest`

#### Rationale
- **Minimal** — Only stores what's needed (text + send flag), no over-engineering
- **No new dependencies** — Uses React's built-in Context API
- **Bidirectional sync** — Both PromptInput and FloatingVoiceButton can read/write
- **Clean separation** — PromptInput handles localStorage persistence, context handles cross-component sync
- **Long-press send** — `shouldSend` flag enables FloatingVoiceButton to trigger send without direct reference

#### Consequences
- ✅ Voice recordings from Files tab appear in Chat tab's PromptInput
- ✅ Long-press on floating button triggers send + tab switch
- ✅ PromptInput still owns localStorage persistence
- ✅ Zero new dependencies
- ❌ PromptInput now has bidirectional sync useEffect (slightly more complex)

#### Implementation Notes
- `SharedPromptProvider` wraps the entire app in `App.tsx`
- PromptInput initializes from localStorage, then syncs bidirectionally with context
- FloatingVoiceButton calls `appendText()` for transcriptions, `requestSend()` for long-press
- PromptInput watches `shouldSend` and triggers its own `handleSend` when true

---

### ADR-021: Fire-and-Forget Execution for Scheduled Prompts
**Date:** 2026-01-17 | **Category:** arch | **Status:** active

#### Trigger
Implementing Scheduled Prompts required deciding how the system should handle execution—whether to track session state, wait for completion, or simply dispatch and move on.

#### Options Considered
1. **Managed execution** — Track spawned sessions, monitor progress, handle concurrency conflicts, implement retries
2. **Fire-and-forget** — Spawn Claude CLI process and immediately return; let Claude handle everything independently

#### Decision
Use fire-and-forget execution model: spawn `claude -p "<prompt>" --allowedTools "Task,Bash,..." [projectPath]` and move on immediately without tracking the process.

#### Rationale
- **Simplicity** — No session tracking, no process monitoring, no concurrency handling needed
- **Reliability** — Claude CLI handles all complexity; we just trigger it
- **Lightweight** — App remains simple and focused on scheduling, not process management
- **Future-proof** — Works equally well for local and future serverless deployments
- **User expectation** — Scheduled prompts are "set and forget"; detailed monitoring is out of scope

#### Consequences
- ✅ Drastically simplified codebase (no process manager state)
- ✅ No concurrency issues even with overlapping schedules
- ✅ Server restarts don't lose running sessions (they're independent)
- ❌ No real-time progress tracking for scheduled prompts
- ❌ Failed prompts only detected via lastExecution status (not live)
- ❌ Can't cancel a running scheduled prompt (only prevent next occurrence)

#### Related Decisions
- Calendar-based scheduling (daily/weekly/monthly/yearly) instead of interval-based
- Last execution tracking stores only most recent status (timestamp + success/failure)
- Global prompts use `lastActiveProjectPath` from settings (tracked on each user prompt)

#### AI Instructions
When working on scheduled prompts or similar async execution features:
1. Favor fire-and-forget over managed execution when process lifecycle isn't critical
2. Store minimal status (last run, not full history) unless explicit requirement
3. Let external tools (Claude CLI) handle their own complexity

---

### ADR-020: Git-Based File Tree Using git ls-tree and git show
**Date:** 2026-01-17 | **Category:** data | **Status:** active

#### Trigger
Implementing File Tree Viewing required choosing how to list project files and retrieve file contents for display.

#### Options Considered
1. **Filesystem access (fs.readdir)** — Direct filesystem traversal with .gitignore parsing via `ignore` npm package
2. **Git CLI (git ls-tree, git show)** — Use Git's built-in commands to list and retrieve committed files

#### Decision
Use Git CLI commands (`git ls-tree -r HEAD --name-only` and `git show HEAD:filepath`) instead of direct filesystem access.

#### Rationale
- **Simplicity**: Git already knows which files are tracked—no need to parse .gitignore files
- **Consistency**: Shows exactly what's committed, matching user expectations for "project files"
- **Security**: No risk of exposing untracked secrets or build artifacts
- **Dependencies**: No new npm packages needed—reuses existing `simple-git` library (ADR-013)
- **Performance**: Git's internal indexing makes file listing fast

#### Trade-offs
- Cannot see uncommitted files (acceptable—users typically want to see "the code")
- Requires project to be a Git repository (show error if not)
- Binary file detection is basic (check for null bytes in first 8KB)

#### AI Instructions
When implementing file browsing features:
1. Prefer Git commands over filesystem access for project files
2. Use `git ls-tree -r HEAD --name-only` for flat file listing, then build tree structure
3. Use `git show HEAD:filepath` for file content retrieval
4. Always validate file paths to prevent path traversal attacks
5. Check for binary files before returning content

---

### ADR-019: Web Audio API for Real-Time Waveform Visualization
**Date:** 2026-01-17 | **Category:** ui | **Status:** active

#### Trigger
Implementing waveform visualization for voice recording required choosing an approach to display real-time audio levels during recording.

#### Decision
Use the **Web Audio API** with `AnalyserNode` for real-time frequency analysis:

1. **Hook-based architecture:** `useAudioAnalyser` hook manages `AudioContext` lifecycle
2. **FFT analysis:** Use `getByteFrequencyData()` to get 128 frequency bins (FFT size 256)
3. **Animation:** Update at ~60fps via `requestAnimationFrame`
4. **Downsampling:** Average frequency bins to match bar count (default 45 bars)
5. **Cleanup:** Properly close `AudioContext` and cancel animation frames on unmount

```typescript
// Key components
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);
```

#### Rationale
1. **Built-in browser API:** No external dependencies needed
2. **Performant:** Native implementation, hardware-accelerated where available
3. **Real-time:** Can achieve 60fps updates without performance issues
4. **Flexible:** FFT data allows various visualization styles (bars, waves, etc.)
5. **Cross-browser:** Supported in all modern browsers including iOS Safari

#### Alternatives Considered
| Option                            | Pros                 | Cons                                   |
|-----------------------------------|----------------------|----------------------------------------|
| Canvas/WebGL visualization        | More visual control  | Overkill for simple bars, more complex |
| Volume meter only                 | Simpler to implement | Less visual feedback, less engaging    |
| Pre-built library (wavesurfer.js) | Feature-rich         | Heavy dependency for simple use case   |
| CSS-only animation                | No JS needed         | Can't react to actual audio levels     |

#### Consequences
- **Positive:** Zero additional dependencies, smooth 60fps animation
- **Positive:** Works with existing MediaStream from voice recording
- **Positive:** Easy to customize bar count, height, smoothing
- **Negative:** Requires `AudioContext` cleanup to avoid memory leaks
- **Negative:** Need to mock Web Audio API in tests

#### AI Instructions
- Always close `AudioContext` in cleanup functions
- Cancel `requestAnimationFrame` before component unmount
- Use `smoothingTimeConstant` (0.8) for smooth bar transitions
- Apply power easing (`Math.pow(normalized, 1.5)`) to emphasize loud sounds
- Respect `prefers-reduced-motion` by disabling transition animations

---

### ADR-018: Server-Side Notifications for Programmatic Sessions
**Date:** 2026-01-15 | **Category:** infra | **Status:** active

#### Trigger
Notifications via Claude Code's `Stop` hook only work for interactive CLI sessions, not for sessions started programmatically via `claude -p "message"` (which is how GoGoGadgetClaude sends prompts).

#### Decision
**Send notifications from the server when Claude process exits** instead of relying on Claude Code hooks:

```typescript
subprocess.on('exit', (code, signal) => {
  untrackProcess(sessionId);
  
  // Send notification when Claude completes successfully
  if (code === 0) {
    const projectName = path.basename(projectPath);
    sendTaskCompleteNotification(projectName).catch(/* log error */);
  }
});
```

#### Rationale
1. **Reliability** — Claude Code hooks don't fire for programmatic sessions
2. **Simplicity** — We already track process lifecycle for the stop button
3. **Consistency** — Works the same whether started via CLI or mobile UI
4. **No external dependencies** — Doesn't require Claude Code hook configuration

#### Alternatives Considered
1. **Poll session status** — Complex, adds latency, unreliable detection of "done"
2. **Claude Code hooks only** — Doesn't work for programmatic sessions
3. **File watcher on JSONL** — Complex to detect "task complete" vs "still working"

#### AI Instructions
- Notifications for GoGoGadgetClaude-initiated sessions come from `claudeService.ts` process exit handler
- Claude Code hook notifications (for interactive sessions) still work via `/api/hooks/task-complete`
- Both paths respect the same rate limiting in `notificationService.ts`

---

### ADR-017: In-Memory Rate Limiting for Notifications
**Date:** 2026-01-15 | **Category:** infra | **Status:** active

#### Trigger
Implementing iMessage Notifications required a rate limiting mechanism to prevent spam when Claude completes multiple tasks rapidly.

#### Decision
Use **in-memory rate limiting** with a simple timestamp check:
- Store `lastNotificationTime` as a module-level variable
- Check if 60 seconds have passed before sending
- Reset automatically when server restarts

```typescript
let lastNotificationTime: number | null = null;
const RATE_LIMIT_MS = 60_000; // 60 seconds

function isRateLimited(): boolean {
  if (!lastNotificationTime) return false;
  return Date.now() - lastNotificationTime < RATE_LIMIT_MS;
}
```

#### Rationale
1. **Simplicity:** No external dependencies (Redis, etc.) for a single-user app
2. **Sufficient:** 60 seconds prevents spam while allowing reasonable notification frequency
3. **Acceptable tradeoff:** Rate limit resetting on server restart is fine for MVP
4. **Easy to extend:** Can add Redis/persistent storage in V1 if multi-user support is added

#### Alternatives Considered
- **Redis:** Overkill for single-user, adds infrastructure complexity
- **File-based:** Unnecessary I/O for a simple counter
- **No rate limiting:** Would spam user during rapid task completions

#### AI Instructions
- Rate limiting is in `notificationService.ts`, not middleware
- Test notifications bypass rate limiting (they're user-initiated)
- If rate limited, return `false` from `sendTaskCompleteNotification()` but don't throw
- Log rate-limited attempts at debug level for troubleshooting

---

### ADR-016: Dynamic Viewport Height (dvh) for Mobile Safari
**Date:** 2026-01-15 | **Category:** ui | **Status:** active

#### Trigger
UI elements (especially the bottom tab bar) were getting cut off on mobile Safari because `100vh` doesn't account for the dynamic address bar and home indicator.

#### Decision
Use **`h-dvh`** (dynamic viewport height) instead of **`h-screen`** (`100vh`) for all full-height containers:

```css
.h-dvh {
  height: 100vh;  /* Fallback for older browsers */
  height: 100dvh; /* Modern browsers - adjusts for Safari's dynamic chrome */
}
```

#### Rationale
1. **`100vh` on iOS Safari** = includes area behind the address bar, causing content to be hidden
2. **`100dvh`** = adjusts dynamically when Safari's chrome shows/hides
3. **CSS fallback** = older browsers fall back to `100vh` gracefully

#### AI Instructions
When creating full-height layouts for mobile-first apps:
- Use `h-dvh` class instead of `h-screen`
- Include CSS fallback: `height: 100vh; height: 100dvh;`
- Test on real iPhone Safari, not just Chrome DevTools

---

### ADR-015: Groq Whisper API with Web Speech Fallback for Voice Input
**Date:** 2026-01-15 | **Category:** api | **Status:** active

#### Trigger
Implementing voice input required choosing a transcription service that works well on mobile Safari while being accessible without complex authentication.

#### Decision
Use **Groq Whisper API** as primary transcription with **Web Speech API** as parallel fallback:

1. **Groq Whisper (primary)**: Server-side transcription via `POST /api/transcribe`
   - High accuracy with `whisper-large-v3` model
   - Works in all browsers (audio sent to server)
   - Requires `GROQ_API_KEY` environment variable

2. **Web Speech API (fallback)**: Client-side browser-native transcription
   - Runs in parallel during recording (captures interim results)
   - Used only if Groq fails (network error, rate limit, etc.)
   - Works on Safari iOS without additional setup

3. **Audio capture**: MediaRecorder API with optimal Whisper settings
   - MIME type priority: `audio/webm` > `audio/mp4` > `audio/ogg`
   - Sample rate: 16kHz (optimal for Whisper)
   - Echo cancellation and noise suppression enabled

#### Alternatives Considered

| Option                  | Pros                   | Cons                                        |
|-------------------------|------------------------|---------------------------------------------|
| OpenAI Whisper directly | Same model quality     | Requires separate API key, higher cost      |
| Web Speech API only     | No server needed, free | iOS Safari has quirks, lower accuracy       |
| AssemblyAI              | Good accuracy          | Additional subscription, more complex setup |
| Deepgram                | Real-time streaming    | Overkill for this use case                  |

#### Consequences
- **Positive**: High accuracy transcription with graceful degradation
- **Positive**: No-config fallback works immediately (Web Speech)
- **Positive**: Groq's free tier generous for personal use
- **Negative**: Requires Groq API key for best experience
- **Negative**: Web Speech fallback quality varies by device

#### AI Instructions
- Always send audio to server first (Groq) before falling back to Web Speech
- Web Speech recognition should run in parallel to have fallback ready
- Use memory storage for multer (no disk writes for audio files)
- Set 30-second timeout for Groq API to handle slow connections

---

### ADR-014: Unified Diff Parsing for File Diff View
**Date:** 2026-01-15 | **Category:** data | **Status:** active

#### Trigger
Implementing the File Diff View feature required parsing Git diff output into structured data for rendering with line-by-line highlighting.

#### Decision
Parse unified diff format server-side into structured `FileDiff` → `DiffHunk[]` → `DiffLine[]` objects, with:
1. Use `git.raw()` with `--unified=999999` for full file context
2. Detect binary files via `git diff --numstat` (shows `-\t-\t` for binary)
3. Flag files > 10,000 lines as `isTooBig` for client-side warning
4. Validate file paths to prevent directory traversal attacks

#### Rationale
1. **Full Context:** Using `--unified=999999` ensures the entire file is included, not just change hunks. This matches the product requirement for "full file with highlights."
2. **Binary Detection:** The `--numstat` output reliably indicates binary files with `-\t-\t` pattern, whereas parsing diff headers can miss edge cases.
3. **Server-Side Parsing:** Parsing on the server keeps the client simple and allows consistent data structure regardless of git version quirks.
4. **Security:** Path validation is critical since the endpoint accepts user-controlled file paths.

#### Alternatives Considered
- **libgit2/nodegit:** Would give more control but adds native dependencies and complexity
- **Client-side parsing:** Would require shipping raw diff text, larger payloads, and duplicate logic
- **Diff library (jsdiff):** Designed for string comparison, not Git output parsing

#### Impact
- Server parses diffs into clean JSON structure
- Client receives ready-to-render data
- Large files get user confirmation before rendering
- Binary files show friendly message

#### AI Instructions
- When extending `getFileDiff()`, maintain the options object pattern `{ projectPath, filePath, context }`
- Always validate file paths before passing to git commands
- Use `git.raw()` for git operations that need specific flags not supported by simple-git methods
- Keep diff parsing logic in `parseDiffHunks()` - don't add parsing logic elsewhere

---

### ADR-013: simple-git for Git CLI Operations
**Date:** 2026-01-14 | **Category:** infra | **Status:** active

#### Trigger
Implementing the Files Changed View feature required interacting with Git to get uncommitted file changes (staged, unstaged, and untracked files).

#### Decision
Use **simple-git** npm package as a wrapper around Git CLI commands instead of directly spawning git processes with execa.

#### Rationale
1. **Type Safety:** simple-git provides TypeScript types for all operations and results
2. **API Simplicity:** High-level methods like `status()`, `diffSummary()`, `checkIsRepo()` abstract away CLI argument complexity
3. **Error Handling:** Consistent error handling and meaningful error messages
4. **Maintained:** Actively maintained package with 3.7k+ GitHub stars
5. **No Shell Parsing:** Avoids manually parsing git command output

#### Alternatives Considered
1. **Direct execa + git:** More control but requires parsing output, handling edge cases manually
2. **isomorphic-git:** Pure JS git implementation, but heavier and doesn't need to run in browser
3. **nodegit:** Native bindings, complex build requirements for a simple use case

#### Implementation
```typescript
import { simpleGit, type SimpleGit, type StatusResult } from 'simple-git';

const git = simpleGit({ baseDir: projectPath });
const status: StatusResult = await git.status();
const diffSummary = await git.diffSummary(['--cached']); // staged
```

#### AI Instructions
- When implementing Git operations, use `simple-git` package
- Create git instance with `simpleGit({ baseDir: projectPath })`
- Use `checkIsRepo()` before operations to handle non-git directories gracefully
- Combine `status()` and `diffSummary()` for complete file change information
- Handle binary files (no line counts available)

---

### ADR-012: Pure CSS Animations for Modal Transitions
**Date:** 2026-01-14 | **Category:** ui | **Status:** active

#### Trigger
Implementing the Project Switcher modal required smooth slide-up/fade-in animations. Initial consideration was using `tailwindcss-animate` plugin.

#### Decision
Use **custom CSS keyframe animations** defined in `index.css` instead of adding a dependency:

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}
```

Also added `prefers-reduced-motion` media query to disable animations for users who prefer reduced motion.

#### Rationale
- **Minimal dependencies:** `tailwindcss-animate` is small but adds unnecessary package management overhead for ~20 lines of CSS
- **Full control:** Custom animations can be tuned exactly to our needs (0.2s for fade, 0.3s for slide)
- **Accessibility:** Built-in `prefers-reduced-motion` support is essential for motion-sensitive users
- **Simplicity:** Animations are scoped to this one modal; don't need a generic animation library
- **Performance:** Native CSS animations are hardware-accelerated

Alternatives considered:
- **tailwindcss-animate:** Would add a dependency for simple use case
- **Framer Motion:** Overkill for one modal; adds significant bundle size
- **No animation:** Would feel jarring and less polished

#### AI Instructions
- For simple modal/slide animations, prefer custom CSS keyframes over adding dependencies
- Always include `prefers-reduced-motion` support for any animation
- Use `forwards` fill mode so elements stay in final state
- Keep animation durations short (0.2-0.3s) for responsiveness

---

### ADR-011: Signal Escalation for Stopping Claude Processes
**Date:** 2026-01-14 | **Category:** infra | **Status:** active

#### Trigger
Implementing the Stop Button feature required deciding how to safely terminate a running Claude CLI process.

#### Decision
Use **escalating signals** with timeouts to stop Claude processes:
1. **SIGINT** first (Ctrl+C equivalent) — allows Claude to clean up gracefully
2. Wait 2 seconds for process to exit
3. **SIGTERM** if still running — forceful termination request
4. Wait 2 more seconds
5. **SIGKILL** as last resort — immediate process death

Also track processes in memory (`processManager.ts`) to map sessionId → PID.

#### Rationale
- **Safety first:** SIGINT allows Claude to save state and exit cleanly
- **Predictable timeouts:** 2-second intervals balance responsiveness with giving processes time to clean up
- **Guaranteed termination:** SIGKILL cannot be caught or ignored
- **In-memory tracking:** Simple and sufficient for single-user app; no persistence needed
- **Clean interface:** `stopAgent(sessionId)` abstracts all signal handling

Alternatives considered:
- **SIGKILL immediately:** Would risk data corruption if Claude is mid-write
- **Longer timeouts:** Would make the stop button feel unresponsive
- **Process group signals:** Unnecessary complexity for single-process CLI

#### AI Instructions
- When stopping processes, always try graceful shutdown first (SIGINT)
- Never skip signal escalation — some processes don't respond to SIGINT
- Track PIDs immediately after spawn; untrack on exit or error
- Return `processKilled: false` if no process is tracked (not an error)

---

### ADR-010: Detached Process Spawning for Claude CLI
**Date:** 2026-01-14 | **Category:** infra | **Status:** active

#### Trigger
Implementing the Text Input & Send feature required deciding how to invoke the Claude CLI from our server and handle the long-running process.

#### Decision
Use **detached process spawning** with `execa` to run Claude CLI commands:
- Spawn `claude -p "prompt" --continue` with `detached: true` and `stdio: 'ignore'`
- Call `subprocess.unref()` to allow the parent process to exit independently
- Don't wait for the Claude process to complete — return immediately to the client
- Let existing polling mechanism (SWR) pick up new messages from JSONL files

#### Rationale
- **Non-blocking:** Server responds immediately; Claude runs in background potentially for minutes
- **Separation of concerns:** Claude writes to JSONL, we read from JSONL (established pattern)
- **Resilient:** If our server restarts, Claude keeps running
- **Simple client:** Client just polls for updates, doesn't need to manage a long-lived connection
- **Native integration:** Uses Claude's own `--continue` flag to append to existing session

Alternatives considered:
- **Wait for completion:** Would block the API call for minutes, terrible UX
- **Streaming stdout:** Complex, would need WebSockets, duplicates JSONL data
- **Job queue:** Overkill for single-user app

#### AI Instructions
- Always use `detached: true` and `stdio: 'ignore'` when spawning Claude CLI
- Call `subprocess.unref()` immediately after spawning
- Return the PID to the client for informational purposes (not used for tracking)
- Check `isClaudeAvailable()` before spawning to give clear error messages
- Log spawn success/failure with session context for debugging

---

### ADR-009: Cursor-Style Layout for Conversation View
**Date:** 2026-01-14 | **Category:** ui | **Status:** active

#### Trigger
Initial design for the conversation view used a traditional "chat bubble" layout (user messages right-aligned, assistant messages left-aligned). User feedback indicated this felt too much like text messaging and not appropriate for a code assistant interface.

#### Decision
Adopt a **Cursor-style document layout** for the conversation view:
- All messages left-aligned, full width
- Distinct headers for each turn: icon + sender label + timestamp
- User turns have a subtle left border accent and light background tint
- Assistant turns have transparent/default background
- Tool usage shown as inline collapsible cards, not separate bubbles
- Code blocks span full width of the message area

#### Rationale
- **Professional feel:** Document-style layout feels more appropriate for code conversations
- **Readability:** Full-width content uses screen real estate efficiently, especially on mobile
- **Consistency with tools:** Matches how users experience conversations in Cursor/VS Code
- **Scannable:** Distinct headers make it easy to identify who said what when scrolling
- **Tool integration:** Tool usage cards fit naturally in the content flow

Alternatives considered:
- **Chat bubbles:** Feels too casual for code review, wastes horizontal space
- **Slack-style:** Messages floating in from sides, hard to scan
- **Terminal-style:** Too technical, poor markdown rendering

#### AI Instructions
- Never use chat bubble styling for messages—always full-width
- Each message turn gets a `MessageHeader` with icon, label, timestamp
- User messages: `border-l-2 border-accent/40 bg-accent/5`
- Assistant messages: `bg-transparent`
- Tool usage cards are children of the message content, not separate messages
- Code blocks should have `overflow-x-auto` for horizontal scroll on mobile

---

### ADR-008: Extract Project Paths from JSONL cwd Field
**Date:** 2026-01-14 | **Category:** data | **Status:** active

#### Trigger
During testing of the JSONL Watcher Service, discovered that Claude Code's folder encoding scheme is not reversible. Directories like `/Users/derek/Doubleo/agents-dev` get encoded as `-Users-derek-Doubleo-agents-dev`, but decoding by replacing hyphens with slashes incorrectly produces `/Users/derek/Doubleo/agents/dev`.

#### Decision
Extract the actual project path from the JSONL `cwd` field instead of attempting to decode the folder name. Every JSONL entry contains a `cwd` field with the absolute project path. Only fall back to folder name decoding if JSONL files are empty.

#### Rationale
- **Accuracy:** The `cwd` field is authoritative — Claude Code writes the actual working directory
- **Hyphen ambiguity:** Folder names can contain hyphens (e.g., `my-project`), making encoding non-reversible
- **Resilience:** Works regardless of how Claude encodes paths in the future
- **Minimal overhead:** We're already parsing JSONL files, extracting one field is trivial

#### AI Instructions
- Always use `extractProjectPath(entries)` from `jsonlParser.ts` to get the project path
- The `pathEncoder.decodePath()` function is a fallback only — prefer extracted paths
- When scanning projects, check ALL JSONL files (including agent sidechains) for the `cwd` field since main session files might be empty
- Log a warning if falling back to folder decoding

---

### ADR-007: Standardized API Response Format
**Date:** 2026-01-14 | **Category:** api | **Status:** active

#### Trigger
Implementing the API server setup feature required a consistent approach to formatting both success and error responses across all endpoints.

#### Decision
Standardize all API responses with this format:
- **Success:** `{ data: T, meta: { timestamp } }`
- **Error:** `{ error: { code: string, message: string, details?: Record<string, string> } }`

Use custom error classes (`AppError`, `ValidationError`, `NotFoundError`, etc.) that integrate with a centralized error handler to produce consistent error responses.

#### Rationale
- **Predictable client parsing:** All responses follow the same structure, simplifying the client API wrapper
- **Typed error codes:** Using constants (`VALIDATION_ERROR`, `NOT_FOUND`, etc.) enables switch-based error handling on the client
- **Field-level details:** Zod validation errors include per-field messages in `details` object
- **Operational vs unexpected:** Custom error classes distinguish expected errors (return proper status) from bugs (return 500)
- **Timestamp in meta:** Useful for debugging and cache invalidation

#### AI Instructions
- Always use `success()` and `error()` utilities from `server/src/lib/responses.ts`
- Throw custom error classes from `server/src/lib/errors.ts` — they'll be caught by `errorHandler`
- Never return raw objects — wrap in `success()` or `error()`
- Use `ValidationError` for Zod failures (validateRequest middleware does this automatically)
- Use `NotFoundError` for missing resources
- Only log unexpected errors (non-operational) as `logger.error`; operational errors use `logger.warn`

---

### ADR-006: ESLint 9 Flat Config
**Date:** 2026-01-13 | **Category:** infra | **Status:** active

#### Trigger
Setting up linting for the project with TypeScript in both client (React) and server (Node.js) packages.

#### Decision
Use **ESLint 9** with the new flat config format (`eslint.config.js`) instead of the legacy `.eslintrc` format. Configure TypeScript, React, and React Hooks rules in a single config file at the root.

#### Rationale
- **Future-proof:** Flat config is the new standard, `.eslintrc` is deprecated
- **Simpler:** Single JS file with explicit imports instead of extends chains
- **Type-safe:** Config file is plain JavaScript, can use IDE autocomplete
- **Per-package rules:** Easy to configure different rules for client vs server via file globs

#### AI Instructions
- Always use `eslint.config.js` (flat config), never `.eslintrc.*`
- Import plugins directly: `import tseslint from 'typescript-eslint'`
- Use file glob patterns for package-specific rules: `files: ['client/**/*.tsx']`
- Put `eslint-config-prettier` last to override formatting rules

#### Supersedes
N/A — new project

---

### ADR-005: pnpm + Single Repo Structure
**Date:** 2026-01-13 | **Category:** arch | **Status:** active

#### Trigger
Need to decide on package manager and repository structure for the project containing both a React client and Node.js server.

#### Decision
Use **pnpm** as package manager with a **single repository** containing `/client` and `/server` directories. No monorepo tooling (Turborepo, Nx) needed—simple npm scripts will orchestrate dev/build commands.

#### Rationale
- **pnpm:** Faster than npm, disk-efficient through hard links, strict dependency resolution catches issues early
- **Single repo:** This is one product with two components, not separate products. Monorepo tooling adds complexity without benefit for this scale
- **No workspaces needed:** Client and server have separate node_modules, simple to understand and debug

#### Supersedes
N/A

#### Migration
- **Affected files:** Root `package.json`, `pnpm-workspace.yaml`
- **Find:** N/A
- **Replace with:** N/A
- **Verify:** `pnpm install` succeeds in root, client, and server

#### AI Instructions
- Always use `pnpm` for package management commands, never `npm` or `yarn`
- Client and server have separate package.json files—install dependencies in the correct directory
- Shared types go in `/shared/types/` and are imported via path alias

---

### ADR-004: AppleScript for iMessage Notifications
**Date:** 2026-01-13 | **Category:** infra | **Status:** active

#### Trigger
Need a way to notify the user's phone when Claude Code completes a task. User wanted free, reliable, no-extra-app solution.

#### Decision
Use **macOS AppleScript** via `osascript` to send iMessages to the user's phone number. Triggered by Claude Code's hook system when tasks complete.

#### Rationale
- **Free:** No paid services (Twilio, etc.)
- **No extra app:** Uses built-in Messages.app, no installation on phone
- **Reliable:** Local execution, no network dependencies beyond iMessage itself
- **Simple:** ~10 lines of code to implement

Alternatives considered:
- **Twilio SMS:** Costs money (~$0.01/message)
- **Pushover/ntfy.sh:** Requires installing an app
- **Email:** Too slow, easy to miss
- **macOS Shortcuts:** More complex setup for same result

#### Supersedes
N/A

#### Migration
- **Affected files:** `server/src/services/notificationService.ts`
- **Find:** N/A
- **Replace with:** N/A
- **Verify:** Run `osascript -e 'tell application "Messages" to send "test" to buddy "+PHONE"'` manually

#### AI Instructions
- Notification service uses `execa` to run `osascript`
- Phone number stored in settings.json, never hardcoded
- Always check `notificationsEnabled` setting before sending
- Rate limit to max 1 notification per minute to avoid spam

---

### ADR-003: Polling over WebSockets for Conversation Updates
**Date:** 2026-01-13 | **Category:** infra | **Status:** active

#### Trigger
Need to keep the mobile UI updated with the latest conversation state from Claude Code. Considered real-time streaming vs polling.

#### Decision
Use **HTTP polling** with SWR (2-3 second interval) instead of WebSockets for conversation updates.

#### Rationale
- **Simpler:** No WebSocket server setup, connection management, or reconnection logic
- **Good enough:** 2-3 second latency is acceptable—user doesn't need millisecond updates
- **Mobile-friendly:** Polling works better with mobile network switches and app backgrounding
- **SWR handles it:** Built-in revalidation, caching, and error handling

Alternatives considered:
- **WebSockets:** More complex, harder to debug, benefits don't justify complexity
- **Server-Sent Events:** Similar complexity to WebSockets for this use case
- **Longer polling:** 5+ seconds would feel sluggish

#### Supersedes
N/A

#### Migration
- **Affected files:** `client/src/hooks/useConversation.ts`
- **Find:** N/A
- **Replace with:** N/A
- **Verify:** Messages appear within 3 seconds of JSONL update

#### AI Instructions
- Use SWR with `refreshInterval: 2000` (2 seconds)
- Disable polling when app is backgrounded (SWR handles this automatically)
- If latency becomes a problem in V1, can add WebSockets—but start simple

---

### ADR-002: File-Based Storage (No Database)
**Date:** 2026-01-13 | **Category:** data | **Status:** active

#### Trigger
Need to decide on data storage strategy. Considered traditional database vs file-based approach.

#### Decision
Use **file-based storage** exclusively:
- Conversation data: Claude Code's JSONL files in `~/.claude/projects/` (read-only)
- App settings: JSON file in `~/.gogogadgetclaude/settings.json`
- UI state: Browser localStorage

No traditional database (SQLite, PostgreSQL, etc.) will be used.

#### Rationale
- **Claude owns conversation data:** We should not duplicate or modify Claude's data—just read it
- **Single user:** No multi-tenancy, no need for ACID transactions or complex queries
- **Simplicity:** No database setup, migrations, or connection management
- **Portability:** User's data is in readable files, easy to backup or inspect

#### Supersedes
N/A

#### Migration
- **Affected files:** N/A (initial decision)
- **Find:** N/A
- **Replace with:** N/A
- **Verify:** N/A

#### AI Instructions
- NEVER write to `~/.claude/` directory—only read
- App settings go in `~/.gogogadgetclaude/settings.json`
- For any "database-like" needs, consider if a JSON file or localStorage would suffice
- If we ever need a database (V2 work accounts?), it would be a separate deployment

---

### ADR-001: Local-First Architecture via Tailscale
**Date:** 2026-01-13 | **Category:** arch | **Status:** active

#### Trigger
Need to access a server running on the user's laptop from their phone while away from the desk. Considered cloud hosting vs local hosting options.

#### Decision
Run the server **locally on the user's laptop** and use **Tailscale** for secure network access from the phone.

#### Rationale
- **Free:** No cloud hosting costs (Tailscale free tier is sufficient)
- **Data stays local:** Conversation data never leaves the laptop
- **Simple security:** Tailscale provides encrypted tunnel + authentication; no app-level auth needed
- **Low latency:** Direct connection over Tailscale mesh, no cloud round-trip

Trade-offs accepted:
- **Laptop must be awake:** If laptop sleeps, app is unreachable (acceptable for MVP)
- **Initial setup:** User must install Tailscale on both devices (one-time)

Alternatives rejected:
- **Cloud hosting:** Costs money, data leaves local machine, more complex
- **Port forwarding:** Security risk, requires static IP or DDNS
- **ngrok/localtunnel:** Public URLs, security concerns, rate limits

#### Supersedes
N/A

#### Migration
- **Affected files:** N/A (initial decision)
- **Find:** N/A
- **Replace with:** N/A
- **Verify:** `curl http://[tailscale-hostname]:3456/api/status` returns success

#### AI Instructions
- Server binds to `0.0.0.0:3456` (not localhost) so Tailscale can reach it
- No CORS restrictions needed—same Tailscale network is trusted
- No authentication middleware—Tailscale IS the auth layer
- Document Tailscale setup in README for first-time users

---
