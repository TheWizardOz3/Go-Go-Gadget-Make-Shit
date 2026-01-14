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
