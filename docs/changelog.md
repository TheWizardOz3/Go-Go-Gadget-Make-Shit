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
| 0.1.0 | 2026-01-13 | prerelease | Project scaffolding complete |
| 0.0.2 | 2026-01-13 | prerelease | Technical architecture documentation |
| 0.0.1 | 2026-01-13 | prerelease | Initial product specification |

**Types:** `major` | `minor` | `patch` | `prerelease`

---

## Releases

<!-- Add new versions below this line, newest first -->

## [Unreleased]

### Added
- Nothing yet

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
