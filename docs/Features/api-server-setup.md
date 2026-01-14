# Feature Spec: API Server Setup

## 1. Overview

### 1.1 One-Line Summary

Set up the Express API server infrastructure with middleware, router structure, static file serving, and standardized request/response handling.

### 1.2 User Story

> As a **developer**, I want to **have a well-structured API server with all middleware and conventions in place**, so that **I can quickly add feature endpoints without worrying about infrastructure**.

### 1.3 Problem Statement

The project scaffolding created a basic Express server with only a health check endpoint. Before building features like conversation viewing, prompt sending, and file diffing, the server needs proper middleware configuration (CORS, JSON parsing, logging), a router structure for organizing endpoints, static file serving for production, standardized error handling, and input validation patterns. Without this foundation, each feature would need to solve these problems independently.

### 1.4 Business Value

- **User Impact:** None directly — this is infrastructure enabling future features
- **Business Impact:** Accelerates feature development by providing a solid foundation
- **Technical Impact:** Establishes API patterns and conventions; enables clean separation between routes and business logic

---

## 2. Scope & Requirements

### 2.1 Functional Requirements

| ID   | Requirement | Priority | Notes |
|------|-------------|----------|-------|
| FR-1 | Express middleware stack: JSON parsing, CORS, request logging | MUST | Foundation for all API calls |
| FR-2 | API router structure with placeholder routes for all endpoint groups | MUST | Projects, sessions, files, transcribe, settings |
| FR-3 | Static file serving for production (serve built React app) | MUST | Single server deployment |
| FR-4 | Standardized JSON response format for success and errors | MUST | `{ data }` or `{ error: { code, message } }` |
| FR-5 | Input validation middleware using Zod | MUST | Per architecture.md |
| FR-6 | Centralized error handling middleware | MUST | Consistent error responses |
| FR-7 | Client-side API fetch wrapper with base URL configuration | MUST | Clean API calls from React |
| FR-8 | Server-side logging utility | SHOULD | Structured logging for debugging |

### 2.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| API Response Time (p50) | < 50ms (for stub endpoints) | Manual testing |
| Error Response Consistency | 100% of errors use standard format | Code review |
| TypeScript Coverage | No `any` types in new code | Type checking |

### 2.3 Acceptance Criteria

- [x] **Given** the server is running, **when** sending a JSON POST to any endpoint, **then** the body is parsed correctly ✅
- [x] **Given** the React app is built, **when** accessing `http://localhost:3456/`, **then** the built React app is served ✅
- [x] **Given** a request to a non-existent endpoint, **when** the server responds, **then** error format is `{ error: { code: "NOT_FOUND", message: "..." } }` ✅
- [x] **Given** a request with invalid input, **when** Zod validation fails, **then** error includes field-level details ✅
- [x] **Given** the client API wrapper is configured, **when** calling `api.get('/status')`, **then** it uses the correct base URL ✅
- [x] **Given** CORS is configured, **when** making requests from the Vite dev server (different port), **then** requests succeed ✅

**Status: COMPLETE** — All acceptance criteria verified 2026-01-14

### 2.4 Out of Scope

