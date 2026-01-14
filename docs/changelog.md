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
| 0.0.2 | 2026-01-13 | prerelease | Technical architecture documentation |
| 0.0.1 | 2026-01-13 | prerelease | Initial product specification |

**Types:** `major` | `minor` | `patch` | `prerelease`

---

## Releases

<!-- Add new versions below this line, newest first -->

## [Unreleased]

### Added
- **Project Scaffolding Task 1:** pnpm workspace and root configuration
  - Root `package.json` with workspace scripts (dev, build, lint, typecheck, etc.)
  - `pnpm-workspace.yaml` defining client/server/shared packages
  - `.gitignore` with comprehensive Node.js/build ignores
  - `.nvmrc` specifying Node 20
  - Placeholder `package.json` files for client, server, and shared packages
  - Husky initialized for git hooks (pre-commit hook to be configured in Task 7)
  - Development dependencies: ESLint, Prettier, TypeScript, Husky, lint-staged, concurrently
- **Project Scaffolding Task 2:** Express server with TypeScript
  - `server/package.json` with Express 4, cors, dotenv, zod dependencies
  - `server/tsconfig.json` with strict mode enabled
  - `server/src/index.ts` - Express entry point on port 3456
  - `server/src/api/status.ts` - Health check endpoint (`GET /api/status`)
  - `server/src/middleware/errorHandler.ts` - Global error handling with AppError class
  - Server responds with architecture-compliant JSON format: `{ data, meta }`
- **Project Scaffolding Task 3:** Vite + React client
  - `client/package.json` with React 18, Vite 6 dependencies
  - `client/vite.config.ts` with path aliases and API proxy to server
  - `client/tsconfig.json` with strict mode and `@/*` path aliases
  - `client/index.html` with mobile-optimized viewport meta tags
  - `client/src/main.tsx` and `client/src/App.tsx` - placeholder page
  - `client/public/favicon.svg` - branded G³ icon
  - Mobile-first placeholder UI with gradient styling
- **Project Scaffolding Task 4:** Tailwind CSS with design tokens
  - `client/tailwind.config.js` with custom colors, fonts, spacing from design system
  - `client/postcss.config.js` for Tailwind processing
  - `client/src/index.css` with CSS variables for light/dark mode
  - Design tokens: background, surface, accent, success, error, working colors
  - Mobile utilities: safe-area insets, touch-friendly sizing, scrollbar-hide
  - Component classes: card, badge-working, badge-success, badge-error
- **Project Scaffolding Task 5:** Shared types package
  - `shared/package.json` with ESM exports configuration
  - `shared/tsconfig.json` with strict mode
  - `shared/types/index.ts` with all data models from architecture.md
  - Types: Session, Message, ToolUseEvent, Project, Template, FileChange, AppSettings
  - API types: ApiResponse, ApiErrorResponse, StatusResponse
- **Project Scaffolding Task 6:** ESLint and Prettier configuration
  - `eslint.config.js` - ESLint 9 flat config with TypeScript, React, React Hooks
  - `.prettierrc` - Single quotes, 100 char width, trailing commas
  - `.prettierignore` - Ignore node_modules, dist, lock files, markdown
  - All files formatted with Prettier, all lint rules passing
- **Project Scaffolding Task 7:** Husky and lint-staged
  - `.husky/pre-commit` hook runs lint-staged on commit
  - lint-staged config: ESLint + Prettier for JS/TS, Prettier for JSON/MD/CSS
  - Pre-commit hook automatically fixes and formats staged files
- **Project Scaffolding Task 8:** TypeScript path aliases
  - `@/*` path alias configured in client/tsconfig.json, server/tsconfig.json
  - Vite resolve alias configured in client/vite.config.ts
  - Added `client/src/lib/cn.ts` utility (classnames helper)
  - Added `server/src/lib/config.ts` utility (config loader)
  - Path aliases verified working with typecheck
- **Project Scaffolding Task 9:** Development scripts and environment config
  - `.env.example` with documented variables (PORT, NODE_ENV, GROQ_API_KEY)
  - All root scripts verified working: dev, build, start, lint, typecheck
  - Server uses dotenv for environment variable loading
  - Build produces optimized production bundle (144KB gzipped to 46KB)

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
