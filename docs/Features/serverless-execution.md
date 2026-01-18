# Feature: Serverless/Async Execution

> **Status**: ✅ Complete  
> **Started**: 2026-01-17  
> **Completed**: 2026-01-17  
> **Milestone**: V1  
> **Feature Doc Version**: 1.0

---

## Overview

Serverless Execution enables running Claude Code agents in the cloud, eliminating the requirement for the user's laptop to be awake. Users can send prompts from their phone and have them executed asynchronously on cloud compute, receiving notifications when tasks complete.

**One-Line Summary:** Run Claude Code agents on cloud infrastructure (Modal) and access the app from anywhere (Vercel), eliminating all laptop dependencies.

## User Story

> As a developer who uses GoGoGadgetClaude on my phone, I want to access the app and send prompts that execute in the cloud, so I can kick off coding tasks from anywhere without my laptop being on or accessible.

## Problem Statement

The current architecture (ADR-001) requires the user's laptop to be:
1. **Powered on and awake** — macOS sleep kills the server
2. **Connected to Tailscale** — Network access required
3. **Running the GoGoGadgetClaude server** — Must be started manually or via LaunchAgent

This creates friction for common scenarios:
- Starting a coding task while away from home (laptop at office, user at cafe)
- Queuing up tasks overnight without keeping laptop awake
- Working on battery power (laptop closed to save energy)
- Scheduled prompts failing because laptop is asleep

**Current Workaround:** Users must configure "Prevent Sleep" on their Mac, which wastes energy and isn't always practical.

## Business Value

- **User Impact:** True "fire and forget" — send prompt from phone, close app, receive notification when done. No laptop babysitting.
- **Business Impact:** Removes the #1 limitation of the current architecture. Makes the product viable for users who can't keep laptops running 24/7.
- **Technical Impact:** Lays foundation for:
  - Multi-machine workflows (laptop for dev, cloud for background tasks)
  - Enterprise deployments (centralized compute, distributed access)
  - Scheduled prompts that run reliably (no laptop dependency)

---

## Requirements

### Functional Requirements

| ID    | Requirement                                                 | Priority | Notes                                    |
|-------|-------------------------------------------------------------|----------|------------------------------------------|
| FR-1  | User can enable/disable serverless mode in settings         | MUST     | Toggle between local and cloud execution |
| FR-2  | Send prompt to cloud when serverless mode enabled           | MUST     | Falls back to local if cloud unavailable |
| FR-3  | Cloud executes Claude Code with provided prompt             | MUST     | Full Claude CLI capabilities             |
| FR-4  | Cloud stores conversation output (JSONL)                    | MUST     | Must be retrievable from mobile UI       |
| FR-5  | Notification sent when cloud task completes                 | MUST     | Uses existing notification channels      |
| FR-6  | User can view cloud-executed conversations                  | MUST     | Seamless with local conversations        |
| FR-7  | Cloud execution supports file context (git repos)           | MUST     | Must access user's codebase              |
| FR-8  | Secure credential management for Claude API key             | MUST     | API key never exposed to client          |
| FR-9  | User can configure Modal API key in settings                | MUST     | Required for cloud execution             |
| FR-10 | **App hosted on Vercel (cloud-accessible)**                 | MUST     | Access UI without laptop being online    |
| FR-11 | **Auto-detect laptop availability and switch API endpoint** | MUST     | Seamless local/cloud fallback            |
| FR-12 | Show execution mode indicator (local vs cloud)              | SHOULD   | User knows where prompt will run         |
| FR-13 | Display estimated cloud cost before execution               | SHOULD   | Transparency on pay-per-use costs        |
| FR-14 | Support canceling cloud-running tasks                       | SHOULD   | Via Modal job cancellation               |

### Non-Functional Requirements

