# AI Assistant Instructions: {{PROJECT_NAME}}

> Master instructions for AI coding assistants. This file governs behavior, coding standards, and guardrails.

---

## 1. Project Identity

**One-Line Summary:** {{Brief description of what this product does}}

**Core Objectives:**
1. {{PRIMARY_OBJECTIVE}}
2. {{SECONDARY_OBJECTIVE}}
3. {{TERTIARY_OBJECTIVE}}

**Tech Stack (Quick Ref):** {{FRONTEND_FRAMEWORK}} / {{BACKEND_FRAMEWORK}} / {{DATABASE}} / {{HOSTING}}

**System Architecture:**
```
{{SIMPLIFIED ARCHITECTURE DIAGRAM}}

Example:
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │ ──── │   Backend    │ ──── │   Database   │
│   (React)    │ HTTP │   (Node)     │      │  (Postgres)  │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                      ┌──────┴───────┐
                      │    Cache     │
                      │   (Redis)    │
                      └──────────────┘
```

**Design Principles:**
- **{{PRINCIPLE_1}}:** {{Brief description}}
- **{{PRINCIPLE_2}}:** {{Brief description}}
- **{{PRINCIPLE_3}}:** {{Brief description}}

---

## 2. Documentation Map

| Document | Purpose | When to Reference |
|----------|---------|-------------------|
| `docs/product_spec.md` | Requirements, features, UX specs | New features, understanding "what" to build |
| `docs/architecture.md` | Tech stack, system design, patterns | Implementation decisions, "how" to build |
| `docs/decision_log.md` | Architecture decisions & rationale | Before proposing major changes |
| `docs/project_status.md` | Current progress, blockers, next steps | Session start, understanding context |
| `docs/changelog.md` | Version history, recent changes | Understanding recent modifications |
| `docs/brainstorm.md` | Ideas, exploration, rough concepts | Brainstorming new features or approaches |
| `docs/Features/` | Individual feature specifications | Detailed feature work, use `feature_doc_template` as base |

> **⚠️ CRITICAL:** Documentation must be kept in sync with code changes. See Section 11 for mandatory update triggers.

---

## 3. Critical Constraints (Non-Negotiables)

**Security:**

- Never commit secrets, credentials, or API keys — use environment variables
- Never log sensitive data (passwords, tokens, PII, OAuth credentials)
- All user input must be validated server-side with Zod
- All database queries must use Prisma (parameterized by default)
- Credentials stored encrypted (AES-256-GCM) — never log decrypted values

**Data Integrity:**

- All database migrations must be reversible with rollback scripts
- Prefer soft deletes (`deleted_at`) for business data; hard deletes allowed for technical data (logs, sessions) or compliance
- Tenant isolation enforced via Supabase RLS
- All destructive operations require explicit confirmation and audit logging
- Database schema changes require migration files (no manual DB edits)

**Code Quality:**

- All code must pass linting and type checking before commit
- Avoid `any` types in TypeScript — if unavoidable, use `// eslint-disable...` with justification
- No disabled lint rules without documented justification
- No TODO/FIXME without linked issue/ticket

**Reliability:**

- All external API calls must have timeout, retry logic, and error handling
- All async operations must handle failure states
- No unbounded queries — all list endpoints must be paginated
- Background jobs must be idempotent (safe to retry)

**Deployment:**

- All changes must go through PR review before merge to main
- All PRs must have passing CI (build, lint, tests) before merge
- Production deployments require staging verification first
- Feature flags for risky changes that can be disabled without deploy

---

## 4. Development Workflow

### 4.1 Git Standards

**Branches:** `feat|fix|chore|docs|hotfix/{{ticket-id}}-short-description`

