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
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import modal
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# =============================================================================
# Volume Caching (reduces volume.reload() calls for better latency)
# =============================================================================

# In-memory timestamp of last volume reload
# This allows us to skip redundant reloads within a short window
_last_volume_reload: float = 0.0
_VOLUME_RELOAD_INTERVAL_SECONDS: float = 2.0  # Only reload every 2 seconds max


def reload_volume_if_needed(vol: modal.Volume, force: bool = False) -> None:
    """
    Reload volume only if enough time has passed since the last reload.
    This reduces latency by avoiding redundant reload calls during rapid requests.
    
    Args:
        vol: The Modal volume to reload
        force: If True, reload regardless of timing
    """
    global _last_volume_reload
    now = time.time()
    
    if force or (now - _last_volume_reload) > _VOLUME_RELOAD_INTERVAL_SECONDS:
        vol.reload()
        _last_volume_reload = now

# =============================================================================
# Default Templates (matches server/src/services/templateService.ts)
# =============================================================================

DEFAULT_TEMPLATES = [
    {
        "label": "Plan Milestone",
        "icon": "📋",
        "prompt": """# Plan Milestone

Review the **[MILESTONE NAME]** milestone:

1. Read `docs/project_status.md` and `docs/product_spec.md` and `docs/architecture.md`
2. Review any relevant feature docs and plan the milestone out and list all features in priority/dependency order based on any sequencing constraints around what must be built first (don't over-engineer this, don't break it into phases or anything just list the ordering of the features to build because there will be standalone planning processes for each individual feature. The goal right now is just to identify work order.)
3. Create a recommended build order
4. Update the `docs/project_status.md`doc with the build order sequencing details (again, keep this update lightweight and keep it context-light as each feature will be planned, built, and handled individually). Do not update any other files.

Start with step 1.""",
    },
    {
        "label": "Plan Feature",
        "icon": "📝",
        "prompt": """# Plan Feature

Plan the next feature, the **[FEATURE NAME]** feature:

1. Read `docs/project_status.md` and `docs/product_spec.md` and `docs/architecture.md` and any relevant feature docs
2. Break into atomic implementation tasks (~30-60 min each). Don't include unit and integration tests in this list, those should be a sparate test plan which is handled as a final action outside of the task list. Feel free to include a test plan in the feature doc though.
3. Create a feature doc in `docs/Features/[feature-name].md` outlining the feature and the implementation tasks.
4. Update `docs/project_status.md` to mark this feature as in-progress (keep this update context-light). Do not update any other files.

Start with step 1.""",
    },
    {
        "label": "Build Task",
        "icon": "🔨",
        "prompt": """# Build Task

Implement the next task, task **[TASK NUMBER]** for the feature **[FEATURE NAME]**: **[TASK DESCRIPTION]**

1. Read `docs/Features/[feature-name].md` for the feature you're working on, and any other relevant feature docs
2. Implement the next incomplete task in the feature. Follow existing patterns in the codebase and keep changes minimal and focused.
3. Run linting after implementation. Don't worry about unit tests for now, those will come as part of a bigger testing step for the overall feature later.
4. Confirm when complete.  If there are tasks remaining, call the /build-task slash command. If this was the final task in the feature, or if blockers arise, confirm when complete using explicit confirmation like "Task **[TASK NUMBER OUT OF TOTAL TASKS IN FEATURE NUMBER]** complete. Ready for next task, or do you want to test this first?".

Start with step 1.""",
    },
    {
        "label": "Test",
        "icon": "🧪",
        "prompt": """# Test

Test the feature **[FEATURE/COMPONENT]** we just built:

1. Read `docs/Features/[feature-name].md`
2. Identify what tests should exist for the overall feature (unit, integration, e2e)
3. Run existing tests to verify nothing broke
4. Write new tests for the new functionality
5. Use browser tools to manually verify UI if applicable (avoid actions which will invoke APIs that cost money like LLMs or scrapers, ask before doing so if you absolutely need to test those)
6. Report results (do not commit to git or update any docs. Use explicit confirmation like "Testing complete with 0 errors. Ready to finalize?").

Start with step 1.""",
    },
    {
        "label": "Finalize",
        "icon": "✅",
        "prompt": """# Finalize Feature

Finalize the feature **[FEATURE NAME]** we just built:

1. Run `pnpm lint` and `pnpm type-check` - fix any errors
2. Review all implementation work from the various tasks built for the feature, and update `docs/Features/[feature-name].md` with any relevant detail for documentation.
3. Update `docs/changelog.md` with what was added/changed
4. Update `docs/project_status.md` to mark feature complete (move the completed feature to the bottom of the document and remove any no-longer-needed detail about the specific sequencing of this feature build, to try and keep this project_status doc compact)
5. Add any architectural decisions to `docs/decision_log.md`
6. Prepare a conventional commit message and propose a version tag using the naming convention "vX.Y.Z" where X is the milestone number (starting at 0 for MVP), Y is the feature number from the milestone plan, and Z is used for iterations like major bug fixes or incremental unplanned features.

Start with step 1.""",
    },
    {
        "label": "Fix/Update",
        "icon": "🔧",
        "prompt": """# Fix or Update Task

Implement an update or fix for the issue **[ISSUE]** related to the feature **[FEATURE NAME]**: **[TASK DESCRIPTION]**

1. Read any relevant `docs/Features/[feature-name].md` docs for background on the features architecture.
2. Do any debugging necessary, checking the logs if needed to identify what's going on.
3. Plan a fix which accounts for the overall project plan and architecture by breaking the update into atomic implementation tasks (~30-60 min each).
4. Implement the update. Follow existing patterns in the codebase and keep changes minimal and focused.
5. Run linting after implementation.
6. Identify if any new tests should exist or existing tests should be updated (unit, integration, e2e).
7. Run tests
8. When all tests pass, update any relevant `docs/Features/[feature-name].md` docs.
9. Confirm when complete and report on results, and prepare a commit message.

Start with step 1.""",
    },
]

# =============================================================================
# Modal App Configuration
# =============================================================================

app = modal.App("gogogadget-claude")

# Persistent volume for storing Claude session data (JSONL files)
volume = modal.Volume.from_name("gogogadget-sessions", create_if_missing=True)

# Persistent volume for storing cloned git repositories
# This allows repos to persist across container restarts, avoiding re-cloning
repos_volume = modal.Volume.from_name("gogogadget-repos", create_if_missing=True)

# Dict for storing scheduled prompts synced from local
# This enables cloud-based scheduling even when laptop is offline
scheduled_prompts_dict = modal.Dict.from_name("gogogadget-scheduled-prompts", create_if_missing=True)

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
    .pip_install("fastapi[standard]", "pydantic", "httpx", "requests")
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

    return messages


def get_session_summary(session_file: Path) -> dict[str, Any] | None:
    """Get a summary of a session from its JSONL file."""
    entries = parse_jsonl_file(session_file)
    if not entries:
        return None

    session_id = session_file.stem  # UUID from filename

    # Find timestamps
    first_timestamp = None
    last_timestamp = None
    first_user_message = None
    message_count = 0

    for entry in entries:
        if not should_include_entry(entry):
            continue

        timestamp = entry.get("timestamp")
        if timestamp:
            if first_timestamp is None:
                first_timestamp = timestamp
            last_timestamp = timestamp

        message_count += 1

        # Get first user message for preview
        if first_user_message is None and entry.get("type") == "user":
            message_data = entry.get("message", {})
            content = extract_text_from_content(message_data.get("content", ""))
            if content:
                first_user_message = content[:100]

    if message_count == 0:
        return None

    return {
        "id": session_id,
        "filePath": str(session_file),
        "startedAt": first_timestamp,
        "lastActivityAt": last_timestamp,
        "messageCount": message_count,
        "preview": first_user_message,
    }


# =============================================================================
# Core Functions (Modal Functions)
# =============================================================================