| Requirement | Target                                             | Measurement         |
|-------------|----------------------------------------------------|---------------------|
| Latency     | Cloud task starts within 30s of prompt submission  | Manual testing      |
| Reliability | 99% of submitted tasks execute successfully        | Modal logs          |
| Cost        | < $0.10 per typical 5-minute task execution        | Modal billing       |
| Security    | API keys encrypted at rest, never exposed in logs  | Security review     |
| Portability | Conversation data portable between local and cloud | JSONL compatibility |

### Acceptance Criteria

- [ ] **Given** my laptop is offline, **when** I visit the Vercel-hosted app URL, **then** the app loads and is fully functional
- [ ] **Given** my laptop comes online while using the app, **when** the app detects it, **then** it switches to local API within 30 seconds
- [ ] **Given** serverless mode is enabled and configured, **when** I send a prompt from my phone, **then** it executes on Modal even if my laptop is offline
- [ ] **Given** a cloud task is running, **when** it completes, **then** I receive a notification via my configured channels (ntfy/iMessage)
- [ ] **Given** a cloud task has completed, **when** I open the app, **then** I can view the full conversation history
- [ ] **Given** serverless mode is enabled but Modal API key is invalid, **when** I send a prompt, **then** I receive a clear error message
- [ ] **Given** I have both local and cloud conversations, **when** viewing the session list, **then** both types are displayed with appropriate indicators

### Out of Scope

- Multi-cloud provider support (Modal only for V1)
- Real-time streaming of cloud execution (completion notification only)
- Persistent cloud infrastructure (use ephemeral containers)
- Shared/team cloud execution pools
- Cost budgets or spending limits
- Cloud-based file editing (must sync back to local repo)

---

## User Experience

### User Flow

```
Settings: Enable Serverless → Configure Modal Key → Save
     ↓
Send Prompt → Cloud Dispatched → Notification Received → View Results
     ↓                                    ↓
(If Modal unavailable)              (If task fails)
     ↓                                    ↓
Fallback to Local               Error notification sent
```

**Happy Path:**

1. User enables "Serverless Execution" in Settings
2. User enters their Modal API token (one-time)
3. User selects a project and sends a prompt
4. Prompt is dispatched to Modal cloud function
5. Modal spins up container with Claude CLI
6. Claude executes the task on cloned/mounted repo
7. Conversation JSONL saved to cloud storage
8. Notification sent via configured channels
9. User opens app, sees conversation in session list
10. User reviews results, sends follow-up (repeat)

**Alternate Paths:**

- **Modal unavailable:** Show error toast, offer "Send to local instead" if laptop reachable
- **API key invalid:** Show clear error, prompt to reconfigure in settings
- **Task times out:** Send failure notification, show partial results if available
- **Git clone fails:** Send error notification with details

### Settings UI