**Commits:** Use [Conventional Commits](https://conventionalcommits.org) — `type(scope): subject`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Atomic commits (one logical change), present tense imperative, ≤72 char subject
- Reference ticket in footer: `Refs: #123`

### 4.2 Pre-Commit Requirements

- [ ] Builds without errors
- [ ] Linter and formatter pass
- [ ] Tests pass
- [ ] No debug statements, commented code, or hardcoded secrets
- [ ] New dependencies documented

**Never commit:** broken builds, failing tests, incomplete refactors

---

## 5. Coding Standards

### 5.1 General Principles

- **Readability over cleverness:** Write code for humans first
- **DRY (Don't Repeat Yourself):** Extract shared logic, but avoid premature abstraction
- **YAGNI (You Aren't Gonna Need It):** Don't build for hypothetical future requirements
- **Single Responsibility:** Functions/classes do one thing well
- **Explicit over implicit:** Favor clarity over magic
- **Fail fast:** Validate early, surface errors immediately

### 5.2 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase, descriptive | `userEmail`, `isLoading` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Functions | camelCase, verb prefix | `getUserById()`, `validateInput()` |
| Classes | PascalCase, noun | `UserService`, `PaymentProcessor` |
| Interfaces/Types | PascalCase, descriptive | `UserProfile`, `ApiResponse` |
| Files (components) | PascalCase | `UserProfile.tsx` |
| Files (utilities) | camelCase or kebab-case | `formatDate.ts`, `api-client.ts` |
| CSS classes | kebab-case or BEM | `user-profile`, `btn--primary` |
| Database tables | snake_case, plural | `user_accounts`, `order_items` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `API_KEY` |

**Naming Guidelines:**
- Boolean variables: prefix with `is`, `has`, `should`, `can` (`isActive`, `hasPermission`)
- Arrays: use plural nouns (`users`, `orderItems`)
- Functions returning boolean: prefix with `is`, `has`, `can`, `should`
- Async functions: suffix with `Async` only if sync version exists
- Event handlers: prefix with `handle` or `on` (`handleSubmit`, `onClick`)

### 5.3 Code Organization

**File Structure:**
```
1. Imports (external → internal → relative)
2. Type definitions/interfaces
3. Constants
4. Helper functions (if file-scoped)
5. Main export (component/class/function)
6. Sub-components (if applicable)
```

**Import Order:**
1. External packages (node_modules)
2. Internal packages (monorepo packages)
3. Absolute imports (path aliases)
4. Relative imports (parent → sibling → child)
5. Style imports
6. Type-only imports (if separate)

### 5.4 Functions & Methods

- Aim for small functions (<50 lines), but prioritize cohesion (max ~100 lines)
- Max parameters: 3-4 (use options object for more)
- Max nesting depth: 3 levels
- Always provide return types for public functions
- Use early returns to reduce nesting
- Avoid side effects in pure functions

```typescript
// ❌ Avoid
function processUser(user, shouldSendEmail, shouldUpdateDb, shouldLog, options) {
  if (user) {
    if (user.isActive) {
      if (shouldUpdateDb) {
        // deeply nested logic
      }
    }
  }
}

// ✅ Prefer
function processUser(user: User, options: ProcessUserOptions): ProcessResult {
  if (!user) return { success: false, error: 'No user provided' };
  if (!user.isActive) return { success: false, error: 'User inactive' };
  
  return executeProcessing(user, options);
}
```

### 5.5 Comments & Documentation

**When to Comment:**
- Complex algorithms or business logic
- Non-obvious "why" (not "what")
- Workarounds with links to issues/tickets
- Public API documentation (JSDoc/TSDoc)
- TODO/FIXME with ticket reference

**When NOT to Comment:**
- Obvious code behavior
- Restating what code does
- Commented-out code (delete it)
- Outdated information

```typescript
// ❌ Bad: restates the obvious
// Increment counter by 1
counter++;

// ✅ Good: explains the why
// Offset by 1 because API returns 0-indexed pages but UI displays 1-indexed
const displayPage = apiPage + 1;

// ✅ Good: documents workaround
// HACK: Safari doesn't support this API, remove when dropping Safari 14 support
// See: https://github.com/org/repo/issues/123
```

### 5.6 TypeScript Specifics

- Enable strict mode
- Avoid `any` — use `unknown` and narrow, or define proper types
- Prefer interfaces for object shapes, types for unions/intersections
- Use `as const` for literal types
- Leverage discriminated unions for state
- Export types alongside their implementations

```typescript
// ❌ Avoid
const config: any = getConfig();
function process(data: any): any { }

// ✅ Prefer
const config: AppConfig = getConfig();
function process(data: InputData): ProcessedResult { }

// ✅ Use discriminated unions
type AsyncState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

---

## 6. Error Handling

### 6.1 Principles

- Never swallow errors silently
- Log errors with context (what operation, what input)
- Provide user-friendly messages (hide technical details from users)
- Use typed errors when possible
- Fail fast on invalid state

### 6.2 Error Handling Patterns

**API/Service Layer:**
```typescript
// Create typed error classes
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

class ValidationError extends AppError {
  constructor(message: string, public fields: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

// Centralized error handling
function handleError(error: unknown): ApiErrorResponse {
  if (error instanceof AppError && error.isOperational) {
    return { code: error.code, message: error.message, statusCode: error.statusCode };
  }
  
  // Log unexpected errors, return generic message
  logger.error('Unexpected error', { error });
  return { code: 'INTERNAL_ERROR', message: 'Something went wrong', statusCode: 500 };
}
```

**Frontend Components:**
- Use Error Boundaries for component trees
- Handle async errors in try/catch or .catch()
- Display appropriate error states to users
- Provide retry mechanisms where applicable

### 6.3 Logging Standards

| Level | When to Use |
|-------|-------------|
| `error` | Unexpected failures, exceptions, operational issues |
| `warn` | Recoverable issues, deprecation notices, fallback triggered |
| `info` | Significant events (startup, shutdown, auth, transactions) |
| `debug` | Development diagnostics, request/response details |

**Log Context Requirements:**
- Operation being performed
- Relevant identifiers (userId, orderId, etc.)
- Duration for async operations
- Error stack traces (errors only)

---

## 7. Security Guidelines

### 7.1 Data Handling

- **Never log:** passwords, tokens, API keys, PII, credit card numbers
- **Never commit:** secrets, credentials, environment files (.env)
- **Always sanitize:** user input before display (prevent XSS)
- **Always parameterize:** database queries (prevent SQL injection)
- **Always validate:** input on both client AND server

### 7.2 Authentication & Authorization

- Store tokens securely (httpOnly cookies preferred over localStorage)
- Implement token refresh before expiration
- Check authorization on every protected operation (server-side)
- Use principle of least privilege
- Invalidate sessions on password change/logout

### 7.3 Security Checklist

- [ ] Input validation on all user inputs
- [ ] Output encoding/escaping for XSS prevention
- [ ] Parameterized queries for SQL injection prevention
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting on sensitive endpoints
- [ ] Proper CORS configuration
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] Sensitive data encrypted at rest and in transit
- [ ] Audit logging for sensitive operations

---

## 8. Testing Requirements

### 8.1 Coverage Expectations

| Test Type | Requirement |
|-----------|-------------|
| Unit Tests | All business logic, utilities, helpers |
| Integration Tests | API endpoints, database operations |
| E2E Tests | Critical user journeys only |

### 8.2 What to Test

**Always Test:**
- Business logic and calculations
- Data transformations
- Validation logic
- Error handling paths
- Edge cases (empty arrays, null values, boundaries)

**Don't Over-Test:**
- Third-party library internals
- Simple getters/setters
- Framework behavior
- Implementation details (test behavior, not implementation)

### 8.3 Test Quality Standards

- Tests are independent (no shared state)
- Tests are deterministic (no flaky tests)
- Tests are fast (mock external services)
- Descriptive test names: `should [expected behavior] when [condition]`
- Arrange-Act-Assert structure
- One logical assertion per test

```typescript
// ❌ Vague test name
test('user validation', () => { });

// ✅ Descriptive test name
test('should return validation error when email format is invalid', () => {
  // Arrange
  const invalidEmail = 'not-an-email';
  
  // Act
  const result = validateUserEmail(invalidEmail);
  
  // Assert
  expect(result.isValid).toBe(false);
  expect(result.error).toBe('Invalid email format');
});
```

---

## 9. Performance Guidelines

### 9.1 Frontend Performance

- Lazy load routes and heavy components
- Optimize images (WebP, proper sizing, lazy loading)
- Minimize bundle size (tree shaking, code splitting)
- Debounce/throttle expensive operations
- Memoize expensive calculations and components
- Avoid layout thrashing (batch DOM reads/writes)
- Use virtualization for long lists

### 9.2 Backend Performance

- Use database indexes for frequently queried fields
- Paginate list endpoints (never return unbounded results)
- Implement caching where appropriate (with invalidation strategy)
- Use connection pooling for databases
- Batch database operations when possible
- Optimize N+1 queries (use joins or dataloaders)

### 9.3 Performance Anti-Patterns

- Fetching data not needed for current view
- Synchronous operations that could be async
- Blocking the event loop with CPU-intensive tasks
- Unbounded queries or memory accumulation
- Missing database indexes on foreign keys

---

## 10. AI Assistant Behavior

### 10.1 Before Making Changes

1. **Read `AGENTS.md`** first to understand core instructions
2. **Read `project_status.md`** first to understand current context and priorities
3. **Read relevant files** before proposing edits — don't assume
4. **Understand context** — check related files, existing patterns
5. **Review `architecture.md`** for established patterns
6. **Check `decision_log.md`** for prior decisions on similar topics

### 10.2 When Writing Code

- Follow existing patterns in the codebase — match style of surrounding code
- **Search for existing utilities/helpers before creating new ones** — avoid duplication
- **Check for existing similar components/functions** — extend rather than recreate
- Prefer editing existing files over creating new ones
- Keep changes minimal and focused on the task
- Verify imports resolve correctly after adding/moving code

### 10.3 What NOT to Do

- Don't add features beyond what's requested
- Don't refactor unrelated code *in the same commit* (separate refactors into their own commits)
- Don't add "nice to have" error handling for impossible cases
- Don't create abstractions for one-time operations
- Don't add dependencies without explicit approval
- Don't generate placeholder content or TODO implementations
- Don't modify configuration files without explaining why
- Don't delete tests or reduce test coverage
- **Don't create duplicate functions/variables** — reuse existing code
- **Don't shadow variable names** — use distinct, descriptive names
- Don't leave unused imports, variables, or dead code
- **Don't skip documentation updates** — always update relevant docs after making changes
- **Don't leave `project_status.md` stale** — update it at session end

### 10.4 After Making Changes

> **⚠️ MANDATORY:** Always update documentation after completing work. This is not optional.

1. **Update `changelog.md`** with what was added, changed, or fixed
2. **Update `project_status.md`** to reflect current progress
3. **Add to `decision_log.md`** if any architectural decisions were made
4. **Update `architecture.md`** if tech stack, schema, or API changed
5. **Create/update feature docs** in `docs/Features/` for feature work

**Never leave documentation stale.** Documentation updates are part of completing the work, not a separate task.

### 10.5 Communication

- Explain significant architectural decisions
- Flag potential issues or concerns proactively
- Ask clarifying questions when requirements are ambiguous
- Summarize changes made at the end of significant work
- Confirm which documentation was updated after completing work

---

## 11. Documentation Maintenance

> **⚠️ MANDATORY:** AI assistants MUST automatically update relevant documentation after completing key actions. This is not optional.

### 11.1 Automatic Documentation Update Triggers

| Trigger Event | Required Documentation Updates |
|---------------|-------------------------------|
| **Feature completed (all tasks)** | `changelog.md` (Added section), `project_status.md` (move to Completed) |
| **Bug fixed** | `changelog.md` (Fixed section), `project_status.md` (update Known Issues if applicable) |
| **New dependency added** | `architecture.md` (tech stack tables), `changelog.md` (Dependencies section) |
| **Database schema changed** | `architecture.md` (Section 4), `decision_log.md` (if significant), `changelog.md` |
| **API endpoint added/changed** | `architecture.md` (Section 5), `changelog.md` |
| **Tech stack decision made** | `decision_log.md` (new entry), `architecture.md` (update relevant section) |
| **Breaking change introduced** | `changelog.md` (Breaking section with migration), `decision_log.md` |
| **Work session started** | Read `project_status.md` first to understand context |
| **Work session ended** | `project_status.md` (update progress, blockers, next steps) |
| **Milestone completed** | `project_status.md`, `changelog.md`, potentially new version tag |
| **Error pattern resolved** | `decision_log.md` (with AI Instructions for future prevention) |
| **New feature planned** | Create `docs/Features/{{feature_name}}.md` using `feature_doc_template` |

### 11.2 Document-Specific Update Rules

| Document | Update When | What to Include |
|----------|-------------|-----------------|
| `project_status.md` | Start/end of work sessions, completing milestones | Current state, blockers, next priorities |
| `architecture.md` | Adding services, changing tech stack, schema changes | Technical details, rationale, diagrams |
| `decision_log.md` | Making significant technical decisions or resolving errors | Trigger, decision, rationale, AI instructions |
| `changelog.md` | Completing features, fixing bugs, releasing versions | Categorized changes (Added/Changed/Fixed/etc.) |
| `product_spec.md` | Requirements change (coordinate with product owner) | Updated specs, acceptance criteria |
| `brainstorm.md` | Exploring ideas, documenting options considered | Raw ideas, pros/cons, exploration notes |
| `docs/Features/*.md` | Planning or implementing specific features | Use `feature_doc_template` as base |

### 11.3 Documentation Standards

- **Keep docs up-to-date with code changes** — never leave docs stale after making changes
- Use consistent formatting (see existing docs for examples)
- Date entries in changelog and decision log (format: YYYY-MM-DD)
- Link related documents where relevant using relative paths
- For decision_log entries: always include `AI Instructions` section to guide future AI behavior

### 11.4 Post-Action Checklist

After completing any significant work, verify:
- [ ] `changelog.md` reflects what changed
- [ ] `project_status.md` reflects current state
- [ ] `decision_log.md` captures any architectural decisions made
- [ ] `architecture.md` updated if tech stack or structure changed
- [ ] Feature docs created/updated for feature work

---

## 12. Quick Reference Commands

```bash
# Development
{{DEV_START_COMMAND}}           # Start development server
{{BUILD_COMMAND}}               # Build for production
{{LINT_COMMAND}}                # Run linter
{{FORMAT_COMMAND}}              # Run formatter

# Testing
{{TEST_COMMAND}}                # Run all tests
{{TEST_WATCH_COMMAND}}          # Run tests in watch mode
{{TEST_COVERAGE_COMMAND}}       # Run tests with coverage

# Database
{{DB_MIGRATE_COMMAND}}          # Run migrations
{{DB_SEED_COMMAND}}             # Seed database
{{DB_RESET_COMMAND}}            # Reset database

# Other
{{TYPE_CHECK_COMMAND}}          # TypeScript type check
{{GEN_TYPES_COMMAND}}           # Generate types from schema
```

---

## 13. Project-Specific Guidelines

{{Add any project-specific conventions, patterns, or rules that don't fit the categories above}}

---

*Last Updated: {{DATE}}*