@app.function(
    image=image,
    volumes={
        "/root/.claude": volume,
        "/repos": repos_volume,  # Persistent volume for git repos
    },
    secrets=[
        modal.Secret.from_name("ANTHROPIC_API_KEY"),
        modal.Secret.from_name("GITHUB_TOKEN"),
    ],
    timeout=600,  # 10 minute timeout for long-running prompts
)
def execute_prompt(
    prompt: str,
    project_repo: str,
    project_name: str,
    session_id: str | None = None,
    allowed_tools: list[str] | None = None,
    notification_webhook: str | None = None,
    ntfy_topic: str | None = None,
    image_attachment: dict[str, str] | None = None,  # {filename, mimeType, base64}
) -> dict[str, Any]:
    """
    Execute a Claude prompt on a git repository.

    The repository is stored in a persistent volume, so:
    - First call for a project: clones the repo
    - Subsequent calls: reuses existing repo (with git pull for latest)
    - Changes accumulate across multiple prompts in the same session
    - Changes are NOT auto-pushed; use the explicit push endpoint

    Args:
        prompt: The prompt to send to Claude
        project_repo: Git repository URL to clone
        project_name: Name for the project (used for session organization)
        session_id: Optional session ID to continue (if None, creates new session)
        allowed_tools: List of allowed tools (e.g., ["Task", "Bash", "Read", "Write"])
        notification_webhook: Optional webhook URL to call on completion
        ntfy_topic: Optional ntfy topic for push notifications

    Returns:
        dict with sessionId, success status, output, and hasPendingChanges
    """
    import requests

    # Use persistent repos volume instead of ephemeral /tmp
    work_dir = Path(f"/repos/{project_name}")

    # Log all parameters for debugging
    print(f"=== execute_prompt called ===")
    print(f"  project_repo: {project_repo}")
    print(f"  project_name: {project_name}")
    print(f"  session_id: {session_id}")
    print(f"  ntfy_topic: {ntfy_topic}")
    print(f"  notification_webhook: {notification_webhook}")
    print(f"  allowed_tools: {allowed_tools}")
    print(f"  work_dir: {work_dir} (persistent volume)")
    print(f"  has_image_attachment: {image_attachment is not None}")

    # Handle image attachment - save to temp file and prepend to prompt
    temp_image_path = None
    final_prompt = prompt
    if image_attachment:
        try:
            import base64
            mime_type = image_attachment.get("mimeType", "image/png")
            ext = mime_type.split("/")[1] if "/" in mime_type else "png"
            temp_image_path = f"/tmp/gogogadget-{uuid.uuid4()}.{ext}"
            
            # Decode base64 and write to temp file
            image_data = base64.b64decode(image_attachment["base64"])
            with open(temp_image_path, "wb") as f:
                f.write(image_data)
            
            print(f"  Saved image attachment to: {temp_image_path} ({len(image_data)} bytes)")
            
            # Prepend image reference to prompt using @filepath syntax
            final_prompt = f"@{temp_image_path}\n\n{prompt}"
        except Exception as e:
            print(f"  Failed to save image attachment: {e}")
            # Continue without the image

    # Use existing session ID or generate new one
    is_continuation = session_id is not None
    if not session_id:
        session_id = str(uuid.uuid4())
        print(f"  Generated new session_id: {session_id}")
    else:
        print(f"  Continuing existing session: {session_id}")

    has_pending_changes = False

    try:
        # Prepare GitHub token for authentication
        github_token = os.environ.get("GITHUB_TOKEN")
        clone_url = project_repo
        if github_token and "github.com" in project_repo and project_repo.startswith("https://"):
            clone_url = project_repo.replace(
                "https://github.com", f"https://{github_token}@github.com"
            )

        work_dir.parent.mkdir(parents=True, exist_ok=True)

        # Check if repo already exists in the persistent volume
        if work_dir.exists():
            print(f"Found existing repo at {work_dir}")
            try:
                # Verify it's a valid git repo
                git_check = subprocess.run(
                    ["git", "rev-parse", "--git-dir"],
                    cwd=str(work_dir),
                    capture_output=True,
                )
                if git_check.returncode == 0:
                    print("Valid git repo found in volume")
                    # Update remote URL with current token
                    subprocess.run(
                        ["git", "remote", "set-url", "origin", clone_url],
                        cwd=str(work_dir),
                        capture_output=True,
                    )
                    # Configure git to trust the directory
                    subprocess.run(
                        ["git", "config", "--global", "--add", "safe.directory", str(work_dir)],
                        capture_output=True,
                    )
                    # For new sessions (not continuation), pull latest from origin
                    if not is_continuation:
                        print("New session - pulling latest from origin...")
                        # Stash any local changes first
                        subprocess.run(
                            ["git", "stash"],
                            cwd=str(work_dir),
                            capture_output=True,
                        )
                        # Fetch and reset to origin/main
                        fetch_result = subprocess.run(
                            ["git", "fetch", "origin", "main"],
                            cwd=str(work_dir),
                            capture_output=True,
                            text=True,
                        )
                        if fetch_result.returncode == 0:
                            subprocess.run(
                                ["git", "reset", "--hard", "origin/main"],
                                cwd=str(work_dir),
                                capture_output=True,
                            )
                            print("Reset to latest origin/main")
                        else:
                            print(f"Fetch failed, using existing local state: {fetch_result.stderr}")
                    else:
                        print("Continuing session - keeping local changes")
                else:
                    raise Exception("Not a valid git directory")
            except Exception as e:
                print(f"Repo validation failed ({e}), will re-clone")
                subprocess.run(["rm", "-rf", str(work_dir)], check=True)
        
        # Clone if directory doesn't exist
        if not work_dir.exists():
            print(f"Cloning {project_repo} to {work_dir}...")
            if github_token:
                print("Using GitHub token for authentication")
            clone_result = subprocess.run(
                ["git", "clone", clone_url, str(work_dir)],
                capture_output=True,
                text=True,
            )
            if clone_result.returncode != 0:
                print(f"Clone failed: {clone_result.stderr}")
                raise subprocess.CalledProcessError(
                    clone_result.returncode, "git clone", clone_result.stderr
                )
            # Configure git to trust the directory
            subprocess.run(
                ["git", "config", "--global", "--add", "safe.directory", str(work_dir)],
                capture_output=True,
            )

        # Build the Claude command
        cmd = ["claude", "-p", final_prompt]

        # If continuing an existing session, add --continue flag
        if is_continuation:
            cmd.extend(["--continue", session_id])
            print(f"Using --continue with session: {session_id}")

        # Use --allowedTools to grant permissions for headless execution
        # Note: --dangerously-skip-permissions doesn't work with root (Modal runs as root)
        # These tools cover typical file editing and task operations
        default_tools = ["Read", "Write", "Edit", "Bash", "Task", "WebSearch", "TodoRead", "TodoWrite"]
        tools_to_use = allowed_tools if allowed_tools else default_tools
        cmd.extend(["--allowedTools", ",".join(tools_to_use)])
        print(f"Using allowed tools: {tools_to_use}")

        # Run Claude in the repo directory
        print(f"Running Claude with prompt: {final_prompt[:100]}...")
        result = subprocess.run(
            cmd,
            cwd=str(work_dir),
            capture_output=True,
            text=True,
            timeout=540,  # 9 minute timeout (leave buffer for cleanup)
        )

        success = result.returncode == 0
        output = result.stdout if success else result.stderr

        print(f"Claude finished with return code: {result.returncode}")
        if not success:
            print(f"Claude stderr: {result.stderr[:500] if result.stderr else '(empty)'}")

        # Clean up temp image file
        if temp_image_path:
            try:
                os.remove(temp_image_path)
                print(f"Cleaned up temp image: {temp_image_path}")
            except Exception as e:
                print(f"Failed to clean up temp image: {e}")

        # Commit the session data volume
        volume.commit()

        # Check for pending changes (but do NOT push)
        print("=== Checking for git changes ===")
        if success:
            try:
                git_status = subprocess.run(
                    ["git", "status", "--porcelain"],
                    cwd=str(work_dir),
                    capture_output=True,
                    text=True,
                )
                status_output = git_status.stdout.strip()

                if status_output:
                    print(f"Git changes detected:\n{status_output}")

                    # Configure git user for commit
                    subprocess.run(
                        ["git", "config", "user.email", "gogogadget@claude.ai"],
                        cwd=str(work_dir),
                    )
                    subprocess.run(
                        ["git", "config", "user.name", "GoGoGadget Claude"],
                        cwd=str(work_dir),
                    )

                    # Add all changes
                    subprocess.run(
                        ["git", "add", "-A"],
                        cwd=str(work_dir),
                    )

                    # Create commit locally (but do NOT push)
                    # Use the user's prompt as the commit message (truncated for git)
                    # Format: First 50 chars of prompt as subject, full prompt in body
                    prompt_clean = prompt.strip().replace('\n', ' ')
                    subject = prompt_clean[:50] + ('...' if len(prompt_clean) > 50 else '')
                    commit_msg = f"{subject}\n\nFull prompt: {prompt_clean[:500]}\n\nCloud session: {session_id[:8]}"
                    commit_result = subprocess.run(
                        ["git", "commit", "-m", commit_msg],
                        cwd=str(work_dir),
                        capture_output=True,
                        text=True,
                    )
                    print(f"Git commit result: {commit_result.returncode}")
                    if commit_result.stdout:
                        print(f"Commit output: {commit_result.stdout}")

                    has_pending_changes = True
                    print("✓ Changes committed locally (NOT pushed - use explicit push endpoint)")
                else:
                    print("No git changes detected")
                    # Check if there are unpushed commits from previous executions
                    log_result = subprocess.run(
                        ["git", "log", "origin/main..HEAD", "--oneline"],
                        cwd=str(work_dir),
                        capture_output=True,
                        text=True,
                    )
                    if log_result.stdout.strip():
                        print(f"Unpushed commits from previous sessions:\n{log_result.stdout}")
                        has_pending_changes = True
            except Exception as git_err:
                print(f"Git error: {str(git_err)}")
                import traceback
                traceback.print_exc()

        # Commit the repos volume to persist changes
        repos_volume.commit()
        print("✓ Repos volume committed")

        # Call notification webhook if provided
        if notification_webhook:
            try:
                requests.post(
                    notification_webhook,
                    json={
                        "jobId": session_id,
                        "status": "completed" if success else "failed",
                        "projectName": project_name,
                        "output": output[:1000] if output else None,
                        "hasPendingChanges": has_pending_changes,
                    },
                    timeout=10,
                )
            except Exception as e:
                print(f"Failed to call notification webhook: {e}")

        # Send ntfy push notification if topic is provided
        print(f"Checking ntfy notification - topic: '{ntfy_topic}'")
        if ntfy_topic:
            try:
                # Use ASCII-safe status prefix (ntfy "Tags" will add emoji)
                status_word = "Success" if success else "Failed"
                pending_str = " (changes pending)" if has_pending_changes else ""
                title = f"Claude {status_word}: {project_name}{pending_str}"
                # Get first 200 chars of output for message body
                body = output[:200] if output else "No output"
                if len(output or "") > 200:
                    body += "..."

                ntfy_url = f"https://ntfy.sh/{ntfy_topic}"
                print(f"Sending ntfy notification to: {ntfy_url}")
                print(f"  Title: {title}")
                print(f"  Body preview: {body[:50] if body else '(empty)'}...")

                # ntfy Tags add emojis automatically: robot=🤖, warning=⚠️, white_check_mark=✅
                tags = "white_check_mark,robot" if success else "warning,robot"

                ntfy_response = requests.post(
                    ntfy_url,
                    data=body.encode("utf-8"),
                    headers={
                        "Title": title,
                        "Priority": "high" if not success else "default",
                        "Tags": tags,
                    },
                    timeout=10,
                )
                print(f"ntfy response status: {ntfy_response.status_code}")
                if ntfy_response.status_code != 200:
                    print(f"ntfy response body: {ntfy_response.text}")
                else:
                    print(f"Successfully sent ntfy notification to topic: {ntfy_topic}")
            except Exception as e:
                print(f"Failed to send ntfy notification: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("No ntfy topic provided, skipping notification")

        return {
            "sessionId": session_id,
            "success": success,
            "output": output,
            "projectName": project_name,
            "hasPendingChanges": has_pending_changes,
        }

    except subprocess.TimeoutExpired:
        error_msg = "Claude execution timed out after 9 minutes"
        print(error_msg)
        return {
            "sessionId": session_id,
            "success": False,
            "error": error_msg,
            "projectName": project_name,
        }

    except subprocess.CalledProcessError as e:
        error_msg = f"Command failed: {e.stderr if e.stderr else str(e)}"
        print(error_msg)
        return {
            "sessionId": session_id,
            "success": False,
            "error": error_msg,
            "projectName": project_name,
        }

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(error_msg)
        return {
            "sessionId": session_id,
            "success": False,
            "error": error_msg,
            "projectName": project_name,
        }


@app.function(
    image=image,
    volumes={"/repos": repos_volume},
)
def check_repo_changes(project_name: str) -> dict[str, Any]:
    """
    Check for pending changes in a project's repo.

    Returns:
        dict with pendingChanges, uncommittedFiles, unpushedCommits, diffSummary
    """
    repos_volume.reload()

    work_dir = Path(f"/repos/{project_name}")

    if not work_dir.exists():
        return {
            "hasPendingChanges": False,
            "exists": False,
            "message": f"No repo found for {project_name}",
        }

    try:
        # Check if it's a valid git repo
        git_check = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=str(work_dir),
            capture_output=True,
        )
        if git_check.returncode != 0:
            return {
                "hasPendingChanges": False,
                "exists": True,
                "message": "Directory exists but is not a git repo",
            }

        # Get uncommitted changes
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(work_dir),
            capture_output=True,
            text=True,
        )
        uncommitted = status_result.stdout.strip().split("\n") if status_result.stdout.strip() else []

        # Get unpushed commits
        log_result = subprocess.run(
            ["git", "log", "origin/main..HEAD", "--oneline"],
            cwd=str(work_dir),
            capture_output=True,
            text=True,
        )
        unpushed = log_result.stdout.strip().split("\n") if log_result.stdout.strip() else []

        # Get diff summary for unpushed changes
        diff_result = subprocess.run(
            ["git", "diff", "--stat", "origin/main..HEAD"],
            cwd=str(work_dir),
            capture_output=True,
            text=True,
        )
        diff_summary = diff_result.stdout.strip() if diff_result.stdout.strip() else ""

        has_changes = bool(uncommitted and uncommitted[0]) or bool(unpushed and unpushed[0])

        return {
            "hasPendingChanges": has_changes,
            "exists": True,
            "uncommittedFiles": [f for f in uncommitted if f],  # Filter empty strings
            "unpushedCommits": [c for c in unpushed if c],
            "diffSummary": diff_summary,
            "commitCount": len([c for c in unpushed if c]),
        }
    except Exception as e:
        return {
            "hasPendingChanges": False,
            "exists": True,
            "error": str(e),
        }