```
┌──────────────────────────────────────────────────────────────────┐
│  SERVERLESS EXECUTION                                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Enable Serverless                                 [toggle] │ │
│  │  Run prompts in the cloud when laptop is offline            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Modal API Token                     [••••••••••••••••]     │ │
│  │  Get your token at modal.com/settings                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Claude API Key (for cloud)          [••••••••••••••••]     │ │
│  │  Your Anthropic API key for cloud execution                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Git Repository URL                                          │ │
│  │  [https://github.com/user/repo.git                        ] │ │
│  │  Cloud will clone this repo for execution                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  [ Test Cloud Connection ]                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Estimated cost: ~$0.02/min of compute                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Vercel (Always Available)                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  React SPA (Static Build)                                                   ││
│  │  - Hosted at gogogadgetclaude.vercel.app                                    ││
│  │  - Works even when laptop is offline                                        ││
│  │  - Auto-detects laptop availability                                         ││
│  └─────────────────────┬───────────────────────────────────────────────────────┘│
└─────────────────────────┼───────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────────┐    ┌──────────────────────────────────────────────────┐
│  Laptop (if reachable)  │    │                    Modal Cloud                    │
│                         │    │                                                   │
│  ┌───────────────────┐  │    │  ┌─────────────────────────────────────────────┐  │
│  │  Local Express    │  │    │  │  Cloud API (Modal Web Endpoint)             │  │
│  │  Server :3456     │  │    │  │  - Receives prompts from Vercel-hosted app  │  │
│  │                   │  │    │  │  - Dispatches to Modal Functions            │  │
│  │  - Full API       │  │    │  │  - Returns job status, sessions, messages   │  │
│  │  - Local JSONL    │  │    │  └─────────────────────┬───────────────────────┘  │
│  │  - Git access     │  │    │                        │                          │
│  └───────────────────┘  │    │                        ▼                          │
│                         │    │  ┌─────────────────────────────────────────────┐  │
│  Tailscale reachable?   │    │  │  Claude Execution Container (Ephemeral)     │  │
│  ↓ Yes → Use local      │    │  │  - Claude CLI installed                     │  │
│  ↓ No  → Use Modal      │    │  │  - Uses persistent repo from Volume         │  │
└─────────────────────────┘    │  │  - Runs claude -p "<prompt>"                │  │
                               │  │  - Commits locally (push is explicit)       │  │
                               │  └─────────────────────────────────────────────┘  │
                               │                        │                          │
                               │                        ▼                          │
                               │  ┌─────────────────────────────────────────────┐  │
                               │  │  Modal Volumes (Persistent Storage)          │  │
                               │  │  - gogogadget-sessions: JSONL session data   │  │
                               │  │  - gogogadget-repos: Git repositories        │  │
                               │  └─────────────────────────────────────────────┘  │
                               └───────────────────────────────────────────────────┘
                                                        │
                                                        │ Webhook
                                                        ▼
                               ┌──────────────────────────────────────────────────┐
                               │  Notification System (ntfy.sh / iMessage)        │
                               └──────────────────────────────────────────────────┘
```

### Key Architecture Components

| Component       | Hosted On             | Purpose                                   | Always Available?  |
|-----------------|-----------------------|-------------------------------------------|--------------------|
| React SPA       | Vercel                | User interface                            | ✅ Yes              |
| Local API       | Laptop                | Fast local execution, local conversations | When laptop online |
| Cloud API       | Modal                 | Cloud execution, cloud conversations      | ✅ Yes              |
| Sessions Volume | Modal Volume          | JSONL conversation persistence            | ✅ Yes              |
| Repos Volume    | Modal Volume          | Persistent git repos (no re-clone!)       | ✅ Yes              |
| Notifications   | ntfy.sh               | Completion alerts                         | ✅ Yes              |

### Platform Choice: Modal

**Why Modal over Fly.io/Railway:**

| Criteria           | Modal                | Fly.io             | Railway          |
|--------------------|----------------------|--------------------|------------------|
| AI/CLI workloads   | ✅ Built for this     | ⚠️ Web-focused     | ⚠️ Web-focused   |
| Pay-per-second     | ✅ Yes, no idle costs | ⚠️ Minimum charges | ⚠️ Monthly fees  |
| Volume mounts      | ✅ Native support     | ✅ Yes              | ⚠️ Limited       |
| Python-first       | ✅ Great DX           | ❌ Container-only   | ❌ Container-only |
| Cold start         | ✅ ~5s                | ⚠️ 10-20s          | ⚠️ 10-30s        |
| Secrets management | ✅ Built-in           | ✅ Yes              | ✅ Yes            |
| Cost (5min task)   | ~$0.05               | ~$0.10             | ~$0.15           |

**Modal Implementation Approach:**

1. **Modal App** (`modal_app.py`): Defines cloud functions and volumes
2. **Container Image**: Debian with Claude CLI, git, Node.js
3. **Entrypoint**: Python function that receives prompt, runs Claude, saves output
4. **Two Volumes**:
   - `gogogadget-sessions`: Persistent storage for `~/.claude/` session data
   - `gogogadget-repos`: Persistent storage for cloned git repos (mounted at `/repos`)

