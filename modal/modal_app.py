"""
GoGoGadgetClaude - Modal Cloud Execution

This Modal app provides serverless execution of Claude Code prompts.
It allows users to run Claude agents in the cloud when their laptop is offline.

Deployment:
    modal deploy modal/modal_app.py

Local testing:
    modal serve modal/modal_app.py
"""

from __future__ import annotations

import json
import os
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import modal

# =============================================================================
# Modal App Configuration
# =============================================================================

app = modal.App("gogogadget-claude")

# Persistent volume for storing Claude session data (JSONL files)
volume = modal.Volume.from_name("gogogadget-sessions", create_if_missing=True)

# Container image with Claude CLI and dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "curl", "ca-certificates")
    .run_commands(
        # Install Node.js (required for Claude CLI)
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        # Install Claude CLI globally
        "npm install -g @anthropic-ai/claude-code",
    )
    .pip_install("fastapi[standard]")
)


# =============================================================================
# JSONL Parsing (Matches server/src/lib/jsonlParser.ts)
# =============================================================================


def parse_jsonl_file(file_path: Path) -> list[dict[str, Any]]:
    """Parse a JSONL file into a list of entries."""
    entries = []
    if not file_path.exists():
        return entries

    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                print(f"Warning: Malformed JSONL line {line_num} in {file_path}")
                continue

    return entries


def should_include_entry(entry: dict[str, Any]) -> bool:
    """Check if an entry should be included in the conversation."""
    # Skip file history snapshots
    if entry.get("type") == "file-history-snapshot":
        return False

    # Skip meta messages
    if entry.get("isMeta") is True:
        return False

    # Skip API error messages
    if entry.get("isApiErrorMessage") is True:
        return False

    # Only include user and assistant messages
    return entry.get("type") in ("user", "assistant")


def extract_text_from_content(content: str | list[dict[str, Any]]) -> str:
    """Extract text content from message content blocks."""
    if isinstance(content, str):
        return content

    texts = []
    for block in content:
        if block.get("type") == "text" and isinstance(block.get("text"), str):
            texts.append(block["text"])

    return "\n\n".join(texts)