- Implementing actual business logic for any endpoints (that's JSONL Watcher Service and beyond)
- Authentication/authorization (Tailscale is the security boundary per architecture)
- WebSocket support (polling is "good enough" per decision log)
- Rate limiting (single-user local app)
- API versioning (not needed for personal tool)

---

## 3. User Experience

### 3.1 User Flow

This is infrastructure, not user-facing. The "user" is the developer building features.

```
Developer adds new endpoint → Uses existing router structure → Adds Zod schema → 
    → Uses validation middleware → Returns standardized response
```

**Developer Experience:**
1. Create new route file in `server/src/api/`
2. Define Zod schema for request validation
3. Use `validateRequest` middleware for input validation
4. Business logic returns data, middleware formats response
5. Errors automatically caught and formatted by error handler

---

## 4. Technical Approach

### 4.1 Architecture Fit

**Affected Areas:**
| Area | Impact | Description |
|------|--------|-------------|
| Frontend | NEW | Add `client/src/lib/api.ts` fetch wrapper |
| Backend | MODIFY | Enhance Express server with middleware and router structure |
| Database | NONE | N/A |
| External Services | NONE | N/A |

**Alignment with Existing Patterns:**
- Follows Express patterns from `architecture.md` Section 5
- Uses Zod for validation as specified in tech stack
- Implements response format from Section 5.4

### 4.2 Key Implementation Details

**Middleware Stack Order:**
```typescript
app.use(express.json());                    // Parse JSON bodies
app.use(cors({ origin: true }));            // Allow all origins (Tailscale is auth)
app.use(requestLogger);                     // Log all requests
app.use('/api', apiRouter);                 // Mount API routes
app.use(express.static('client/dist'));     // Serve React app
app.use(notFoundHandler);                   // Handle 404s
app.use(errorHandler);                      // Handle all errors
```

**Router Structure:**
```
/api
├── /status          ─ GET (health check, exists)
├── /projects        ─ GET (list), /:path (details), /:path/templates, /:path/files
├── /sessions        ─ GET (list), /:id (details), /:id/messages, /:id/send, /:id/stop
├── /transcribe      ─ POST (audio upload)
└── /settings        ─ GET, PUT
```

**Response Format:**
```typescript
// Success
{ data: T }

// Error
{ error: { code: string, message: string, details?: Record<string, string> } }
```

**Validation Pattern:**
```typescript
// Zod schema
const sendPromptSchema = z.object({
  prompt: z.string().min(1).max(10000),
});

// Route with validation
router.post('/:id/send', validateRequest(sendPromptSchema), async (req, res) => {
  // req.body is typed and validated
});
```

---

## 5. Implementation Tasks

### Task 1: Configure Express middleware stack
**Estimated Time:** 30 min  
**Description:** Add JSON parsing, CORS configuration, and request logging middleware to the server.

**Deliverables:**
- Add `cors` package to server
- Configure `express.json()` with size limits
- Create `server/src/middleware/requestLogger.ts`
- Update `server/src/index.ts` to use middleware stack

**Files Modified:**
- `server/package.json` (add cors)
- `server/src/index.ts`
- `server/src/middleware/requestLogger.ts` (NEW)

---

### Task 2: Create API router structure with placeholder routes
**Estimated Time:** 45 min  
**Description:** Set up router structure for all planned API endpoint groups with placeholder responses.

**Deliverables:**
- `server/src/api/index.ts` - Main API router
- `server/src/api/projects.ts` - Projects endpoints (placeholders)
- `server/src/api/sessions.ts` - Sessions endpoints (placeholders)
- `server/src/api/files.ts` - Files endpoints (placeholders)
- `server/src/api/transcribe.ts` - Transcription endpoint (placeholder)
- `server/src/api/settings.ts` - Settings endpoints (placeholders)

**Implementation Notes:**
- Each placeholder returns `{ data: { message: "Not implemented" } }` with 501 status
- Existing `/api/status` endpoint remains functional

---

### Task 3: Configure static file serving for production
**Estimated Time:** 20 min  
**Description:** Set up Express to serve the built React app for production deployment.

**Deliverables:**
- Configure `express.static()` to serve `client/dist`
- Add catch-all route for SPA client-side routing
- Ensure API routes take precedence over static serving

**Files Modified:**
- `server/src/index.ts`

---

### Task 4: Implement standardized response utilities
**Estimated Time:** 30 min  
**Description:** Create utility functions for consistent API response formatting.

**Deliverables:**
- `server/src/lib/responses.ts` - Success and error response helpers
- Update existing status endpoint to use new format
- Define TypeScript types for response shapes

**Response Utilities:**
```typescript
export function success<T>(data: T): SuccessResponse<T>
export function error(code: string, message: string, statusCode?: number): ErrorResponse
```

---

### Task 5: Create Zod validation middleware
**Estimated Time:** 30 min  
**Description:** Create reusable middleware for validating request body, query, and params with Zod.

**Deliverables:**
- `server/src/middleware/validateRequest.ts`
- TypeScript integration so validated data is properly typed
- Error formatting that includes field-level details

**Usage Pattern:**
```typescript
router.post('/send', validateRequest({ body: sendPromptSchema }), handler);
```

---

### Task 6: Enhance error handling middleware
**Estimated Time:** 30 min  
**Description:** Improve the existing error handler to support typed errors and consistent formatting.

**Deliverables:**
- `server/src/lib/errors.ts` - Custom error classes (AppError, ValidationError, NotFoundError)
- Update `server/src/middleware/errorHandler.ts` - Handle different error types
- Add 404 not found handler for unmatched routes

**Error Classes:**
```typescript
class AppError extends Error { code: string; statusCode: number; }
class ValidationError extends AppError { details: Record<string, string>; }
class NotFoundError extends AppError { constructor(resource: string); }
```

---

### Task 7: Create client-side API fetch wrapper
**Estimated Time:** 30 min  
**Description:** Create a typed fetch wrapper for the React app to call API endpoints.

**Deliverables:**
- `client/src/lib/api.ts` - API client with typed methods
- Configure base URL (auto-detect in dev vs production)
- Error handling that surfaces API error messages

**API Client Interface:**
```typescript
export const api = {
  get<T>(path: string): Promise<T>,
  post<T>(path: string, body: unknown): Promise<T>,
  put<T>(path: string, body: unknown): Promise<T>,
};
```

---

### Task 8: Add server-side logging utility
**Estimated Time:** 20 min  
**Description:** Create a simple logging utility for consistent server-side logging.

**Deliverables:**
- `server/src/lib/logger.ts` - Logger with levels (error, warn, info, debug)
- Structured output format with timestamps
- Use in request logger and error handler

**Logger Interface:**
```typescript
export const logger = {
  error(message: string, context?: object): void,
  warn(message: string, context?: object): void,
  info(message: string, context?: object): void,
  debug(message: string, context?: object): void,
};
```

---

## 6. Test Plan

### Unit Tests
- Zod validation middleware with valid and invalid inputs
- Response utility functions
- Error class instantiation and properties
- API client URL construction

### Integration Tests
- Middleware stack processes requests correctly
- Error handler formats various error types correctly
- Static file serving works for built React app
- CORS headers present on responses

### Manual Testing
- Verify all placeholder endpoints return expected 501 responses
- Verify production build serves React app at root
- Verify Vite dev server can call API (CORS works)
- Verify malformed JSON returns proper error response

---

## 7. Dependencies

### Upstream Dependencies
- [x] Project Scaffolding complete

### Downstream Dependents
- JSONL Watcher Service (uses API router structure)
- Conversation View UI (uses API client)
- All future features

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Middleware order causing issues | Medium | Medium | Follow Express best practices for middleware ordering |
| Static file serving conflicting with API routes | Low | High | Ensure API router is mounted before static serving |
| Zod validation errors not user-friendly | Medium | Low | Format validation errors with field-level details |

---

*Created: 2026-01-13*

