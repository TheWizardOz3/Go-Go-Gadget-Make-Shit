# Decision Log: GoGoGadgetClaude

> **Purpose:** This is the Architectural Decision Record (ADR) — the "Why" behind architectural changes, error resolutions, and pattern evolutions. It serves as institutional memory for AI assistants and developers to understand context, avoid repeating mistakes, and maintain consistency.

**Related Documents:**
- `architecture.md` — Technical implementation details (the "How")
- `product_spec.md` — Product requirements (the "What")
- `changelog.md` — Version history and release notes

---

## Quick Reference Index

| ID | Date | Category | Status | Summary |
|----|------|----------|--------|---------|
| ADR-007 | 2026-01-14 | api | active | Standardized API response format |
| ADR-001 | 2026-01-13 | arch | active | Local-first architecture via Tailscale |
| ADR-002 | 2026-01-13 | data | active | File-based storage (no database) |
| ADR-003 | 2026-01-13 | infra | active | Polling over WebSockets for conversation updates |
| ADR-004 | 2026-01-13 | infra | active | AppleScript for iMessage notifications |
| ADR-005 | 2026-01-13 | arch | active | pnpm + single repo structure |
| ADR-006 | 2026-01-13 | infra | active | ESLint 9 flat config |

**Categories:** `arch` | `data` | `api` | `ui` | `test` | `infra` | `error`

**Statuses:** `active` | `superseded` | `reverted`

---

## Log Entries

<!-- Add new entries below this line, newest first -->

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