**Repo Persistence (as of v0.24.0):**
- First prompt for a project: Clones repo to `/repos/{projectName}` on volume
- Subsequent prompts: Reuses existing repo (fast!)
- Changes committed locally but NOT auto-pushed
- User explicitly pushes via `/api/cloud/push` endpoint

### Data Flow

#### Prompt Submission (Cloud Mode)

```
1. User sends prompt from React app
2. Client checks settings: serverless enabled?
   - Yes: POST to Modal cloud service
   - No: POST to local server (existing flow)
3. Modal service receives prompt + project context
4. Modal spawns execution container
5. Container clones git repo (shallow clone)
6. Container runs: claude -p "<prompt>" --allowedTools "..."
7. Claude writes to ~/.claude/ on mounted volume
8. Container exits, triggers completion webhook
9. Webhook calls notification service (ntfy/other)
10. User polls /api/cloud/sessions/:id/messages for results
```

#### Conversation Retrieval (Cloud Mode)

```
1. User opens app, requests sessions list
2. Client fetches from Modal volume API (if serverless enabled)
3. Modal returns session list from persistent volume
4. User selects session, fetches messages
5. Messages returned from JSONL files on volume
```

### New Files to Create

| File                                                    | Purpose                              | Est. Lines |
|---------------------------------------------------------|--------------------------------------|------------|
| `server/src/services/serverless/types.ts`               | TypeScript types for serverless      | ~60        |
| `server/src/services/serverless/modalClient.ts`         | Modal API client                     | ~120       |
| `server/src/services/serverless/cloudSessionManager.ts` | Manage cloud sessions                | ~150       |
| `server/src/api/cloud.ts`                               | Cloud API endpoints                  | ~100       |
| `modal/modal_app.py`                                    | Modal app definition + web endpoints | ~250       |
| `modal/Dockerfile`                                      | Claude execution container image     | ~40        |
| `modal/entrypoint.py`                                   | Container execution script           | ~100       |
| `client/src/hooks/useCloudSessions.ts`                  | Hook for cloud session data          | ~80        |
| `client/src/hooks/useApiEndpoint.ts`                    | **Detect laptop, switch API base**   | ~60        |
| `client/src/components/settings/ServerlessSettings.tsx` | Settings UI section                  | ~120       |
| `vercel.json`                                           | **Vercel deployment config**         | ~20        |
| `client/.env.production`                                | **Production env vars for Vercel**   | ~10        |

### Files to Modify

| File                                               | Changes                            | Est. Impact |
|----------------------------------------------------|------------------------------------|-------------|
| `shared/types/index.ts`                            | Add serverless settings types      | ~30 lines   |
| `server/src/services/settingsService.ts`           | Add serverless settings fields     | ~20 lines   |
| `server/src/index.ts`                              | Mount cloud API routes             | ~5 lines    |
| `client/src/lib/api.ts`                            | **Dynamic API base URL switching** | ~40 lines   |
| `client/src/components/settings/SettingsModal.tsx` | Add serverless section             | ~40 lines   |
| `client/src/hooks/useSendPrompt.ts`                | Add cloud dispatch path            | ~30 lines   |
| `client/src/hooks/useSessions.ts`                  | Merge local + cloud sessions       | ~40 lines   |
| `client/src/components/session/SessionList.tsx`    | Show cloud indicator               | ~15 lines   |
| `client/vite.config.ts`                            | **Add env var support for Vercel** | ~10 lines   |

### Vercel Hosting & API Endpoint Switching

The React app is deployed to Vercel as a static build, accessible at `gogogadgetclaude.vercel.app` (or custom domain). This ensures the UI is always available regardless of laptop status.

**API Endpoint Detection Logic:**