@app.function(
    image=image,
    volumes={"/repos": repos_volume},
    secrets=[modal.Secret.from_name("GITHUB_TOKEN")],
    timeout=120,
)
def push_repo_changes(project_name: str, repo_url: str) -> dict[str, Any]:
    """
    Push pending changes to GitHub.

    This is the ONLY way changes get pushed - no auto-push after execute_prompt.

    Args:
        project_name: Name of the project (matches directory in /repos volume)
        repo_url: GitHub HTTPS URL for pushing

    Returns:
        dict with success status, pushed commits, and any errors
    """
    repos_volume.reload()

    work_dir = Path(f"/repos/{project_name}")

    if not work_dir.exists():
        return {
            "success": False,
            "error": f"No repo found for {project_name}",
        }

    try:
        # Prepare authenticated URL
        github_token = os.environ.get("GITHUB_TOKEN")
        push_url = repo_url
        if github_token and "github.com" in repo_url and repo_url.startswith("https://"):
            push_url = repo_url.replace(
                "https://github.com", f"https://{github_token}@github.com"
            )

        # Check what we're about to push
        log_result = subprocess.run(
            ["git", "log", "origin/main..HEAD", "--oneline"],
            cwd=str(work_dir),
            capture_output=True,
            text=True,
        )
        commits_to_push = [c for c in log_result.stdout.strip().split("\n") if c]

        if not commits_to_push:
            return {
                "success": True,
                "message": "No commits to push",
                "pushedCommits": [],
            }

        # Push to main
        push_result = subprocess.run(
            ["git", "push", push_url, "HEAD:main"],
            cwd=str(work_dir),
            capture_output=True,
            text=True,
        )

        if push_result.returncode == 0:
            # Commit volume to persist the updated refs
            repos_volume.commit()

            return {
                "success": True,
                "message": f"Pushed {len(commits_to_push)} commit(s) to main",
                "pushedCommits": commits_to_push,
            }
        else:
            return {
                "success": False,
                "error": push_result.stderr or "Push failed",
                "stdout": push_result.stdout,
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


# =============================================================================
# Scheduled Prompts (Cloud Scheduler)
# =============================================================================


def get_timezone_offset_hours(tz_name: str, dt: datetime) -> float:
    """
    Get the UTC offset in hours for a given timezone at a specific datetime.
    Uses Python's zoneinfo (3.9+) for accurate timezone handling.
    
    Args:
        tz_name: IANA timezone name (e.g., "America/Los_Angeles")
        dt: The datetime to get the offset for (important for DST)
    
    Returns:
        Offset in hours (negative for west of UTC, e.g., -8 for PST)
    """
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(tz_name)
        # Create a datetime in the target timezone
        local_dt = dt.replace(tzinfo=timezone.utc).astimezone(tz)
        # Get the UTC offset
        offset = local_dt.utcoffset()
        if offset:
            return offset.total_seconds() / 3600
        return 0
    except Exception as e:
        print(f"Warning: Failed to get timezone offset for {tz_name}: {e}")
        # Common timezone fallbacks
        tz_offsets = {
            "America/Los_Angeles": -8,  # PST (or -7 for PDT)
            "America/New_York": -5,     # EST (or -4 for EDT)
            "America/Chicago": -6,      # CST
            "America/Denver": -7,       # MST
            "Europe/London": 0,
            "Europe/Paris": 1,
            "Asia/Tokyo": 9,
            "UTC": 0,
        }
        return tz_offsets.get(tz_name, 0)


def calculate_next_run_at(prompt: dict[str, Any]) -> str:
    """
    Calculate the next run time for a scheduled prompt.
    Returns ISO timestamp string in UTC.
    
    TIMEZONE HANDLING:
    - timeOfDay is in the user's local timezone (stored in prompt["timezone"])
    - We convert to UTC for storage and comparison
    - If timezone is not set, we assume UTC (for backwards compatibility)
    """
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    time_parts = prompt.get("timeOfDay", "09:00").split(":")
    hour = int(time_parts[0])
    minute = int(time_parts[1]) if len(time_parts) > 1 else 0
    
    # Get the user's timezone (default to UTC for backwards compatibility)
    user_timezone = prompt.get("timezone", "UTC")
    
    # Calculate the UTC offset for the user's timezone
    # Negative offset means west of UTC (e.g., PST is -8)
    offset_hours = get_timezone_offset_hours(user_timezone, now)
    
    # Convert user's local time to UTC
    # If user wants 08:45 PST (-8), that's 08:45 + 8 = 16:45 UTC
    utc_hour = hour - int(offset_hours)  # Subtract because offset is already signed
    utc_minute = minute - int((offset_hours % 1) * 60)
    
    # Handle minute overflow/underflow
    if utc_minute < 0:
        utc_minute += 60
        utc_hour -= 1
    elif utc_minute >= 60:
        utc_minute -= 60
        utc_hour += 1
    
    # Handle hour overflow/underflow (day boundary)
    day_offset = 0
    if utc_hour < 0:
        utc_hour += 24
        day_offset = -1
    elif utc_hour >= 24:
        utc_hour -= 24
        day_offset = 1
    
    # Start with today at the calculated UTC time
    next_run = now.replace(hour=utc_hour, minute=utc_minute, second=0, microsecond=0)
    
    # Apply day offset from timezone conversion
    if day_offset != 0:
        next_run += timedelta(days=day_offset)
    
    schedule_type = prompt.get("scheduleType", "daily")
    
    if schedule_type == "daily":
        if next_run <= now:
            next_run += timedelta(days=1)
    
    elif schedule_type == "weekly":
        target_day = prompt.get("dayOfWeek", 1)  # Default Monday
        current_day = next_run.weekday()
        # Convert to 0=Sunday format (prompt uses 0=Sunday)
        current_day_sun = (current_day + 1) % 7
        days_until = (target_day - current_day_sun) % 7
        if days_until == 0 and next_run <= now:
            days_until = 7
        next_run += timedelta(days=days_until)
    
    elif schedule_type == "monthly":
        target_day = prompt.get("dayOfMonth", 1)
        next_run = next_run.replace(day=target_day)
        if next_run <= now:
            # Move to next month
            if next_run.month == 12:
                next_run = next_run.replace(year=next_run.year + 1, month=1)
            else:
                next_run = next_run.replace(month=next_run.month + 1)
    
    elif schedule_type == "yearly":
        next_run = next_run.replace(month=1, day=1)
        if next_run <= now:
            next_run = next_run.replace(year=next_run.year + 1)
    
    return next_run.isoformat()


def is_prompt_due(prompt: dict[str, Any], now: datetime) -> bool:
    """
    Check if a scheduled prompt is due to run.
    
    A prompt is due if:
    1. It's enabled
    2. nextRunAt is set and is in the past (relative to UTC now)
    """
    if not prompt.get("enabled", False):
        return False
    
    next_run_at = prompt.get("nextRunAt")
    if not next_run_at:
        return False
    
    try:
        next_run = datetime.fromisoformat(next_run_at.replace("Z", "+00:00"))
        is_due = next_run <= now
        
        # Debug logging
        prompt_id = prompt.get("id", "unknown")[:8]
        time_of_day = prompt.get("timeOfDay", "??:??")
        user_tz = prompt.get("timezone", "UTC")
        print(f"  [{prompt_id}] Checking if due:")
        print(f"    timeOfDay: {time_of_day} in {user_tz}")
        print(f"    nextRunAt: {next_run_at}")
        print(f"    now (UTC): {now.isoformat()}")
        print(f"    is_due: {is_due}")
        
        return is_due
    except (ValueError, TypeError) as e:
        print(f"  Error parsing nextRunAt '{next_run_at}': {e}")
        return False


@app.function(
    schedule=modal.Cron("*/30 * * * *"),  # Every 30 minutes
    image=image,
    volumes={
        "/root/.claude": volume,
        "/repos": repos_volume,
    },
    secrets=[
        modal.Secret.from_name("ANTHROPIC_API_KEY"),
        modal.Secret.from_name("GITHUB_TOKEN"),
    ],
    timeout=600,
)
def check_scheduled_prompts():
    """
    Cron job that runs every 30 minutes to check for due scheduled prompts.
    When a prompt is due, it executes it using the existing execute_prompt function.
    
    IMPORTANT: Notifications are sent directly in this function after execution,
    not delegated to execute_prompt. This ensures scheduled prompts always send
    notifications even if execute_prompt doesn't handle them properly.
    """
    import requests
    
    print("=" * 60)
    print("=== Scheduled Prompts Cron Check ===")
    print(f"Time (UTC): {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    
    # Get prompts and settings from Modal Dict
    try:
        prompts = scheduled_prompts_dict.get("prompts", [])
        settings = scheduled_prompts_dict.get("settings", {})
        print(f"Retrieved from Modal Dict:")
        print(f"  - Prompts count: {len(prompts)}")
        print(f"  - Settings: {settings}")
    except Exception as e:
        print(f"CRITICAL: Failed to read scheduled prompts dict: {e}")
        return {"checked": 0, "executed": 0, "error": str(e)}
    
    if not prompts:
        print("No scheduled prompts configured - nothing to do")
        return {"checked": 0, "executed": 0}
    
    # Get ntfy topic for notifications
    ntfy_topic = settings.get("ntfyTopic") if settings else None
    print(f"Notification settings:")
    print(f"  - ntfy topic: '{ntfy_topic or '(not configured)'}'")
    
    now = datetime.now(timezone.utc)
    executed = []
    errors = []
    
    print(f"\nChecking {len(prompts)} scheduled prompts...")
    print("-" * 40)
    
    for prompt in prompts:
        prompt_id = prompt.get("id", "unknown")
        prompt_preview = prompt.get("prompt", "")[:40] + "..." if len(prompt.get("prompt", "")) > 40 else prompt.get("prompt", "")
        
        print(f"\n[{prompt_id[:8]}] '{prompt_preview}'")
        
        if not prompt.get("enabled", False):
            print(f"  -> SKIP: Disabled")
            continue
        
        if not is_prompt_due(prompt, now):
            next_run = prompt.get("nextRunAt", "unknown")
            print(f"  -> SKIP: Not due (next run: {next_run})")
            continue
        
        print(f"  -> DUE: Executing now...")
        
        # Get project info
        project_path = prompt.get("projectPath")
        git_remote_url = prompt.get("gitRemoteUrl")
        project_name = prompt.get("projectName")
        prompt_timezone = prompt.get("timezone", "UTC")
        
        print(f"     Project: {project_name}")
        print(f"     Timezone: {prompt_timezone}")
        print(f"     Git URL: {git_remote_url[:50]}..." if git_remote_url and len(git_remote_url) > 50 else f"     Git URL: {git_remote_url}")
        
        if not git_remote_url or not project_name:
            error_msg = f"Missing gitRemoteUrl or projectName for prompt {prompt_id}"
            print(f"  -> ERROR: {error_msg}")
            errors.append({"promptId": prompt_id, "error": error_msg})
            
            # Send error notification
            if ntfy_topic:
                try:
                    _send_ntfy_notification(
                        ntfy_topic,
                        title=f"⚠️ Scheduled Prompt Failed: {prompt_preview}",
                        message=f"Error: {error_msg}",
                        priority="high",
                    )
                    print(f"     Sent error notification to ntfy")
                except Exception as notify_err:
                    print(f"     Failed to send error notification: {notify_err}")
            
            continue
        
        try:
            # Execute the prompt using existing function
            # Note: We pass ntfy_topic here too, but also send notification manually
            # below to ensure it gets sent even if execute_prompt has issues
            result = execute_prompt.remote(
                prompt=prompt.get("prompt", ""),
                project_repo=git_remote_url,
                project_name=project_name,
                session_id=None,  # Always new session for scheduled prompts
                allowed_tools=None,  # Use defaults
                notification_webhook=None,
                ntfy_topic=ntfy_topic,  # Pass ntfy topic for execute_prompt notifications
            )
            
            session_id = result.get('sessionId', 'unknown')
            success = result.get("success", False)
            
            print(f"  -> COMPLETED: session={session_id[:8]}, success={success}")
            executed.append({
                "promptId": prompt_id,
                "sessionId": session_id,
                "success": success,
            })
            
            # Update lastExecution and nextRunAt in the prompt
            prompt["lastExecution"] = {
                "timestamp": now.isoformat(),
                "status": "success" if success else "failed",
                "sessionId": session_id,
            }
            prompt["nextRunAt"] = calculate_next_run_at(prompt)
            
            # Send completion notification (backup notification in case execute_prompt didn't send one)
            # This ensures scheduled prompts ALWAYS notify, regardless of execute_prompt behavior
            if ntfy_topic and not result.get("_ntfy_sent"):  # Only if execute_prompt didn't already send
                try:
                    status_emoji = "✅" if success else "❌"
                    _send_ntfy_notification(
                        ntfy_topic,
                        title=f"{status_emoji} Scheduled: {project_name}",
                        message=f"Prompt: {prompt_preview}\nSession: {session_id[:8]}",
                        priority="default" if success else "high",
                    )
                    print(f"     Sent completion notification to ntfy")
                except Exception as notify_err:
                    print(f"     Failed to send completion notification: {notify_err}")
            
        except Exception as e:
            error_msg = str(e)
            print(f"  -> ERROR: {error_msg}")
            errors.append({"promptId": prompt_id, "error": error_msg})
            
            # Update lastExecution with error
            prompt["lastExecution"] = {
                "timestamp": now.isoformat(),
                "status": "failed",
                "error": error_msg,
            }
            prompt["nextRunAt"] = calculate_next_run_at(prompt)
            
            # Send error notification
            if ntfy_topic:
                try:
                    _send_ntfy_notification(
                        ntfy_topic,
                        title=f"❌ Scheduled Failed: {project_name or 'Unknown'}",
                        message=f"Error: {error_msg[:200]}",
                        priority="high",
                    )
                    print(f"     Sent error notification to ntfy")
                except Exception as notify_err:
                    print(f"     Failed to send error notification: {notify_err}")
    
    print("\n" + "-" * 40)
    
    # Save updated prompts back to Dict
    try:
        scheduled_prompts_dict["prompts"] = prompts
        print(f"Saved updated prompts to Modal Dict")
    except Exception as e:
        print(f"WARNING: Failed to save updated prompts: {e}")
    
    # Commit volumes
    volume.commit()
    repos_volume.commit()
    
    summary = {
        "checked": len(prompts),
        "executed": len(executed),
        "errors": len(errors),
        "timestamp": now.isoformat(),
        "ntfy_configured": bool(ntfy_topic),
    }
    print(f"\n=== Cron Check Complete ===")
    print(f"Summary: {summary}")
    print("=" * 60)
    
    return summary


def _send_ntfy_notification(topic: str, title: str, message: str, priority: str = "default") -> None:
    """
    Helper to send ntfy notification.
    Raises exception on failure for caller to handle.
    """
    import requests
    
    ntfy_url = f"https://ntfy.sh/{topic}"
    response = requests.post(
        ntfy_url,
        data=message.encode("utf-8"),
        headers={
            "Title": title,
            "Priority": priority,
            "Tags": "robot",
        },
        timeout=10,
    )
    if response.status_code != 200:
        raise Exception(f"ntfy returned status {response.status_code}: {response.text}")


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
def list_projects() -> list[dict[str, Any]]:
    """
    List all projects that have Claude sessions.

    Returns:
        List of project objects with path, name, encodedPath, sessionCount, etc.
    """
    reload_volume_if_needed(volume)  # Rate-limited reload

    claude_dir = Path("/root/.claude/projects")
    projects = []

    if not claude_dir.exists():
        return projects

    for project_dir in claude_dir.iterdir():
        if not project_dir.is_dir():
            continue

        # Decode the project path
        encoded_path = project_dir.name

        # Count sessions
        sessions = list(project_dir.glob("*.jsonl"))
        if not sessions:
            continue

        # Find the most recent session
        most_recent = None
        most_recent_time = None

        for session_file in sessions:
            summary = get_session_summary(session_file)
            if summary and summary.get("lastActivityAt"):
                if most_recent_time is None or summary["lastActivityAt"] > most_recent_time:
                    most_recent = summary
                    most_recent_time = summary["lastActivityAt"]

        projects.append({
            "path": f"/cloud/{encoded_path}",  # Virtual path for cloud sessions
            "name": encoded_path.replace("-", "/").split("/")[-1] or encoded_path,
            "encodedPath": f"cloud-{encoded_path}",  # Prefix with cloud- to distinguish
            "sessionCount": len(sessions),
            "lastSessionId": most_recent["id"] if most_recent else None,
            "lastActivityAt": most_recent_time,
        })

    # Sort by most recent activity
    projects.sort(key=lambda p: p.get("lastActivityAt") or "", reverse=True)

    return projects


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
def get_sessions(encoded_path: str) -> list[dict[str, Any]]:
    """
    List all sessions for a project.

    Args:
        encoded_path: The encoded project path (with cloud- prefix)

    Returns:
        List of session summary objects
    """
    reload_volume_if_needed(volume)  # Rate-limited reload

    # Remove cloud- prefix if present
    if encoded_path.startswith("cloud-"):
        encoded_path = encoded_path[6:]

    project_dir = Path(f"/root/.claude/projects/{encoded_path}")
    sessions = []

    if not project_dir.exists():
        return sessions

    for session_file in project_dir.glob("*.jsonl"):
        summary = get_session_summary(session_file)
        if summary:
            sessions.append(summary)

    # Sort by most recent activity
    sessions.sort(key=lambda s: s.get("lastActivityAt") or "", reverse=True)

    return sessions


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("GITHUB_TOKEN")],
    timeout=120,
)
def fetch_repo_tree(repo_url: str, branch: str | None = None) -> dict[str, Any]:
    """
    Clone a git repo and return its file tree.
    Supports private repos if GITHUB_TOKEN secret is configured.

    Args:
        repo_url: Git repository URL (HTTPS or SSH)
        branch: Optional branch name (defaults to main/master)

    Returns:
        dict with 'entries' (list of tree entries) or 'error'
    """
    import tempfile
    import shutil

    # Try to get GitHub token from environment
    # To use: modal secret create GITHUB_TOKEN GITHUB_TOKEN=your_pat_here
    # Then add it to the function decorator when available
    github_token = os.environ.get("GITHUB_TOKEN")
    print(f"GitHub token available: {bool(github_token)}")

    # Prepare the URL with auth if token is available and it's a GitHub HTTPS URL
    clone_url = repo_url
    if github_token and "github.com" in repo_url and repo_url.startswith("https://"):
        # Insert token into HTTPS URL: https://TOKEN@github.com/...
        clone_url = repo_url.replace("https://github.com", f"https://{github_token}@github.com")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            work_dir = Path(tmpdir) / "repo"

            # Clone with depth=1 for speed
            clone_cmd = ["git", "clone", "--depth=1"]
            if branch:
                clone_cmd.extend(["-b", branch])
            clone_cmd.extend([clone_url, str(work_dir)])

            result = subprocess.run(
                clone_cmd,
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode != 0:
                error_msg = result.stderr or "Failed to clone repository"
                # Don't expose token in error
                error_msg = error_msg.replace(github_token, "***") if github_token else error_msg
                return {"error": error_msg, "entries": []}

            # Get the current branch name
            branch_result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=str(work_dir),
                capture_output=True,
                text=True,
            )
            current_branch = branch_result.stdout.strip() if branch_result.returncode == 0 else "main"

            # Build file tree recursively
            entries = []
            for item in sorted(work_dir.rglob("*")):
                # Skip .git directory
                if ".git" in item.parts:
                    continue

                rel_path = item.relative_to(work_dir)
                name = item.name
                is_dir = item.is_dir()

                entry = {
                    "name": name,
                    "path": str(rel_path),
                    "type": "directory" if is_dir else "file",
                    "extension": None if is_dir else (item.suffix[1:] if item.suffix else None),
                }
                entries.append(entry)

            return {
                "entries": entries,
                "branch": current_branch,
                "githubUrl": repo_url if "github.com" in repo_url else None,
            }

    except subprocess.TimeoutExpired:
        return {"error": "Clone timed out - repository may be too large", "entries": []}
    except Exception as e:
        return {"error": str(e), "entries": []}


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("GITHUB_TOKEN")],
    timeout=120,
)
def fetch_file_content(repo_url: str, file_path: str, branch: str | None = None) -> dict[str, Any]:
    """
    Clone a git repo and return content of a specific file.
    Supports private repos if GITHUB_TOKEN secret is configured.

    Args:
        repo_url: Git repository URL (HTTPS or SSH)
        file_path: Path to file within the repo
        branch: Optional branch name (defaults to main/master)

    Returns:
        dict with 'content', 'language', etc. or 'error'
    """
    import tempfile
    import mimetypes

    # Get GitHub token from environment if available
    github_token = os.environ.get("GITHUB_TOKEN")

    # Prepare the URL with auth if token is available
    clone_url = repo_url
    if github_token and "github.com" in repo_url and repo_url.startswith("https://"):
        clone_url = repo_url.replace("https://github.com", f"https://{github_token}@github.com")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            work_dir = Path(tmpdir) / "repo"

            # Clone with depth=1 for speed
            clone_cmd = ["git", "clone", "--depth=1"]
            if branch:
                clone_cmd.extend(["-b", branch])
            clone_cmd.extend([clone_url, str(work_dir)])

            result = subprocess.run(
                clone_cmd,
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode != 0:
                error_msg = result.stderr or "Failed to clone repository"
                error_msg = error_msg.replace(github_token, "***") if github_token else error_msg
                return {"error": error_msg}

            # Read the file
            target_file = work_dir / file_path
            if not target_file.exists():
                return {"error": f"File not found: {file_path}"}

            if not target_file.is_file():
                return {"error": f"Not a file: {file_path}"}

            # Check file size (limit to 1MB)
            file_size = target_file.stat().st_size
            if file_size > 1024 * 1024:
                return {"error": f"File too large: {file_size} bytes (max 1MB)"}

            # Try to read as text
            try:
                content = target_file.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                return {"error": "Binary file - cannot display"}

            # Determine language from extension
            ext = target_file.suffix.lower()
            language_map = {
                ".py": "python",
                ".js": "javascript",
                ".jsx": "javascript",
                ".ts": "typescript",
                ".tsx": "typescript",
                ".json": "json",
                ".md": "markdown",
                ".html": "html",
                ".css": "css",
                ".scss": "scss",
                ".yaml": "yaml",
                ".yml": "yaml",
                ".sh": "bash",
                ".bash": "bash",
                ".zsh": "bash",
                ".go": "go",
                ".rs": "rust",
                ".java": "java",
                ".c": "c",
                ".cpp": "cpp",
                ".h": "c",
                ".hpp": "cpp",
                ".rb": "ruby",
                ".php": "php",
                ".swift": "swift",
                ".kt": "kotlin",
                ".sql": "sql",
                ".graphql": "graphql",
                ".vue": "vue",
                ".svelte": "svelte",
            }
            language = language_map.get(ext, "text")

            return {
                "path": file_path,
                "content": content,
                "language": language,
                "size": file_size,
                "githubUrl": f"{repo_url}/blob/main/{file_path}" if "github.com" in repo_url else None,
            }

    except subprocess.TimeoutExpired:
        return {"error": "Clone timed out"}
    except Exception as e:
        return {"error": str(e)}


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
def get_messages(session_id: str, encoded_path: str) -> dict[str, Any]:
    """
    Get all messages for a session.

    Args:
        session_id: The session UUID
        encoded_path: The encoded project path

    Returns:
        Object with messages array and status
    """
    reload_volume_if_needed(volume)  # Rate-limited reload

    # Remove cloud- prefix if present
    if encoded_path.startswith("cloud-"):
        encoded_path = encoded_path[6:]

    session_file = Path(f"/root/.claude/projects/{encoded_path}/{session_id}.jsonl")

    if not session_file.exists():
        return {"messages": [], "status": "idle"}

    entries = parse_jsonl_file(session_file)
    messages = transform_to_messages(entries, session_id)

    # Determine status based on last entry
    status = "idle"
    if entries:
        last_entry = entries[-1]
        if last_entry.get("type") == "assistant":
            # Check if it looks like Claude is still working
            content = last_entry.get("message", {}).get("content", "")
            if isinstance(content, list):
                for block in content:
                    if block.get("type") == "tool_use":
                        status = "working"
                        break

    return {"messages": messages, "status": status}


@app.function(
    image=image,
    volumes={"/root/.claude": volume},
)
def get_context_summary(session_id: str, encoded_path: str) -> dict[str, Any] | None:
    """
    Generate a context summary for a session (for cross-environment continuation).

    Args:
        session_id: The session UUID
        encoded_path: The encoded project path

    Returns:
        Context summary dict or None if session not found
    """
    reload_volume_if_needed(volume)  # Rate-limited reload

    # Remove cloud- prefix if present
    if encoded_path.startswith("cloud-"):
        encoded_path = encoded_path[6:]

    session_file = Path(f"/root/.claude/projects/{encoded_path}/{session_id}.jsonl")

    if not session_file.exists():
        return None

    entries = parse_jsonl_file(session_file)
    messages = transform_to_messages(entries, session_id)

    if not messages:
        return None

    # Generate summary
    project_name = encoded_path.replace("-", "/").split("/")[-1] or encoded_path

    # Get first and last timestamps
    first_timestamp = None
    last_timestamp = None
    for msg in messages:
        ts = msg.get("timestamp")
        if ts:
            if first_timestamp is None:
                first_timestamp = ts
            last_timestamp = ts

    # Build summary text
    parts = [
        "=== CONTEXT FROM PREVIOUS SESSION ===",
        f"Project: {project_name}",
        f"Source: Cloud (Modal)",
        f"Session: {session_id[:8]}...",
        f"Messages: {len(messages)}",
        "",
        "--- Summary ---",
    ]

    # High-level summary
    user_messages = [m for m in messages if m.get("type") == "user"]
    assistant_messages = [m for m in messages if m.get("type") == "assistant"]

    if user_messages:
        first_user = user_messages[0].get("content", "")[:200]
        parts.append(f"Topic: {first_user}")
    parts.append(f"Message counts: {len(user_messages)} user, {len(assistant_messages)} assistant")

    # Count tool uses
    all_tools = []
    for msg in assistant_messages:
        for tool in msg.get("toolUse", []):
            all_tools.append(tool.get("tool", "unknown"))
    if all_tools:
        tool_counts = {}
        for t in all_tools:
            tool_counts[t] = tool_counts.get(t, 0) + 1
        tool_summary = ", ".join(f"{t}({c})" for t, c in tool_counts.items())
        parts.append(f"Tools used: {tool_summary}")

    parts.extend(["", "--- Recent Messages ---"])

    # Last 10 messages
    max_messages = 10
    recent = messages[-max_messages:]
    for i, msg in enumerate(recent):
        global_idx = len(messages) - max_messages + i
        role = "User" if msg.get("type") == "user" else "Assistant"
        content = msg.get("content", "")[:500]
        parts.append(f"[{global_idx + 1}] {role}:")
        parts.append(content)
        parts.append("")

    parts.extend([
        "=== END PREVIOUS CONTEXT ===",
        "",
        "Please continue from where this session left off.",
    ])

    summary_text = "\n".join(parts)

    return {
        "sessionId": session_id,
        "source": "cloud",
        "projectPath": f"/cloud/{encoded_path}",
        "projectName": project_name,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summaryText": summary_text,
        "messageCount": len(messages),
        "startedAt": first_timestamp,
        "lastActivityAt": last_timestamp,
    }


# =============================================================================
# FastAPI Web App (Single App for All Routes)
# =============================================================================

web_app = FastAPI(title="GoGoGadgetClaude Cloud API")

# Add CORS middleware for browser access
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImageAttachment(BaseModel):
    filename: str
    mimeType: str
    base64: str


class DispatchJobRequest(BaseModel):
    prompt: str
    repoUrl: str
    projectName: str
    sessionId: str | None = None  # Existing session to continue
    allowedTools: list[str] | None = None
    notificationWebhook: str | None = None
    ntfyTopic: str | None = None  # ntfy topic for push notifications
    imageAttachment: ImageAttachment | None = None  # Optional image attachment


@web_app.get("/api/status")
async def api_status():
    """Health check / status endpoint."""
    return {
        "data": {
            "healthy": True,
            "service": "gogogadget-claude-cloud",
            "mode": "cloud",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


@web_app.get("/api/projects")
async def api_list_projects():
    """List all cloud projects."""
    projects = list_projects.remote()
    return {"data": projects}


@web_app.get("/api/projects/{encoded_path}/sessions")
async def api_get_sessions(encoded_path: str):
    """List sessions for a project."""
    sessions = get_sessions.remote(encoded_path)
    return {"data": sessions}


@web_app.get("/api/sessions/{session_id}/context-summary")
async def api_get_context_summary(session_id: str, encoded_path: str = ""):
    """
    Get context summary for a session (for cross-environment continuation).

    Query params:
        - encoded_path: The encoded project path (optional, will search if not provided)
        - source: 'local' | 'cloud' (ignored - always returns cloud for this endpoint)
    """
    if not encoded_path:
        # Search all projects for the session
        reload_volume_if_needed(volume)
        base_path = Path("/root/.claude/projects")
        if base_path.exists():
            for project_dir in base_path.iterdir():
                if project_dir.is_dir():
                    session_file = project_dir / f"{session_id}.jsonl"
                    if session_file.exists():
                        encoded_path = project_dir.name
                        break

    if not encoded_path:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Session not found"}})

    summary = get_context_summary.remote(session_id, encoded_path)
    if not summary:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Session not found or empty"}})

    return {"data": summary}


@web_app.get("/api/sessions/{session_id}/messages")
async def api_get_messages(
    session_id: str,
    encoded_path: str = Query(None, alias="projectPath"),
):
    """Get messages for a session."""
    # If no projectPath provided, search all projects for this session
    if not encoded_path:
        reload_volume_if_needed(volume)
        claude_dir = Path("/root/.claude/projects")
        if claude_dir.exists():
            for project_dir in claude_dir.iterdir():
                if project_dir.is_dir():
                    session_file = project_dir / f"{session_id}.jsonl"
                    if session_file.exists():
                        encoded_path = project_dir.name
                        break
    
    if not encoded_path:
        return {"data": {"messages": [], "summary": None}}
    
    result = get_messages.remote(session_id, encoded_path)
    return {"data": result}


@web_app.post("/api/cloud/jobs")
async def api_dispatch_job(request: DispatchJobRequest):
    """Dispatch a new cloud job."""
    if not request.prompt or not request.repoUrl or not request.projectName:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Missing required fields: prompt, repoUrl, projectName",
                }
            },
        )

    # Spawn the execution as an async job
    job = execute_prompt.spawn(
        prompt=request.prompt,
        project_repo=request.repoUrl,
        project_name=request.projectName,
        session_id=request.sessionId,
        allowed_tools=request.allowedTools,
        notification_webhook=request.notificationWebhook,
        ntfy_topic=request.ntfyTopic,
        image_attachment=request.imageAttachment.model_dump() if request.imageAttachment else None,
    )

    return {
        "data": {
            "jobId": job.object_id,
            "status": "queued",
        }
    }


