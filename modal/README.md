# GoGoGadgetClaude - Modal Cloud Execution

This folder contains the Modal app for serverless Claude Code execution.

## Prerequisites

1. **Modal Account**: Sign up at [modal.com](https://modal.com)
2. **Modal CLI**: Install with `pip install modal`
3. **Modal Token**: Run `modal token new` to authenticate
4. **Anthropic API Key**: Required for Claude execution in the cloud

## Setup

### 1. Configure Secrets

Create a Modal secret for your Anthropic API key:

```bash
modal secret create claude-api-key ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Deploy the App

```bash
modal deploy modal/modal_app.py
```

After deployment, Modal will provide URLs for each web endpoint.

### 3. Local Development

To test locally without deploying:

```bash
modal serve modal/modal_app.py
```

This starts a local server with the same endpoints.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Modal Cloud                                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Web Endpoints (FastAPI)                                  │   │
│  │  - POST /api_dispatch_job     - Start a new job           │   │
│  │  - GET  /api_list_projects    - List projects             │   │
│  │  - GET  /api_get_sessions     - List sessions             │   │
│  │  - GET  /api_get_messages     - Get messages              │   │
│  │  - GET  /api_health           - Health check              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  execute_prompt (Ephemeral Container)                     │   │
│  │  - Claude CLI installed                                   │   │
│  │  - Git clone → Run claude -p "prompt" → Save JSONL        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Modal Volume: gogogadget-sessions                        │   │
│  │  Persistent storage for ~/.claude/projects/               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Functions

### `execute_prompt`

Executes a Claude prompt on a cloned git repository.

**Parameters:**
- `prompt` (str): The prompt to send to Claude
- `project_repo` (str): Git repository URL to clone
- `project_name` (str): Human-readable project name
- `allowed_tools` (list[str], optional): List of allowed tools
- `notification_webhook` (str, optional): Webhook URL for completion notification

**Returns:**
```python
{
    "success": bool,
    "stdout": str,
    "stderr": str,
    "sessionId": str | None,
    "projectPath": str,
}
```

### `list_projects`

Lists all projects with sessions on the cloud volume.

### `get_sessions`

Lists sessions for a specific project.

### `get_messages`

Gets messages for a specific session.

## Web Endpoints

After deployment, Modal generates URLs like:

```
https://your-workspace--gogogadget-claude-api-dispatch-job.modal.run
https://your-workspace--gogogadget-claude-api-list-projects.modal.run
https://your-workspace--gogogadget-claude-api-get-sessions.modal.run
https://your-workspace--gogogadget-claude-api-get-messages.modal.run
https://your-workspace--gogogadget-claude-api-health.modal.run
```

### Dispatch a Job

```bash
curl -X POST https://...api-dispatch-job.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add a hello world function to main.py",
    "repoUrl": "https://github.com/user/repo.git",
    "projectName": "my-project",
    "allowedTools": ["Task", "Bash", "Read", "Write", "Edit"]
  }'
```

Response:
```json
{
  "data": {
    "jobId": "fc-abc123...",
    "status": "queued"
  }
}
```

### List Projects

```bash
curl https://...api-list-projects.modal.run
```

### Get Sessions

```bash
curl "https://...api-get-sessions.modal.run?encoded_path=-Users-me-my-project"
```

### Get Messages

```bash
curl "https://...api-get-messages.modal.run?encoded_path=-Users-me-my-project&session_id=abc-123"
```

## Cost Estimation

| Resource         | Rate             | Typical Task (5 min) |
|------------------|------------------|----------------------|
| CPU (per second) | ~$0.0001/sec     | ~$0.03               |
| Memory (4GB)     | ~$0.00005/sec/GB | ~$0.06               |
| Volume storage   | ~$0.40/GB/month  | < $1/month           |

**Estimated cost per task:** ~$0.05-0.10 (excluding Anthropic API costs)

## Troubleshooting

### "Secret not found: claude-api-key"

Create the secret:
```bash
modal secret create claude-api-key ANTHROPIC_API_KEY=sk-ant-...
```

### "Git clone failed"

- Check the repository URL is correct and accessible
- For private repos, use HTTPS with a personal access token:
  `https://token@github.com/user/repo.git`

### "Claude CLI not found"

The container image should have Claude CLI installed. If not, the image build may have failed. Try:
```bash
modal deploy modal/modal_app.py --force
```

### View Logs

```bash
modal logs gogogadget-claude
```

## Development

### Testing Locally

```python
# In Python REPL or script
from modal_app import execute_prompt, get_sessions, get_messages

# Test execution (requires Modal credentials)
result = execute_prompt.remote(
    prompt="Print hello world",
    project_repo="https://github.com/user/test-repo.git",
    project_name="test-project",
)
print(result)
```

### Updating the App

After making changes:

```bash
modal deploy modal/modal_app.py
```

Changes are deployed instantly with zero downtime.