def extract_tool_use(content: str | list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Extract tool use events from message content blocks."""
    if isinstance(content, str):
        return []

    tool_uses = []
    for block in content:
        if block.get("type") == "tool_use":
            tool_uses.append({
                "tool": block.get("name", "unknown"),
                "input": block.get("input", {}),
                "status": "complete",
            })

    return tool_uses


def transform_to_messages(entries: list[dict[str, Any]], session_id: str) -> list[dict[str, Any]]:
    """Transform raw JSONL entries into Message objects."""
    messages = []

    for entry in entries:
        if not should_include_entry(entry):
            continue

        message_data = entry.get("message", {})
        content = extract_text_from_content(message_data.get("content", ""))

        if entry["type"] == "user":
            messages.append({
                "id": entry.get("uuid", str(uuid.uuid4())),
                "sessionId": session_id,
                "type": "user",
                "content": content,
                "timestamp": entry.get("timestamp"),
            })
        elif entry["type"] == "assistant":
            tool_use = extract_tool_use(message_data.get("content", ""))
            msg = {
                "id": entry.get("uuid", str(uuid.uuid4())),
                "sessionId": session_id,
                "type": "assistant",
                "content": content,
                "timestamp": entry.get("timestamp"),
            }
            if tool_use:
                msg["toolUse"] = tool_use
            messages.append(msg)

    # Sort by timestamp
    messages.sort(key=lambda m: m.get("timestamp", ""))
    return messages


def get_session_metadata(entries: list[dict[str, Any]]) -> dict[str, Any]:
    """Get session metadata from parsed entries."""
    messages = [e for e in entries if should_include_entry(e)]

    if not messages:
        return {
            "startedAt": None,
            "lastActivityAt": None,
            "messageCount": 0,
        }

    timestamps = sorted([e.get("timestamp", "") for e in messages])

    return {
        "startedAt": timestamps[0] if timestamps else None,
        "lastActivityAt": timestamps[-1] if timestamps else None,
        "messageCount": len(messages),
    }


def get_first_user_message_preview(entries: list[dict[str, Any]], max_length: int = 60) -> str | None:
    """Extract the first user message as a preview string."""
    sorted_entries = sorted(entries, key=lambda e: e.get("timestamp", ""))

    for entry in sorted_entries:
        if not should_include_entry(entry):
            continue

        if entry.get("type") == "user":
            message_data = entry.get("message", {})
            content = extract_text_from_content(message_data.get("content", ""))

            # Clean up whitespace
            cleaned = " ".join(content.split()).strip()

            if not cleaned:
                continue

            if len(cleaned) <= max_length:
                return cleaned

            return cleaned[: max_length - 1].strip() + "…"

    return None


def extract_project_path(entries: list[dict[str, Any]]) -> str | None:
    """Extract the project path (cwd) from JSONL entries."""
    for entry in entries:
        if "cwd" in entry and entry["cwd"]:
            return entry["cwd"]
    return None


# =============================================================================
# Path Encoding (Matches Claude Code's encoding scheme)
# =============================================================================


def encode_path(project_path: str) -> str:
    """Encode a project path to Claude's folder naming convention."""
    # Claude replaces '/' with '-' and removes leading slash
    encoded = project_path.replace("/", "-")
    if encoded.startswith("-"):
        encoded = encoded[1:]
    return encoded


# =============================================================================
# Modal Functions
# =============================================================================


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
    secrets=[modal.Secret.from_name("ANTHROPIC_API_KEY")],
    timeout=1800,  # 30 minute max
    retries=0,  # Don't retry failed jobs
)
def execute_prompt(
    prompt: str,
    project_repo: str,
    project_name: str,
    allowed_tools: list[str] | None = None,
    notification_webhook: str | None = None,
) -> dict[str, Any]:
    """
    Execute a Claude prompt in the cloud.

    Args:
        prompt: The prompt text to send to Claude
        project_repo: Git repository URL to clone
        project_name: Human-readable project name
        allowed_tools: List of allowed tools (default: Task,Bash,Read,Write,Edit)
        notification_webhook: Optional webhook URL for completion notification

    Returns:
        dict with success status, stdout, stderr, and session info
    """
    import urllib.request
    import urllib.error

    work_dir = f"/tmp/{project_name}"
    session_id = None
    
    try:
        # Clean up any existing work directory
        if os.path.exists(work_dir):
            subprocess.run(["rm", "-rf", work_dir], check=True)

        # Clone the repository (shallow clone for speed)
        print(f"Cloning repository: {project_repo}")
        clone_result = subprocess.run(
            ["git", "clone", "--depth=1", project_repo, work_dir],
            capture_output=True,
            text=True,
        )
        
        if clone_result.returncode != 0:
            return {
                "success": False,
                "error": f"Git clone failed: {clone_result.stderr}",
                "stdout": clone_result.stdout,
                "stderr": clone_result.stderr,
            }

        # Change to the work directory
        os.chdir(work_dir)

        # Build Claude command
        tools_arg = ",".join(allowed_tools) if allowed_tools else "Task,Bash,Read,Write,Edit"
        cmd = [
            "claude",
            "-p", prompt,
            "--allowedTools", tools_arg,
            "--yes",  # Non-interactive mode (auto-accept tool usage)
        ]

        print(f"Executing Claude: {' '.join(cmd)}")

        # Execute Claude
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env={
                **os.environ,
                "ANTHROPIC_API_KEY": os.environ.get("ANTHROPIC_API_KEY", ""),
            },
        )

        success = result.returncode == 0
        
        # Try to find the session ID from Claude's output or the .claude folder
        claude_projects_dir = Path("/root/.claude/projects")
        encoded_project = encode_path(work_dir)
        project_session_dir = claude_projects_dir / encoded_project
        
        if project_session_dir.exists():
            # Get the most recent session file
            session_files = sorted(
                project_session_dir.glob("*.jsonl"),
                key=lambda f: f.stat().st_mtime,
                reverse=True
            )
            if session_files:
                session_id = session_files[0].stem

        # Commit volume changes to persist the session data
        volume.commit()

        print(f"Claude execution completed. Success: {success}, Session: {session_id}")

        # Send completion notification if webhook provided
        if notification_webhook:
            try:
                data = json.dumps({
                    "type": "task-complete",
                    "projectName": project_name,
                    "success": success,
                    "sessionId": session_id,
                }).encode("utf-8")
                
                req = urllib.request.Request(
                    notification_webhook,
                    data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                urllib.request.urlopen(req, timeout=10)
                print(f"Notification sent to {notification_webhook}")
            except urllib.error.URLError as e:
                print(f"Failed to send notification: {e}")

        return {
            "success": success,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "sessionId": session_id,
            "projectPath": work_dir,
        }

    except Exception as e:
        print(f"Error executing prompt: {e}")
        return {
            "success": False,
            "error": str(e),
            "stdout": "",
            "stderr": str(e),
        }


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
def list_projects() -> list[dict[str, Any]]:
    """List all projects with sessions on the cloud volume."""
    volume.reload()  # Ensure we have latest data
    
    projects_dir = Path("/root/.claude/projects")
    projects = []

    if not projects_dir.exists():
        return projects

    for project_folder in projects_dir.iterdir():
        if not project_folder.is_dir():
            continue

        session_files = list(project_folder.glob("*.jsonl"))
        if not session_files:
            continue

        # Get metadata from the most recent session
        latest_session = max(session_files, key=lambda f: f.stat().st_mtime)
        entries = parse_jsonl_file(latest_session)
        project_path = extract_project_path(entries)

        # Calculate aggregate stats
        total_messages = 0
        latest_activity = None

        for session_file in session_files:
            entries = parse_jsonl_file(session_file)
            metadata = get_session_metadata(entries)
            total_messages += metadata["messageCount"]
            
            if metadata["lastActivityAt"]:
                if not latest_activity or metadata["lastActivityAt"] > latest_activity:
                    latest_activity = metadata["lastActivityAt"]

        projects.append({
            "encodedPath": project_folder.name,
            "path": project_path or project_folder.name,
            "name": Path(project_path).name if project_path else project_folder.name,
            "sessionCount": len(session_files),
            "lastSessionId": latest_session.stem,
            "lastActivityAt": latest_activity,
        })

    # Sort by last activity (most recent first)
    projects.sort(key=lambda p: p.get("lastActivityAt") or "", reverse=True)
    return projects


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
def get_sessions(encoded_project_path: str) -> list[dict[str, Any]]:
    """
    List sessions for a project from the volume.

    Args:
        encoded_project_path: Claude's encoded folder name for the project

    Returns:
        List of session metadata dictionaries
    """
    volume.reload()  # Ensure we have latest data
    
    sessions_dir = Path(f"/root/.claude/projects/{encoded_project_path}")
    sessions = []

    if not sessions_dir.exists():
        return sessions

    for jsonl_file in sessions_dir.glob("*.jsonl"):
        # Skip sidechain files (agent sub-conversations)
        if ".sidechain." in jsonl_file.name:
            continue

        entries = parse_jsonl_file(jsonl_file)
        metadata = get_session_metadata(entries)
        preview = get_first_user_message_preview(entries)
        project_path = extract_project_path(entries)

        sessions.append({
            "id": jsonl_file.stem,
            "filePath": str(jsonl_file),
            "projectPath": project_path or encoded_project_path,
            "startedAt": metadata["startedAt"],
            "lastActivityAt": metadata["lastActivityAt"],
            "messageCount": metadata["messageCount"],
            "preview": preview,
            "source": "cloud",
        })

    # Sort by last activity (most recent first)
    sessions.sort(key=lambda s: s.get("lastActivityAt") or "", reverse=True)
    return sessions


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
def get_messages(session_id: str, encoded_project_path: str) -> dict[str, Any]:
    """
    Get messages for a session from the volume.

    Args:
        session_id: Session UUID (filename without .jsonl)
        encoded_project_path: Claude's encoded folder name for the project

    Returns:
        dict with messages array and session status
    """
    volume.reload()  # Ensure we have latest data
    
    jsonl_path = Path(f"/root/.claude/projects/{encoded_project_path}/{session_id}.jsonl")

    if not jsonl_path.exists():
        return {
            "messages": [],
            "status": "idle",
            "sessionId": session_id,
            "error": "Session not found",
        }

    entries = parse_jsonl_file(jsonl_path)
    messages = transform_to_messages(entries, session_id)

    # Determine status based on last message
    # If the last message is from assistant and has no pending tool calls, status is "waiting"
    # Otherwise, we assume "idle" for cloud sessions (no live process)
    status = "idle"
    if messages:
        last_msg = messages[-1]
        if last_msg.get("type") == "assistant":
            status = "waiting"

    return {
        "messages": messages,
        "status": status,
        "sessionId": session_id,
    }


# =============================================================================
# Web Endpoints (FastAPI via Modal)
# =============================================================================


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
    secrets=[modal.Secret.from_name("ANTHROPIC_API_KEY")],
)
@modal.fastapi_endpoint(method="POST")
def api_dispatch_job(request: dict) -> dict:
    """
    Web endpoint to dispatch a new cloud job.

    POST /api/dispatch
    Body: {
        "prompt": "...",
        "repoUrl": "https://github.com/...",
        "projectName": "my-project",
        "allowedTools": ["Task", "Bash", "Read", "Write"],
        "notificationWebhook": "https://..."
    }
    """
    prompt = request.get("prompt")
    repo_url = request.get("repoUrl")
    project_name = request.get("projectName")
    allowed_tools = request.get("allowedTools")
    notification_webhook = request.get("notificationWebhook")

    if not prompt or not repo_url or not project_name:
        return {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Missing required fields: prompt, repoUrl, projectName",
            }
        }

    # Spawn the execution as an async job
    job = execute_prompt.spawn(
        prompt=prompt,
        project_repo=repo_url,
        project_name=project_name,
        allowed_tools=allowed_tools,
        notification_webhook=notification_webhook,
    )

    return {
        "data": {
            "jobId": job.object_id,
            "status": "queued",
        }
    }


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
@modal.fastapi_endpoint(method="GET")
def api_list_projects() -> dict:
    """
    Web endpoint to list all projects.

    GET /api/projects
    """
    projects = list_projects.remote()
    return {"data": projects}


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
@modal.fastapi_endpoint(method="GET")
def api_get_sessions(encoded_path: str) -> dict:
    """
    Web endpoint to list sessions for a project.

    GET /api/projects/{encoded_path}/sessions
    """
    sessions = get_sessions.remote(encoded_path)
    return {"data": sessions}


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
@modal.fastapi_endpoint(method="GET")
def api_get_messages(encoded_path: str, session_id: str) -> dict:
    """
    Web endpoint to get messages for a session.

    GET /api/projects/{encoded_path}/sessions/{session_id}/messages
    """
    result = get_messages.remote(session_id, encoded_path)
    return {"data": result}


@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def api_health() -> dict:
    """
    Health check endpoint.

    GET /api/health
    """
    return {
        "data": {
            "healthy": True,
            "service": "gogogadget-claude",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


# =============================================================================
# Local Development Entry Point
# =============================================================================

if __name__ == "__main__":
    # For local testing via `modal run modal/modal_app.py`
    print("GoGoGadgetClaude Modal App")
    print("==========================")
    print()
    print("Available functions:")
    print("  - execute_prompt: Run a Claude prompt on a git repo")
    print("  - list_projects: List all projects with sessions")
    print("  - get_sessions: List sessions for a project")
    print("  - get_messages: Get messages for a session")
    print()
    print("Web endpoints (after deploy):")
    print("  - POST /api_dispatch_job - Dispatch a new job")
    print("  - GET  /api_list_projects - List projects")
    print("  - GET  /api_get_sessions - List sessions")
    print("  - GET  /api_get_messages - Get messages")
    print("  - GET  /api_health - Health check")
    print()
    print("To deploy: modal deploy modal/modal_app.py")
    print("To serve locally: modal serve modal/modal_app.py")