@web_app.get("/api/cloud/jobs/{job_id}")
async def api_get_job_status(job_id: str):
    """Check the status of a cloud job."""
    try:
        from modal.functions import FunctionCall
        
        fc = FunctionCall.from_id(job_id)
        
        try:
            # Try to get result (non-blocking check)
            result = fc.get(timeout=0.1)
            return {
                "data": {
                    "jobId": job_id,
                    "status": "completed",
                    "result": result,
                }
            }
        except TimeoutError:
            # Job still running
            return {
                "data": {
                    "jobId": job_id,
                    "status": "running",
                }
            }
    except Exception as e:
        return {
            "data": {
                "jobId": job_id,
                "status": "unknown",
                "error": str(e),
            }
        }


@web_app.get("/api/settings")
async def api_get_settings():
    """Return empty settings (cloud doesn't store settings)."""
    return {
        "data": {
            "notificationsEnabled": False,
            "defaultTemplates": [],
            "theme": "system",
        }
    }


class CheckChangesRequest(BaseModel):
    projectName: str


class PushChangesRequest(BaseModel):
    projectName: str
    repoUrl: str


@web_app.post("/api/cloud/changes")
async def api_check_changes(request: CheckChangesRequest):
    """
    Check for pending git changes in a project's repo.
    Returns uncommitted changes and unpushed commits.
    """
    result = check_repo_changes.remote(request.projectName)
    return {"data": result}