```typescript
// client/src/hooks/useApiEndpoint.ts

interface ApiEndpointState {
  baseUrl: string;
  mode: 'local' | 'cloud';
  isChecking: boolean;
}

export function useApiEndpoint(): ApiEndpointState {
  const [state, setState] = useState<ApiEndpointState>({
    baseUrl: import.meta.env.VITE_MODAL_API_URL,  // Default to cloud
    mode: 'cloud',
    isChecking: true,
  });

  useEffect(() => {
    // Try to reach laptop via Tailscale
    const checkLaptop = async () => {
      const laptopUrl = localStorage.getItem('laptopUrl');  // e.g., "http://macbook.tail1234.ts.net:3456"
      
      if (!laptopUrl) {
        setState({ baseUrl: import.meta.env.VITE_MODAL_API_URL, mode: 'cloud', isChecking: false });
        return;
      }

      try {
        const res = await fetch(`${laptopUrl}/api/status`, { 
          signal: AbortSignal.timeout(3000)  // 3s timeout
        });
        if (res.ok) {
          setState({ baseUrl: laptopUrl, mode: 'local', isChecking: false });
          return;
        }
      } catch {
        // Laptop not reachable, use cloud
      }
      
      setState({ baseUrl: import.meta.env.VITE_MODAL_API_URL, mode: 'cloud', isChecking: false });
    };

    checkLaptop();
    // Re-check every 30 seconds
    const interval = setInterval(checkLaptop, 30000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
```

**Environment Configuration:**

```bash
# client/.env.production (deployed to Vercel)
VITE_MODAL_API_URL=https://gogogadget--api.modal.run
VITE_DEFAULT_MODE=cloud

# client/.env.development (local development)
VITE_MODAL_API_URL=http://localhost:3456
VITE_DEFAULT_MODE=local
```

**Vercel Configuration:**

```json
// vercel.json
{
  "buildCommand": "cd client && pnpm build",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Deployment Flow:**
1. Push to main branch
2. Vercel auto-deploys client build
3. Modal CLI deploys cloud functions separately (`modal deploy modal/modal_app.py`)

---

### Modal App Definition (Python)

```python
# modal/modal_app.py

import modal
import subprocess
import os
import json
from pathlib import Path

# Create Modal app and volume
app = modal.App("gogogadget-claude")
volume = modal.Volume.from_name("claude-sessions", create_if_missing=True)

# Custom image with Claude CLI
image = modal.Image.debian_slim(python_version="3.11").run_commands(
    "apt-get update && apt-get install -y git curl",
    "curl -fsSL https://claude.ai/install.sh | sh",  # Install Claude CLI
)

@app.function(
    image=image,
    volumes={"/root/.claude": volume},
    secrets=[modal.Secret.from_name("claude-api-key")],
    timeout=1800,  # 30 minute max
)
def execute_prompt(
    prompt: str,
    project_repo: str,
    project_name: str,
    allowed_tools: list[str],
    notification_webhook: str | None = None,
):
    """Execute a Claude prompt in the cloud."""
    
    # Clone the repository
    work_dir = f"/tmp/{project_name}"
    subprocess.run(
        ["git", "clone", "--depth=1", project_repo, work_dir],
        check=True
    )
    os.chdir(work_dir)
    
    # Build Claude command
    tools_arg = ",".join(allowed_tools) if allowed_tools else "Task,Bash,Read,Write"
    cmd = [
        "claude",
        "-p", prompt,
        "--allowedTools", tools_arg,
        "--yes",  # Non-interactive mode
    ]
    
    # Execute Claude
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Commit volume changes
    volume.commit()
    
    # Send completion notification
    if notification_webhook:
        import urllib.request
        data = json.dumps({
            "type": "task-complete",
            "projectName": project_name,
            "success": result.returncode == 0,
        }).encode()
        req = urllib.request.Request(
            notification_webhook,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=10)
    
    return {
        "success": result.returncode == 0,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }

@app.function(
    volumes={"/root/.claude": volume},
)
def get_sessions(project_path: str) -> list[dict]:
    """List sessions for a project from the volume."""
    # Parse JSONL files and return session metadata
    sessions_dir = Path(f"/root/.claude/projects/{project_path}")
    sessions = []
    
    if sessions_dir.exists():
        for jsonl_file in sessions_dir.glob("*.jsonl"):
            # Parse first/last lines for metadata
            # (similar to local jsonlParser logic)
            sessions.append({
                "id": jsonl_file.stem,
                "projectPath": project_path,
                # ... more metadata
            })
    
    return sessions

@app.function(
    volumes={"/root/.claude": volume},
)
def get_messages(session_id: str, project_path: str) -> list[dict]:
    """Get messages for a session from the volume."""
    jsonl_path = Path(f"/root/.claude/projects/{project_path}/{session_id}.jsonl")
    messages = []
    
    if jsonl_path.exists():
        with open(jsonl_path) as f:
            for line in f:
                messages.append(json.loads(line))
    
    return messages
```

### Settings Schema Update

```typescript
// Add to shared/types/index.ts

export interface ServerlessSettings {
  enabled: boolean;
  modalToken?: string;        // Modal API token (encrypted)
  claudeApiKey?: string;      // Claude API key for cloud (encrypted)
  defaultRepoUrl?: string;    // Default git repo URL
  notificationWebhook?: string; // Webhook URL for completion notifications
}

