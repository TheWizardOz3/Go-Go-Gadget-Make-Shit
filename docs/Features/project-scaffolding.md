# Feature Spec: Project Scaffolding

## 1. Overview

### 1.1 One-Line Summary

Initialize the GoGoGadgetClaude monorepo with pnpm workspaces, React/Vite client, Express server, and all development tooling configured.

### 1.2 User Story

> As a **developer**, I want to **have a fully configured project structure**, so that **I can immediately start building features without setup friction**.

### 1.3 Problem Statement

Before any features can be built, the project needs a solid foundation with all tooling configured: TypeScript compilation, linting, formatting, hot reload for development, and a clean directory structure matching the architecture documentation. Without this scaffolding, feature development would be blocked.

### 1.4 Business Value

- **User Impact:** None directly — this is infrastructure
- **Business Impact:** Enables all future development work; reduces friction for contributors
- **Technical Impact:** Establishes patterns and conventions that will be used throughout the codebase

---

## 2. Scope & Requirements

### 2.1 Functional Requirements

| ID   | Requirement | Priority | Notes |
|------|-------------|----------|-------|
| FR-1 | pnpm workspace with client/server/shared packages | MUST | Matches architecture.md structure |
| FR-2 | React 18 + Vite 5 client with TypeScript | MUST | As per tech stack definition |
| FR-3 | Express 4 server with TypeScript | MUST | As per tech stack definition |
| FR-4 | Tailwind CSS configured with design tokens | MUST | Colors from product_spec.md |
| FR-5 | ESLint + Prettier configured for both packages | MUST | Code quality |
| FR-6 | Husky + lint-staged for pre-commit hooks | MUST | Enforce standards |
| FR-7 | TypeScript path aliases (@/*) configured | MUST | Clean imports |
| FR-8 | Development scripts (dev, build, start) | MUST | DX |
| FR-9 | .env.example with documented variables | MUST | Onboarding |
| FR-10 | Health check endpoint (/api/status) | MUST | Verify server works |

### 2.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Dev Server Startup | < 5 seconds | Manual timing |
| Hot Reload | < 1 second | Manual testing |
| Build Time | < 30 seconds | Manual timing |
| TypeScript Strict Mode | Enabled | tsconfig.json |

### 2.3 Acceptance Criteria

- [x] **Given** a fresh clone, **when** running `pnpm install && pnpm dev`, **then** both client and server start without errors ✅
- [x] **Given** the dev server is running, **when** visiting `localhost:5173`, **then** a "Hello GoGoGadgetClaude" page renders ✅
- [x] **Given** the dev server is running, **when** visiting `localhost:3456/api/status`, **then** JSON response `{"healthy": true}` is returned ✅
- [x] **Given** a file with lint errors, **when** committing, **then** pre-commit hook blocks the commit ✅
- [x] **Given** any TypeScript file, **when** importing with `@/`, **then** path aliases resolve correctly ✅

**Status: COMPLETE** — All acceptance criteria verified 2026-01-13

### 2.4 Out of Scope

- Any feature implementation (conversation view, etc.)
- Database setup (not needed per architecture)
- Deployment configuration (LaunchAgent, PM2)
- Test setup beyond verifying Vitest runs
- CI/CD workflows

---

## 3. User Experience

### 3.1 User Flow

```
Clone repo → pnpm install → pnpm dev → Open browser → See hello page
                                              ↓
                                    Hit /api/status → See health check
```

**Happy Path:**
1. Developer clones repository
2. Runs `pnpm install` to install all dependencies
3. Copies `.env.example` to `.env` (no secrets needed for scaffolding)
4. Runs `pnpm dev` to start development servers
5. Opens `localhost:5173` to see React app
6. Opens `localhost:3456/api/status` to verify server

---

## 4. Technical Approach

### 4.1 Architecture Fit

**Affected Areas:**
| Area | Impact | Description |
|------|--------|-------------|
| Frontend | NEW | Create client/ with React, Vite, Tailwind |
| Backend | NEW | Create server/ with Express |
| Shared | NEW | Create shared/ for types |
| Tooling | NEW | ESLint, Prettier, Husky, TypeScript configs |

**Alignment with Existing Patterns:**
This directly implements the directory structure from `architecture.md` Section 3.2.

### 4.2 Key Implementation Details

**pnpm Workspace Structure:**
```
gogogadgetclaude/
├── pnpm-workspace.yaml
├── package.json (root - scripts only)
├── client/package.json
├── server/package.json
└── shared/package.json
```

**Tailwind Design Tokens (from product_spec.md):**
```css
--color-background: #FAFAFA / #0A0A0A
--color-surface: #FFFFFF / #141414
--color-accent: #6366F1 / #818CF8
--color-success: #10B981 / #34D399
--color-error: #EF4444 / #F87171
--color-working: #3B82F6 / #60A5FA
```

**Server Port:** 3456 (per architecture.md)
**Client Port:** 5173 (Vite default)

---

## 5. Implementation Tasks

### Task 1: Initialize pnpm workspace and root configuration
**Estimated Time:** 30 min  
**Description:** Create root `package.json`, `pnpm-workspace.yaml`, `.gitignore`, and root-level scripts.

**Deliverables:**
- Root `package.json` with workspace scripts
- `pnpm-workspace.yaml` defining packages
- `.gitignore` with standard Node/build ignores
- `.nvmrc` specifying Node 20

---

### Task 2: Create server package with Express and TypeScript
**Estimated Time:** 45 min  
**Description:** Set up Express server with TypeScript, basic health check endpoint.

**Deliverables:**
- `server/package.json` with dependencies
- `server/tsconfig.json` with strict mode
- `server/src/index.ts` - Express entry point
- `server/src/api/status.ts` - Health check route
- `server/src/middleware/errorHandler.ts` - Error handling

---

### Task 3: Create client package with Vite and React
**Estimated Time:** 45 min  
**Description:** Set up React 18 with Vite, TypeScript, and a placeholder home page.

**Deliverables:**
- `client/package.json` with dependencies
- `client/vite.config.ts`
- `client/tsconfig.json` with path aliases
- `client/index.html`
- `client/src/main.tsx` - Entry point
- `client/src/App.tsx` - Placeholder with "Hello GoGoGadgetClaude"

---

### Task 4: Configure Tailwind CSS with design tokens
**Estimated Time:** 30 min  
**Description:** Add Tailwind with custom theme using design tokens from product spec.

**Deliverables:**
- `client/tailwind.config.js` with custom colors, fonts, spacing
- `client/postcss.config.js`
- `client/src/index.css` with Tailwind directives and CSS variables

---

### Task 5: Create shared types package
**Estimated Time:** 20 min  
**Description:** Create shared package for TypeScript types used by both client and server.

**Deliverables:**
- `shared/package.json`
- `shared/tsconfig.json`
- `shared/types/index.ts` with placeholder types

---

### Task 6: Configure ESLint and Prettier
**Estimated Time:** 30 min  
**Description:** Set up ESLint with TypeScript support and Prettier for consistent formatting.

**Deliverables:**
- Root `eslint.config.js` (flat config)
- Root `.prettierrc`
- Root `.prettierignore`
- ESLint integration in all tsconfig files

---

### Task 7: Configure Husky and lint-staged
**Estimated Time:** 20 min  
**Description:** Add pre-commit hooks to enforce linting and formatting.

**Deliverables:**
- `.husky/pre-commit` hook
- `lint-staged` config in root package.json
- Husky install script

---

### Task 8: Configure TypeScript path aliases
**Estimated Time:** 20 min  
**Description:** Set up `@/` path aliases in both client and server packages.

**Deliverables:**
- Updated `client/tsconfig.json` with paths
- Updated `server/tsconfig.json` with paths
- Updated `client/vite.config.ts` with resolve aliases

---

### Task 9: Add development scripts and environment config
**Estimated Time:** 30 min  
**Description:** Create unified dev/build/start scripts and environment variable template.

**Deliverables:**
- Root `package.json` scripts: `dev`, `dev:client`, `dev:server`, `build`, `start`, `lint`, `lint:fix`, `typecheck`
- `.env.example` with documented variables
- Server reads from `.env` using dotenv

---

### Task 10: Verify everything works end-to-end
**Estimated Time:** 20 min  
**Description:** Final verification that all pieces work together.

**Verification Steps:**
- [ ] Fresh `pnpm install` succeeds
- [ ] `pnpm dev` starts both servers
- [ ] Client renders at localhost:5173
- [ ] Server responds at localhost:3456/api/status
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] Pre-commit hook fires on commit attempt

---

## 6. Test Plan

### Unit Tests
Not applicable for scaffolding — no business logic.

### Integration Tests
- Verify `/api/status` endpoint returns expected response

### Manual Testing
- Full walkthrough of developer setup experience
- Verify hot reload works for both client and server changes
- Verify lint errors block commits

---

## 7. Dependencies

### Upstream Dependencies
- [x] Architecture documentation complete

### Downstream Dependents
- API Server Setup
- All future features

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| pnpm workspace complexity | Low | Medium | Follow official pnpm workspace docs |
| Path alias resolution issues | Medium | Low | Test early, use proven patterns |
| Version conflicts between packages | Low | Medium | Pin versions explicitly |

---

*Created: 2026-01-13*