@web_app.post("/api/cloud/push")
async def api_push_changes(request: PushChangesRequest):
    """
    Explicitly push pending changes to GitHub.
    This is the ONLY way changes get pushed - no auto-push.
    """
    result = push_repo_changes.remote(request.projectName, request.repoUrl)
    return {"data": result}


@web_app.get("/api/cloud/sessions")
async def api_get_cloud_sessions(projectPath: str = Query(None)):
    """
    List cloud sessions from Modal volume.
    Claude Code stores sessions in ~/.claude/projects/[encoded-path]/[session-id].jsonl
    """
    try:
        # Refresh volume to see latest sessions (with rate limiting)
        reload_volume_if_needed(volume)
        
        claude_dir = Path("/root/.claude/projects")
        if not claude_dir.exists():
            return {"data": {"sessions": [], "available": True, "count": 0}}
        
        sessions = []
        
        # List all project directories
        for project_dir in claude_dir.iterdir():
            if not project_dir.is_dir():
                continue
            
            # Filter by project path if provided
            if projectPath:
                # Encode the project path the same way Claude Code does
                encoded = projectPath.replace("/", "-")
                if project_dir.name != encoded:
                    continue
            
            # Find all session files
            for session_file in project_dir.glob("*.jsonl"):
                summary = get_session_summary(session_file)
                if summary:
                    # Add cloud-specific fields
                    summary["source"] = "cloud"
                    summary["projectPath"] = projectPath or project_dir.name
                    summary["status"] = "completed"
                    sessions.append(summary)
        
        # Sort by most recent activity
        sessions.sort(key=lambda s: s.get("lastActivityAt", ""), reverse=True)
        
        return {
            "data": {
                "sessions": sessions,
                "available": True,
                "count": len(sessions),
            }
        }
    except Exception as e:
        print(f"Error listing cloud sessions: {e}")
        return {"data": {"sessions": [], "available": False, "count": 0, "message": str(e)}}