// Update AppSettings
export interface AppSettings {
  // ... existing fields ...
  serverless?: ServerlessSettings;
}
```

### Security Considerations

1. **API Key Storage:**
   - Modal token stored encrypted in `settings.json`
   - Claude API key stored in Modal Secrets (never in our code)
   - Keys never logged or exposed to client

2. **Git Repository Access:**
   - Support HTTPS URLs with personal access tokens
   - SSH keys stored in Modal Secrets
   - Private repos require explicit token configuration

3. **Execution Isolation:**
   - Each task runs in ephemeral container
   - No persistent access to container filesystem (except volume)
   - Containers destroyed after execution

4. **Rate Limiting:**
   - Modal has built-in rate limiting
   - Add application-level limits (max concurrent tasks, daily cost cap)

---

## Implementation Tasks

### Phase 1: Modal Cloud Compute (Tasks 1-7)

| # | Task                                         | Est. Time | Dependencies | Status | Notes                                              |
|---|----------------------------------------------|-----------|--------------|--------|----------------------------------------------------|
| 1 | Create serverless types and interfaces       | 30 min    | —            | ✅ Done | Types for settings, job status, cloud sessions     |
| 2 | Create Modal app definition (`modal_app.py`) | 60 min    | —            | ✅ Done | Python app with execute_prompt + web endpoints     |
| 3 | Create Dockerfile for Claude execution       | 30 min    | Task 2       | ✅ Done | Image with Claude CLI, git, dependencies           |
| 4 | Create Modal client service                  | 45 min    | Task 1       | ✅ Done | `modalClient.ts` - dispatch jobs, get status       |
| 5 | Create cloud session manager                 | 45 min    | Task 4       | ✅ Done | `cloudSessionManager.ts` - list/get cloud sessions |
| 6 | Create cloud API routes                      | 40 min    | Task 5       | ✅ Done | `/api/cloud/*` endpoints                           |
| 7 | Update settings schema and service           | 30 min    | Task 1       | ✅ Done | Add serverless fields, encryption for tokens       |

### Phase 2: Vercel Hosting & API Switching (Tasks 8-11)

| #  | Task                                    | Est. Time | Dependencies | Status | Notes                                         |
|----|-----------------------------------------|-----------|--------------|--------|-----------------------------------------------|
| 8  | **Deploy React app to Vercel**          | 30 min    | —            | ✅ Done | vercel.json, env vars, initial deployment     |
| 9  | **Create useApiEndpoint hook**          | 45 min    | Task 8       | ✅ Done | Detect laptop, switch between local/cloud API |
| 10 | **Update api.ts for dynamic base URL**  | 30 min    | Task 9       | ✅ Done | All API calls use dynamic endpoint            |
| 11 | **Add connection mode indicator to UI** | 20 min    | Task 10      | ✅ Done | Show "Local" or "Cloud" badge in header       |

### Phase 3: UI Integration (Tasks 12-16)

| #  | Task                                           | Est. Time | Dependencies | Status | Notes                                      |
|----|------------------------------------------------|-----------|--------------|--------|--------------------------------------------|
| 12 | Create ServerlessSettings UI component         | 50 min    | Task 7       | ✅ Done | Settings section with toggle, token inputs |
| 13 | Update useSendPrompt to support cloud dispatch | 40 min    | Task 6, 10   | ✅ Done | Route to cloud when serverless enabled     |
| 14 | Update useSessions to merge cloud sessions     | 40 min    | Task 5, 6    | ✅ Done | Combine local + cloud session lists        |
| 15 | Add cloud indicator to session/conversation UI | 30 min    | Task 14      | ✅ Done | Visual badge for cloud-executed sessions   |
| 16 | Integrate with notification system             | 30 min    | Task 2       | ✅ Done | Webhook callback on task completion        |

**Total Estimated Time**: ~9.5 hours  
**Recommended Split**: 3 sessions (one per phase)

---

## Test Plan

### Unit Tests

**serverless/types.ts** (type guards):
- Validate ServerlessSettings shape
- Validate CloudJobStatus types

**useApiEndpoint.ts** (8 tests):
- Returns cloud mode when no laptop URL configured
- Returns cloud mode when laptop unreachable (timeout)
- Returns local mode when laptop reachable
- Switches from cloud to local when laptop becomes available
- Switches from local to cloud when laptop becomes unavailable
- Re-checks laptop availability every 30 seconds
- Handles network errors gracefully
- Respects AbortSignal timeout

**modalClient.ts** (12 tests):
- dispatchJob sends correct payload to Modal
- dispatchJob handles network errors gracefully
- getJobStatus returns correct status enum
- getJobStatus handles unknown job IDs
- cancelJob sends cancellation request
- isConfigured returns false without Modal token
- isConfigured returns true with valid config
- validateConfig detects missing Claude API key
- validateConfig detects invalid repo URL
- testConnection succeeds with valid token
- testConnection returns helpful error on failure
- getEstimatedCost returns reasonable estimate

**cloudSessionManager.ts** (8 tests):
- getCloudSessions returns empty array when no sessions
- getCloudSessions parses volume data correctly
- getCloudMessages returns messages in order
- getCloudMessages handles missing session
- mergeWithLocalSessions combines both sources
- mergeWithLocalSessions deduplicates by ID
- session source (local/cloud) is correctly tagged
- handles Modal API errors gracefully

### Integration Tests

- POST `/api/cloud/dispatch` validates request body
- POST `/api/cloud/dispatch` rejects without Modal config
- GET `/api/cloud/jobs/:id/status` returns job status
- DELETE `/api/cloud/jobs/:id` cancels running job
- GET `/api/cloud/sessions` returns cloud session list
- GET `/api/cloud/sessions/:id/messages` returns messages
- Settings update persists serverless config
- Webhook endpoint receives completion callback

### Manual Testing Checklist

**Vercel & API Switching:**
- [ ] Access app via Vercel URL (gogogadgetclaude.vercel.app)
- [ ] With laptop online: app auto-detects and shows "Local" mode
- [ ] With laptop offline: app auto-detects and shows "Cloud" mode
- [ ] Switching from local to cloud (disconnect Tailscale) updates mode within 30s
- [ ] Settings persist correctly when accessed from Vercel

**Cloud Execution:**
- [ ] Enable serverless in settings, configure Modal token
- [ ] Send prompt with serverless enabled, laptop online (hybrid test)
- [ ] Send prompt with serverless enabled, laptop offline (true cloud test)
- [ ] Receive notification when cloud task completes
- [ ] View cloud-executed conversation in app
- [ ] Send follow-up prompt to cloud session
- [ ] Cancel running cloud task

**Error Handling:**
- [ ] Test with private git repository (requires auth)
- [ ] Test error handling: invalid Modal token
- [ ] Test error handling: invalid Claude API key
- [ ] Test error handling: git clone failure
- [ ] Verify no API keys appear in logs
- [ ] App gracefully handles Modal API being down

---

## Dependencies

| Dependency               | Type     | Status      | Notes                                   |
|--------------------------|----------|-------------|-----------------------------------------|
| Notification Abstraction | Feature  | ✅ Complete  | Required for completion notifications   |
| ntfy Channel             | Feature  | In Progress | Cloud notifications work best with ntfy |
| **Vercel Account**       | External | Required    | Free tier sufficient; hosts React app   |
| Modal Account            | External | Required    | User must create Modal account          |
| Claude API Key           | External | Required    | User must have Anthropic API key        |
| Git Repository Access    | External | Required    | HTTPS + token or SSH for private repos  |

---

## Cost Analysis

### Vercel Hosting (Free Tier)

| Resource         | Free Tier Limit  | Our Usage         |
|------------------|------------------|-------------------|
| Bandwidth        | 100 GB/month     | < 1 GB typical    |
| Builds           | 6000 min/month   | < 10 min/month    |
| Serverless Func. | 100 GB-hrs/month | N/A (static only) |

**Vercel Cost: $0/month** (free tier is more than sufficient for personal use)

### Modal Pricing (as of 2026)

| Resource         | Cost             | Typical Usage     |
|------------------|------------------|-------------------|
| CPU (per second) | ~$0.0001/sec     | ~$0.006/min       |
| Memory (per GB)  | ~$0.00005/sec/GB | ~$0.003/min (4GB) |
| Volume storage   | ~$0.40/GB/month  | <$1/month typical |

**Estimated Cost per Task:**
- 5-minute task: ~$0.05
- 30-minute task: ~$0.30
- Monthly light usage (20 tasks): ~$1-2

### Anthropic API (if using BYOK)

If using your own Anthropic API key (not Claude Pro/Max subscription):
- Claude Sonnet: ~$0.003/1K input tokens, ~$0.015/1K output tokens
- Typical task (50K input, 5K output): ~$0.22

### Total Monthly Cost Estimate

| Usage Level       | Vercel | Modal  | Anthropic API | Total       |
|-------------------|--------|--------|---------------|-------------|
| Light (20 tasks)  | $0     | ~$1-2  | ~$4-5         | **~$5-7**   |
| Medium (50 tasks) | $0     | ~$3-5  | ~$10-12       | **~$13-17** |
| Heavy (100 tasks) | $0     | ~$6-10 | ~$20-25       | **~$26-35** |

*Note: If using Claude Max subscription ($100/month), Anthropic API costs may be included.*

### Cost Transparency in UI

Display in settings:
```
Estimated cost: ~$0.01/min of compute + API tokens
Last month: $4.47 (32 tasks, 2.1M tokens)
```

---

## Rollout Plan

### Phase 1: MVP (This Feature)
- Basic cloud execution via Modal
- Single repo per project
- Manual token configuration
- Completion notifications via existing channels

### Phase 2: Enhancements (Future)
- Multi-repo support per project
- GitHub App integration (no manual tokens)
- Real-time execution streaming
- Cost budgets and alerts
- Task queuing and prioritization

---

## Related Documents

- [Architecture - Local-First Design](../architecture.md#21-architecture-pattern) (ADR-001)
- [Product Spec - Serverless Execution](../product_spec.md#feature-serverless-execution)
- [Notification Abstraction Layer](./notification-abstraction-layer.md)
- [Fire-and-Forget Execution](../decision_log.md#adr-021) (pattern to follow)

---

*Created: 2026-01-17*

