# Technical Architecture: {{PROJECT_NAME}}

> **Purpose:** This is the Engineering Design Document (EDD) — the "How" of implementation. It serves as the technical reference for AI coding assistants and human developers alike. For product requirements and the "What," see `product_spec.md`.

---

## 1. Tech Stack Definition

### 1.1 Frontend Stack

| Layer | Technology | Version | Package Name | Rationale |
|-------|------------|---------|--------------|-----------|
| Framework | {{FRAMEWORK}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Language | {{LANGUAGE}} | {{VERSION}} | — | {{WHY_CHOSEN}} |
| State Management | {{STATE_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Data Fetching | {{DATA_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Routing | {{ROUTER}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Styling | {{STYLE_SYSTEM}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Component Library | {{COMPONENT_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Form Handling | {{FORM_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Validation | {{VALIDATION_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Build Tool | {{BUILD_TOOL}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Package Manager | {{PACKAGE_MANAGER}} | {{VERSION}} | — | {{WHY_CHOSEN}} |

### 1.2 Backend Stack

| Layer | Technology | Version | Package Name | Rationale |
|-------|------------|---------|--------------|-----------|
| Runtime | {{RUNTIME}} | {{VERSION}} | — | {{WHY_CHOSEN}} |
| Language | {{LANGUAGE}} | {{VERSION}} | — | {{WHY_CHOSEN}} |
| Framework | {{FRAMEWORK}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| API Style | {{REST/GRAPHQL/GRPC/TRPC}} | — | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| ORM / Data Layer | {{ORM}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Validation | {{VALIDATION_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Authentication | {{AUTH_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| Job Queue | {{QUEUE_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |
| WebSocket | {{WS_LIB}} | {{VERSION}} | {{PACKAGE_NAME}} | {{WHY_CHOSEN}} |

### 1.3 Database & Storage

| Component | Technology | Version/Tier | Hosted By | Rationale |
|-----------|------------|--------------|-----------|-----------|
| Primary Database | {{DATABASE}} | {{VERSION}} | {{HOST}} | {{WHY_CHOSEN}} |
| Cache Layer | {{CACHE}} | {{VERSION}} | {{HOST}} | {{WHY_CHOSEN}} |
| Search Engine | {{SEARCH}} | {{VERSION}} | {{HOST}} | {{WHY_CHOSEN}} |
| File Storage | {{STORAGE}} | — | {{HOST}} | {{WHY_CHOSEN}} |
| Vector Database | {{VECTOR_DB}} | {{VERSION}} | {{HOST}} | {{WHY_CHOSEN}} |

### 1.4 Infrastructure & DevOps

| Component | Technology | Tier/Plan | Rationale |
|-----------|------------|-----------|-----------|
| Hosting (Frontend) | {{HOST}} | {{TIER}} | {{WHY_CHOSEN}} |
| Hosting (Backend) | {{HOST}} | {{TIER}} | {{WHY_CHOSEN}} |
| Hosting (Database) | {{HOST}} | {{TIER}} | {{WHY_CHOSEN}} |
| CI/CD | {{CI_CD}} | {{TIER}} | {{WHY_CHOSEN}} |
| Container Registry | {{REGISTRY}} | {{TIER}} | {{WHY_CHOSEN}} |
| CDN | {{CDN}} | {{TIER}} | {{WHY_CHOSEN}} |
| DNS | {{DNS}} | {{TIER}} | {{WHY_CHOSEN}} |
| SSL/TLS | {{SSL_PROVIDER}} | — | {{WHY_CHOSEN}} |
| Secrets Management | {{SECRETS}} | {{TIER}} | {{WHY_CHOSEN}} |

### 1.5 Observability & Monitoring

| Component | Technology | Tier/Plan | Purpose |
|-----------|------------|-----------|---------|
| Error Tracking | {{ERROR_TOOL}} | {{TIER}} | {{PURPOSE}} |
| APM / Tracing | {{APM_TOOL}} | {{TIER}} | {{PURPOSE}} |
| Log Aggregation | {{LOG_TOOL}} | {{TIER}} | {{PURPOSE}} |
| Uptime Monitoring | {{UPTIME_TOOL}} | {{TIER}} | {{PURPOSE}} |
| Analytics | {{ANALYTICS_TOOL}} | {{TIER}} | {{PURPOSE}} |

### 1.6 Development Tools

| Tool | Purpose | Configuration File |
|------|---------|-------------------|
| Linter | {{LINTER}} | {{CONFIG_FILE}} |
| Formatter | {{FORMATTER}} | {{CONFIG_FILE}} |
| Type Checker | {{TYPE_CHECKER}} | {{CONFIG_FILE}} |
| Test Runner | {{TEST_RUNNER}} | {{CONFIG_FILE}} |
| Git Hooks | {{GIT_HOOKS}} | {{CONFIG_FILE}} |
| Environment Variables | {{ENV_TOOL}} | {{CONFIG_FILE}} |

---

## 2. System Architecture

### 2.1 Architecture Pattern
**Pattern:** {{MONOLITH | MODULAR_MONOLITH | MICROSERVICES | SERVERLESS | JAMSTACK | HYBRID}}

**Description:**  
{{High-level description of why this pattern was chosen and how the system is organized}}

### 2.2 High-Level Architecture Diagram

```
{{TEXT-BASED DIAGRAM OR MERMAID SYNTAX}}

Example:
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Web App   │  │ Mobile App  │  │   Admin     │              │
│  │   (React)   │  │  (Future)   │  │   Panel     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY / EDGE                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              CDN / Load Balancer / Auth Edge              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   API       │  │  Background │  │  WebSocket  │              │
│  │   Server    │  │   Workers   │  │   Server    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Database   │  │    Cache    │  │   Storage   │              │
│  │  (Primary)  │  │   (Redis)   │  │   (S3/R2)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Service Boundaries & Responsibilities

| Service/Module | Responsibility | Exposes | Consumes |
|----------------|----------------|---------|----------|
| {{SERVICE_NAME}} | {{RESPONSIBILITY}} | {{APIS/EVENTS}} | {{DEPENDENCIES}} |
| {{SERVICE_NAME}} | {{RESPONSIBILITY}} | {{APIS/EVENTS}} | {{DEPENDENCIES}} |

### 2.4 Data Flow Patterns

#### Request Flow
```
{{DIAGRAM OR DESCRIPTION OF TYPICAL REQUEST FLOW}}

Example:
1. Client sends request to CDN/Edge
2. Edge validates auth token (if required)
3. Request routed to API server
4. API server validates input
5. Business logic executed
6. Database queried/updated
7. Response returned through layers
```

#### Event Flow (if applicable)
```
{{DIAGRAM OR DESCRIPTION OF EVENT/MESSAGE FLOW}}

Example:
1. Action triggers event
2. Event published to queue
3. Worker picks up event
4. Worker processes and updates state
5. WebSocket broadcasts to relevant clients
```

### 2.5 Communication Patterns

| Pattern | Used For | Implementation |
|---------|----------|----------------|
| Synchronous HTTP | {{USE_CASE}} | {{IMPLEMENTATION}} |
| WebSocket | {{USE_CASE}} | {{IMPLEMENTATION}} |
| Message Queue | {{USE_CASE}} | {{IMPLEMENTATION}} |
| Server-Sent Events | {{USE_CASE}} | {{IMPLEMENTATION}} |

---

## 3. Project Directory Structure

### 3.1 Monorepo vs Polyrepo
**Structure:** {{MONOREPO | POLYREPO | SINGLE_REPO}}
**Tool:** {{TURBOREPO | NX | LERNA | NONE}}

### 3.2 Directory Tree

```
{{PROJECT_ROOT}}/
├── .github/                    # GitHub workflows, PR templates
│   └── workflows/
├── .vscode/                    # Editor configuration
├── apps/                       # Application packages (monorepo)
│   ├── {{FRONTEND_APP}}/       # Frontend application
│   │   ├── public/             # Static assets
│   │   ├── src/
│   │   │   ├── app/            # App entry, routing, providers
│   │   │   ├── components/     # UI components
│   │   │   │   ├── ui/         # Primitive/base components
│   │   │   │   └── features/   # Feature-specific components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utility functions, helpers
│   │   │   ├── services/       # API client, external services
│   │   │   ├── stores/         # State management
│   │   │   ├── types/          # TypeScript types/interfaces
│   │   │   └── styles/         # Global styles, themes
│   │   ├── tests/              # Test files
│   │   └── {{CONFIG_FILES}}    # tsconfig, vite.config, etc.
│   │
│   └── {{BACKEND_APP}}/        # Backend application
│       ├── src/
│       │   ├── api/            # Route handlers/controllers
│       │   │   └── {{VERSION}}/# API versioning
│       │   ├── config/         # Configuration management
│       │   ├── db/             # Database connection, migrations
│       │   │   ├── migrations/
│       │   │   ├── seeds/
│       │   │   └── schema/
│       │   ├── middleware/     # Express/Hono middleware
│       │   ├── models/         # Data models / entities
│       │   ├── services/       # Business logic layer
│       │   ├── jobs/           # Background job definitions
│       │   ├── utils/          # Utility functions
│       │   ├── types/          # TypeScript types
│       │   └── index.ts        # Application entry point
│       ├── tests/
│       └── {{CONFIG_FILES}}
│
├── packages/                   # Shared packages (monorepo)
│   ├── {{SHARED_TYPES}}/       # Shared TypeScript types
│   ├── {{SHARED_UTILS}}/       # Shared utility functions
│   └── {{UI_LIBRARY}}/         # Shared component library
│
├── docs/                       # Documentation
│   ├── architecture.md         # This file
│   ├── product_spec.md         # Product specification
│   └── {{OTHER_DOCS}}
│
├── scripts/                    # Build, deploy, utility scripts
├── docker/                     # Docker configurations
├── .env.example                # Environment variable template
├── {{PACKAGE_MANAGER_CONFIG}}  # package.json, pnpm-workspace.yaml
├── {{TYPESCRIPT_CONFIG}}       # tsconfig.json
└── README.md
```

### 3.3 Key Directory Explanations

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `apps/{{FRONTEND}}/components/ui/` | {{PURPOSE}} | {{CONTENTS}} |
| `apps/{{FRONTEND}}/components/features/` | {{PURPOSE}} | {{CONTENTS}} |
| `apps/{{BACKEND}}/services/` | {{PURPOSE}} | {{CONTENTS}} |
| `apps/{{BACKEND}}/api/` | {{PURPOSE}} | {{CONTENTS}} |
| `packages/` | {{PURPOSE}} | {{CONTENTS}} |

### 3.4 Business Logic Location

**Primary Location:** `{{PATH_TO_BUSINESS_LOGIC}}`

**Guidelines:**
- {{GUIDELINE_1 — e.g., "All business rules live in services/, never in controllers"}}
- {{GUIDELINE_2 — e.g., "Database queries only occur in repositories/"}}
- {{GUIDELINE_3 — e.g., "Validation schemas co-located with their service"}}

### 3.5 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | {{CONVENTION}} | {{EXAMPLE}} |
| Hooks | {{CONVENTION}} | {{EXAMPLE}} |
| Services | {{CONVENTION}} | {{EXAMPLE}} |
| Types | {{CONVENTION}} | {{EXAMPLE}} |
| Tests | {{CONVENTION}} | {{EXAMPLE}} |
| Utilities | {{CONVENTION}} | {{EXAMPLE}} |

---

## 4. Database Design

### 4.1 Database Selection Rationale
**Primary Database:** {{DATABASE}}  
**Why:** {{RATIONALE}}

### 4.2 Entity Relationship Diagram (ERD)

```
{{MERMAID ERD OR TEXT-BASED ERD}}

Example:
erDiagram
    USER ||--o{ POST : creates
    USER ||--o{ COMMENT : writes
    POST ||--o{ COMMENT : has
    USER {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }
    POST {
        uuid id PK
        uuid user_id FK
        string title
        text content
        timestamp created_at
    }
```

### 4.3 Schema Documentation

#### Table: {{TABLE_NAME}}
**Purpose:** {{PURPOSE}}

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| {{COLUMN}} | {{TYPE}} | {{YES/NO}} | {{DEFAULT}} | {{PK/FK/UK/INDEX}} | {{DESCRIPTION}} |

**Indexes:**
- `{{INDEX_NAME}}` on (`{{COLUMNS}}`) — {{RATIONALE}}

**Relationships:**
- {{RELATIONSHIP_DESCRIPTION}}

---

*{{Repeat table documentation for each table}}*

---

### 4.4 Migration Strategy

**Tool:** {{MIGRATION_TOOL — e.g., Prisma Migrate, Drizzle Kit, Knex}}

**Conventions:**
- Migration naming: `{{NAMING_CONVENTION}}`
- Rollback strategy: {{STRATEGY}}
- Production deployment: {{PROCESS}}

**Commands:**
```bash
# Generate migration
{{COMMAND}}

# Run migrations
{{COMMAND}}

# Rollback
{{COMMAND}}
```

### 4.5 Seeding Strategy

**Purpose:** {{WHEN_AND_WHY_TO_SEED}}

**Seed Data Categories:**
| Category | Purpose | Environment |
|----------|---------|-------------|
| Reference Data | {{PURPOSE}} | {{ALL/PROD/DEV}} |
| Test Data | {{PURPOSE}} | {{DEV/TEST}} |
| Demo Data | {{PURPOSE}} | {{STAGING}} |

---

## 5. API Specification

### 5.1 API Design Philosophy

**Style:** {{REST | GRAPHQL | GRPC | TRPC}}  
**Versioning:** {{URL_PATH (/v1/) | HEADER | QUERY_PARAM | NONE}}  
**Base URL:** `{{BASE_URL}}`

### 5.2 Authentication & Authorization

#### Authentication Method
**Type:** {{JWT | SESSION | API_KEY | OAUTH2 | COMBINATION}}

**Flow:**
```
{{AUTHENTICATION FLOW DIAGRAM}}

Example:
1. User submits credentials to /auth/login
2. Server validates and returns JWT access + refresh tokens
3. Client stores tokens securely
4. Client sends access token in Authorization header
5. Server validates token on protected routes
```

**Token Configuration:**
| Token Type | Lifetime | Storage | Refresh Strategy |
|------------|----------|---------|------------------|
| Access Token | {{DURATION}} | {{WHERE}} | {{STRATEGY}} |
| Refresh Token | {{DURATION}} | {{WHERE}} | {{STRATEGY}} |

#### Authorization Model
**Type:** {{RBAC | ABAC | PBAC | CUSTOM}}

**Roles:**
| Role | Description | Permissions |
|------|-------------|-------------|
| {{ROLE}} | {{DESCRIPTION}} | {{PERMISSIONS}} |

### 5.3 Endpoint Groups

#### Group: {{GROUP_NAME}} — `{{BASE_PATH}}`

| Method | Endpoint | Purpose | Auth | Request Body | Response |
|--------|----------|---------|------|--------------|----------|
| {{METHOD}} | `{{PATH}}` | {{PURPOSE}} | {{AUTH_LEVEL}} | {{BODY_REF}} | {{RESPONSE_REF}} |

**Request/Response Schemas:**

```typescript
// Request: {{OPERATION_NAME}}
{{REQUEST_SCHEMA}}

// Response: {{OPERATION_NAME}}
{{RESPONSE_SCHEMA}}
```

---

*{{Repeat endpoint group for each logical grouping}}*

---

### 5.4 Request/Response Standards

#### Request Format
- **Content-Type:** `{{CONTENT_TYPE}}`
- **Pagination:** `{{CURSOR | OFFSET | PAGE}}` via `{{PARAMS}}`
- **Filtering:** `{{PATTERN}}`
- **Sorting:** `{{PATTERN}}`

#### Response Format
```typescript
// Success Response
{
  "success": true,
  "data": {{DATA}},
  "meta": {
    "pagination": {{PAGINATION_OBJECT}}
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "{{ERROR_CODE}}",
    "message": "{{USER_FRIENDLY_MESSAGE}}",
    "details": {{VALIDATION_ERRORS_OR_CONTEXT}}
  }
}
```

#### HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | {{USAGE}} |
| 201 | {{USAGE}} |
| 400 | {{USAGE}} |
| 401 | {{USAGE}} |
| 403 | {{USAGE}} |
| 404 | {{USAGE}} |
| 422 | {{USAGE}} |
| 429 | {{USAGE}} |
| 500 | {{USAGE}} |

### 5.5 Rate Limiting

| Endpoint Group | Limit | Window | Scope |
|----------------|-------|--------|-------|
| {{GROUP}} | {{LIMIT}} | {{WINDOW}} | {{PER_IP/PER_USER/PER_API_KEY}} |

---

## 6. External Integrations

### 6.1 Third-Party Services

| Service | Purpose | Integration Type | Criticality | Documentation |
|---------|---------|------------------|-------------|---------------|
| {{SERVICE}} | {{PURPOSE}} | {{SDK/REST/WEBHOOK}} | {{CRITICAL/IMPORTANT/OPTIONAL}} | {{DOCS_LINK}} |

### 6.2 Integration Details

#### Integration: {{SERVICE_NAME}}

**Purpose:** {{WHAT_IT_DOES}}

**Integration Pattern:** {{SDK | REST_API | WEBHOOK | OAUTH}}

**Configuration:**
```typescript
// Required environment variables
{{ENV_VAR_1}}={{DESCRIPTION}}
{{ENV_VAR_2}}={{DESCRIPTION}}
```

**Implementation Location:** `{{FILE_PATH}}`

**Error Handling:**
- {{ERROR_SCENARIO_1}}: {{HANDLING}}
- {{ERROR_SCENARIO_2}}: {{HANDLING}}

**Testing Strategy:** {{HOW_TO_TEST — e.g., mock SDK, sandbox environment}}

---

*{{Repeat for each integration}}*

---

### 6.3 Environment Variable Dependencies

#### Required Variables

| Variable | Service | Required In | Description |
|----------|---------|-------------|-------------|
| `{{VAR_NAME}}` | {{SERVICE}} | {{ENVS}} | {{DESCRIPTION}} |

#### Environment Variable Template
```bash
# {{CATEGORY}}
{{VAR_NAME}}={{EXAMPLE_OR_PLACEHOLDER}}
```

---

## 7. Code Patterns & Conventions

### 7.1 Architectural Patterns

| Pattern | Where Used | Implementation |
|---------|------------|----------------|
| {{PATTERN — e.g., Repository Pattern}} | {{WHERE}} | {{HOW}} |
| {{PATTERN — e.g., Service Layer}} | {{WHERE}} | {{HOW}} |
| {{PATTERN — e.g., Factory Pattern}} | {{WHERE}} | {{HOW}} |

### 7.2 Code Style Guidelines

**Language Style Guide:** {{STYLE_GUIDE — e.g., Airbnb, Standard, Custom}}

**Key Conventions:**
- {{CONVENTION_1}}
- {{CONVENTION_2}}
- {{CONVENTION_3}}

### 7.3 Error Handling Patterns

**Frontend:**
```typescript
{{ERROR_HANDLING_PATTERN}}
```

**Backend:**
```typescript
{{ERROR_HANDLING_PATTERN}}
```

### 7.4 State Management Patterns

**Global State:**
- Tool: {{TOOL}}
- Pattern: {{PATTERN}}
- Location: `{{PATH}}`

**Server State:**
- Tool: {{TOOL}}
- Pattern: {{PATTERN}}
- Caching Strategy: {{STRATEGY}}

**Form State:**
- Tool: {{TOOL}}
- Validation: {{APPROACH}}

### 7.5 Component Patterns

**Component Structure:**
```typescript
{{COMPONENT_TEMPLATE}}
```

**Props Interface Naming:** `{{CONVENTION}}`

**Component Composition:** {{APPROACH}}

---

## 8. Security Architecture

### 8.1 Security Layers

```
{{SECURITY_LAYER_DIAGRAM}}

Example:
┌─────────────────────────────────────────┐
│           Edge Security                  │
│  (WAF, DDoS Protection, Bot Detection)  │
├─────────────────────────────────────────┤
│         Transport Security               │
│      (TLS 1.3, Certificate Pinning)     │
├─────────────────────────────────────────┤
│        Application Security              │
│  (Auth, CORS, Rate Limiting, Validation)│
├─────────────────────────────────────────┤
│          Data Security                   │
│   (Encryption, Access Control, Audit)   │
└─────────────────────────────────────────┘
```

### 8.2 Security Measures

| Threat | Mitigation | Implementation |
|--------|------------|----------------|
| SQL Injection | {{MITIGATION}} | {{IMPLEMENTATION}} |
| XSS | {{MITIGATION}} | {{IMPLEMENTATION}} |
| CSRF | {{MITIGATION}} | {{IMPLEMENTATION}} |
| Broken Auth | {{MITIGATION}} | {{IMPLEMENTATION}} |
| Data Exposure | {{MITIGATION}} | {{IMPLEMENTATION}} |
| Rate Limiting Bypass | {{MITIGATION}} | {{IMPLEMENTATION}} |

### 8.3 Sensitive Data Handling

| Data Type | Classification | Storage | Encryption | Retention |
|-----------|---------------|---------|------------|-----------|
| {{DATA}} | {{PII/SENSITIVE/PUBLIC}} | {{WHERE}} | {{METHOD}} | {{POLICY}} |

### 8.4 Secret Management

**Tool:** {{SECRET_MANAGER}}
**Rotation Policy:** {{POLICY}}
**Access Control:** {{WHO_CAN_ACCESS}}

---

## 9. Testing Architecture

### 9.1 Testing Pyramid

```
        ┌─────────┐
        │  E2E    │  ← {{COUNT}} tests
        ├─────────┤
        │ Integr. │  ← {{COUNT}} tests
        ├─────────┤
        │  Unit   │  ← {{COUNT}} tests
        └─────────┘
```

### 9.2 Testing Strategy by Layer

| Layer | Test Type | Tools | Coverage Target |
|-------|-----------|-------|-----------------|
| Frontend Components | {{TYPE}} | {{TOOLS}} | {{TARGET}}% |
| Frontend Hooks | {{TYPE}} | {{TOOLS}} | {{TARGET}}% |
| API Endpoints | {{TYPE}} | {{TOOLS}} | {{TARGET}}% |
| Services | {{TYPE}} | {{TOOLS}} | {{TARGET}}% |
| Database | {{TYPE}} | {{TOOLS}} | {{TARGET}}% |
| E2E Flows | {{TYPE}} | {{TOOLS}} | {{CRITICAL_PATHS}} |

### 9.3 Test File Organization

```
tests/
├── unit/
│   └── {{STRUCTURE}}
├── integration/
│   └── {{STRUCTURE}}
├── e2e/
│   └── {{STRUCTURE}}
├── fixtures/
│   └── {{STRUCTURE}}
└── helpers/
    └── {{STRUCTURE}}
```

### 9.4 Test Data Strategy

**Approach:** {{FACTORIES | FIXTURES | MOCKS | COMBINATION}}
**Database:** {{STRATEGY — e.g., "Test database reset between suites"}}
**External Services:** {{STRATEGY — e.g., "MSW for API mocking"}}

---

## 10. Deployment Architecture

### 10.1 Environments

| Environment | Purpose | URL | Branch | Data |
|-------------|---------|-----|--------|------|
| Local | {{PURPOSE}} | `{{URL}}` | — | {{DATA_SOURCE}} |
| Development | {{PURPOSE}} | `{{URL}}` | `{{BRANCH}}` | {{DATA_SOURCE}} |
| Staging | {{PURPOSE}} | `{{URL}}` | `{{BRANCH}}` | {{DATA_SOURCE}} |
| Production | {{PURPOSE}} | `{{URL}}` | `{{BRANCH}}` | Live |

### 10.2 CI/CD Pipeline

```
{{PIPELINE_DIAGRAM}}

Example:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Push    │───▶│  Build   │───▶│  Test    │───▶│  Deploy  │
│          │    │  & Lint  │    │  Suite   │    │  Preview │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Prod    │◀───│  Manual  │◀───│  Staging │◀───│  Merge   │
│  Deploy  │    │  Approve │    │  Deploy  │    │  to Main │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 10.3 Deployment Strategy

**Method:** {{BLUE_GREEN | CANARY | ROLLING | RECREATE}}

**Rollback Process:**
1. {{STEP_1}}
2. {{STEP_2}}
3. {{STEP_3}}

**Feature Flags:**
- Tool: {{TOOL}}
- Strategy: {{STRATEGY}}

### 10.4 Infrastructure as Code

**Tool:** {{TERRAFORM | PULUMI | CDK | CLOUDFORMATION | NONE}}
**Location:** `{{PATH}}`

---

## 11. Performance Considerations

### 11.1 Frontend Performance

| Metric | Target | Optimization Strategy |
|--------|--------|----------------------|
| LCP | {{TARGET}} | {{STRATEGY}} |
| FID/INP | {{TARGET}} | {{STRATEGY}} |
| CLS | {{TARGET}} | {{STRATEGY}} |
| Bundle Size | {{TARGET}} | {{STRATEGY}} |
| TTI | {{TARGET}} | {{STRATEGY}} |

### 11.2 Backend Performance

| Metric | Target | Optimization Strategy |
|--------|--------|----------------------|
| API Response (p50) | {{TARGET}} | {{STRATEGY}} |
| API Response (p99) | {{TARGET}} | {{STRATEGY}} |
| Database Query | {{TARGET}} | {{STRATEGY}} |
| Memory Usage | {{TARGET}} | {{STRATEGY}} |

### 11.3 Caching Strategy

| Layer | Cache Type | TTL | Invalidation |
|-------|------------|-----|--------------|
| CDN | {{TYPE}} | {{TTL}} | {{STRATEGY}} |
| API | {{TYPE}} | {{TTL}} | {{STRATEGY}} |
| Database | {{TYPE}} | {{TTL}} | {{STRATEGY}} |
| Client | {{TYPE}} | {{TTL}} | {{STRATEGY}} |

---

## 12. Scalability Architecture

### 12.1 Current Capacity

| Dimension | Current | Headroom |
|-----------|---------|----------|
| Concurrent Users | {{NUMBER}} | {{PERCENTAGE}}% |
| Requests/Second | {{NUMBER}} | {{PERCENTAGE}}% |
| Database Connections | {{NUMBER}} | {{PERCENTAGE}}% |
| Storage | {{SIZE}} | {{PERCENTAGE}}% |

### 12.2 Scaling Strategy

| Component | Scaling Type | Trigger | Max Scale |
|-----------|--------------|---------|-----------|
| {{COMPONENT}} | {{HORIZONTAL/VERTICAL}} | {{TRIGGER}} | {{MAX}} |

### 12.3 Bottleneck Identification

| Potential Bottleneck | Mitigation | Priority |
|---------------------|------------|----------|
| {{BOTTLENECK}} | {{MITIGATION}} | {{P0/P1/P2}} |

---

## 13. Disaster Recovery

### 13.1 Backup Strategy

| Data Type | Frequency | Retention | Storage | Recovery Time |
|-----------|-----------|-----------|---------|---------------|
| {{DATA}} | {{FREQUENCY}} | {{RETENTION}} | {{LOCATION}} | {{RTO}} |

### 13.2 Recovery Procedures

**Database Recovery:**
```bash
{{RECOVERY_COMMANDS}}
```

**Application Recovery:**
1. {{STEP_1}}
2. {{STEP_2}}
3. {{STEP_3}}

### 13.3 Incident Response

**Runbook Location:** `{{PATH}}`

**Escalation Path:**
1. {{LEVEL_1}}
2. {{LEVEL_2}}
3. {{LEVEL_3}}

---

## 14. AI/LLM Integration Guidelines

> This section provides context for AI coding assistants (like Claude) working on this codebase.

### 14.1 Code Generation Preferences

**Preferred Patterns:**
- {{PATTERN_1}}
- {{PATTERN_2}}
- {{PATTERN_3}}

**Avoid:**
- {{ANTI_PATTERN_1}}
- {{ANTI_PATTERN_2}}
- {{ANTI_PATTERN_3}}

### 14.2 File Organization Rules

- New components go in: `{{PATH}}`
- New API routes go in: `{{PATH}}`
- New types go in: `{{PATH}}`
- Tests co-located: {{YES/NO}}
- Test location: `{{PATH}}`

### 14.3 Import Conventions

**Path Aliases:**
```typescript
{{ALIAS_CONFIGURATION}}
```

**Import Order:**
1. {{ORDER_1 — e.g., "External packages"}}
2. {{ORDER_2 — e.g., "Internal packages"}}
3. {{ORDER_3 — e.g., "Relative imports"}}

### 14.4 Common Tasks Reference

| Task | Files to Modify | Pattern to Follow |
|------|-----------------|-------------------|
| Add new API endpoint | {{FILES}} | {{PATTERN_REF}} |
| Add new component | {{FILES}} | {{PATTERN_REF}} |
| Add new database table | {{FILES}} | {{PATTERN_REF}} |
| Add new page/route | {{FILES}} | {{PATTERN_REF}} |
| Add new service | {{FILES}} | {{PATTERN_REF}} |

### 14.5 Testing Requirements

- Unit tests required for: {{WHAT}}
- Integration tests required for: {{WHAT}}
- Test file naming: `{{PATTERN}}`
- Minimum coverage: {{PERCENTAGE}}%

---

## Appendix A: Decision Log Reference

For architecture decisions and their rationale, see `decision_log.md`.

Key decisions affecting this architecture:
- {{DECISION_1_REFERENCE}}
- {{DECISION_2_REFERENCE}}
- {{DECISION_3_REFERENCE}}

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| {{TERM}} | {{DEFINITION}} |

---

## Appendix C: Related Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| Product Spec | What we're building | `product_spec.md` |
| Decision Log | Why we chose things | `decision_log.md` |
| Changelog | What changed | `changelog.md` |
| API Docs | API reference | `{{LOCATION}}` |
| Runbooks | Operational guides | `{{LOCATION}}` |