@web_app.get("/api/projects/{encoded_path}/templates")
async def api_get_templates(encoded_path: str):
    """
    Return default vibe-coding-prompts templates.
    In cloud mode, we don't have access to project-specific templates,
    so we always return the defaults.
    """
    return {"data": DEFAULT_TEMPLATES}


@web_app.get("/api/projects/{encoded_path}/files")
async def api_get_files(encoded_path: str):
    """Return empty files list (cloud uses tree endpoint instead)."""
    return {"data": []}


@web_app.post("/api/sessions/new")
async def api_create_session(request: Request):
    """
    Create a new session - in cloud mode, redirect to cloud/jobs.
    """
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        project_path = body.get("projectPath", "")
        
        if not prompt or not project_path:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "VALIDATION_ERROR", "message": "Missing prompt or projectPath"}}
            )
        
        # For cloud mode, we need the repo URL - return an error asking to use cloud/jobs
        return {
            "data": {
                "error": "Use /api/cloud/jobs for cloud execution with repoUrl",
                "requiresCloudJob": True,
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_REQUEST", "message": str(e)}}
        )


@web_app.post("/api/transcribe")
async def api_transcribe(request: Request):
    """
    Transcribe audio using Groq Whisper API.
    Requires GROQ_API_KEY secret to be configured in Modal.
    """
    import httpx

    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "MISSING_API_KEY", "message": "GROQ_API_KEY not configured"}},
        )

    # Parse multipart form data
    form = await request.form()
    audio_file = form.get("audio")

    if not audio_file:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "MISSING_AUDIO", "message": "No audio file provided"}},
        )

    # Read the audio content
    audio_content = await audio_file.read()

    # Send to Groq Whisper API
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {
                "file": (audio_file.filename or "audio.webm", audio_content, audio_file.content_type or "audio/webm"),
            }
            data = {
                "model": "whisper-large-v3",
                "response_format": "json",
            }

            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {groq_api_key}"},
                files=files,
                data=data,
            )

            if response.status_code != 200:
                error_detail = response.text
                raise HTTPException(
                    status_code=response.status_code,
                    detail={"error": {"code": "GROQ_API_ERROR", "message": f"Groq API error: {error_detail}"}},
                )

            result = response.json()
            text = result.get("text", "").strip()

            return {
                "data": {
                    "text": text,
                    "empty": len(text) == 0,
                }
            }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail={"error": {"code": "TIMEOUT", "message": "Transcription request timed out"}},
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is (don't wrap them)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "TRANSCRIPTION_ERROR", "message": str(e)}},
        )


class FetchTreeRequest(BaseModel):
    repoUrl: str
    branch: str | None = None


class FetchContentRequest(BaseModel):
    repoUrl: str
    filePath: str
    branch: str | None = None


@web_app.post("/api/cloud/content")
async def api_fetch_content(request: FetchContentRequest):
    """
    Fetch file content from a git repository.
    Works with private repos if GITHUB_TOKEN secret is configured.
    """
    result = fetch_file_content.remote(request.repoUrl, request.filePath, request.branch)
    if result.get("error"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "FETCH_ERROR", "message": result["error"]}},
        )
    return {"data": result}


@web_app.post("/api/cloud/tree")
async def api_fetch_tree(request: FetchTreeRequest):
    """
    Fetch file tree from a git repository.
    Works with private repos if GITHUB_TOKEN secret is configured.
    """
    result = fetch_repo_tree.remote(request.repoUrl, request.branch)
    if result.get("error"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "FETCH_ERROR", "message": result["error"]}},
        )
    return {"data": result}


class SyncScheduledPromptsRequest(BaseModel):
    prompts: list[dict[str, Any]]
    settings: dict[str, Any] | None = None


@web_app.get("/api/scheduled-prompts")
async def api_get_scheduled_prompts():
    """Return scheduled prompts from Modal Dict."""
    try:
        prompts = scheduled_prompts_dict.get("prompts", [])
        return {"data": prompts}
    except Exception as e:
        return {"data": [], "error": str(e)}


@web_app.post("/api/scheduled-prompts/sync")
async def api_sync_scheduled_prompts(request: SyncScheduledPromptsRequest):
    """
    Sync scheduled prompts from local server to Modal.
    Called whenever prompts are created, updated, or deleted locally.
    
    IMPORTANT: This always updates both prompts AND settings to ensure
    the cloud has the latest configuration.
    """
    try:
        # Store prompts in Modal Dict
        scheduled_prompts_dict["prompts"] = request.prompts
        
        # ALWAYS store settings (even if empty) to ensure cloud has latest config
        # This prevents stale settings from persisting
        settings = request.settings or {}
        scheduled_prompts_dict["settings"] = settings
        
        # Log for debugging
        prompt_ids = [p.get("id", "?")[:8] for p in request.prompts]
        ntfy_topic = settings.get("ntfyTopic", "(not set)")
        print(f"=" * 50)
        print(f"Synced scheduled prompts from local:")
        print(f"  - Prompt count: {len(request.prompts)}")
        print(f"  - Prompt IDs: {prompt_ids}")
        print(f"  - ntfy topic: {ntfy_topic}")
        print(f"  - Timestamp: {datetime.now(timezone.utc).isoformat()}")
        print(f"=" * 50)
        
        return {
            "data": {
                "synced": len(request.prompts),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "ntfyConfigured": bool(settings.get("ntfyTopic")),
            }
        }
    except Exception as e:
        print(f"CRITICAL: Failed to sync scheduled prompts: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "SYNC_ERROR", "message": str(e)}},
        )


# Mount the FastAPI app as a Modal web endpoint
@app.function(
    image=image,
    volumes={"/root/.claude": volume},
    secrets=[
        modal.Secret.from_name("ANTHROPIC_API_KEY"),
        modal.Secret.from_name("GROQ_API_KEY"),
    ],
    # Keep container warm to reduce cold start latency
    # This keeps at least 1 container ready to serve requests
    min_containers=1,
)
@modal.asgi_app()
def fastapi_app():
    """Serve the FastAPI app."""
    return web_app


# =============================================================================
# Local Development Entry Point
# =============================================================================

if __name__ == "__main__":
    print("GoGoGadgetClaude Modal App")
    print("==========================")
    print()
    print("Available functions:")
    print("  - execute_prompt: Run a Claude prompt on a git repo")
    print("  - list_projects: List all projects with sessions")
    print("  - get_sessions: List sessions for a project")
    print("  - get_messages: Get messages for a session")
    print()
    print("Web API (single endpoint):")
    print("  https://[workspace]--gogogadget-claude-fastapi-app.modal.run")
    print()
    print("  GET  /api/status - Health check")
    print("  GET  /api/projects - List projects")
    print("  GET  /api/projects/{path}/sessions - List sessions")
    print("  GET  /api/sessions/{id}/messages - Get messages")
    print("  POST /api/cloud/jobs - Dispatch a job")
    print()
    print("To deploy: modal deploy modal/modal_app.py")
    print("To serve locally: modal serve modal/modal_app.py")
