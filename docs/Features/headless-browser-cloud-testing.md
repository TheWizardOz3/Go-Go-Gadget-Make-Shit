# Feature: Headless Browser Testing in Cloud Mode

> **Status**: 🚧 Planning  
> **Started**: 2026-01-22  
> **Completed**: —  
> **Milestone**: V1.6  
> **Feature Doc Version**: 1.0

---

## Overview

Enable Claude Code running in Modal cloud containers to test UI changes using a headless browser. This allows Claude to:
- Run development servers inside the container
- Navigate to localhost URLs with Playwright
- Inspect DOM structure (accessibility snapshots)
- Read console logs and network errors
- Interact with elements (click, type, etc.)
- Debug UI issues without the user needing to see anything

**One-Line Summary:** Give Claude Code full browser debugging capabilities in cloud mode, so it can iterate on frontend code independently.

## User Story

> As a developer using GoGoGadgetClaude in cloud mode, I want Claude to be able to test its UI changes by running a dev server and inspecting the browser, so it can debug and iterate on frontend code without my laptop being online or me needing to see the browser.

## Problem Statement

When Claude Code runs locally (e.g., in Cursor with browser MCP tools), it can:
1. Run `npm run dev` to start a dev server
2. Navigate to `localhost:3000` in a browser
3. Take DOM snapshots to see what rendered
4. Read console.log/error messages
5. Click buttons, fill forms, test interactions
6. Iterate based on visual/console feedback

In cloud mode (Modal), Claude Code runs in a container with:
- ❌ No browser available
- ❌ No way to visually test changes
- ❌ No console log access
- ❌ No DOM inspection

This means Claude in cloud mode can write code but can't test or debug frontend changes effectively.

## Business Value

- **User Impact:** Claude can fully develop and test frontend features without user involvement
- **Quality Impact:** Fewer bugs shipped because Claude can actually test its changes
- **Efficiency Impact:** No back-and-forth "try this → look at screenshot → fix" cycles
- **Parity Impact:** Cloud mode becomes as capable as local mode for frontend work

---

## Requirements

### Functional Requirements

| ID    | Requirement                                                       | Priority | Notes                                      |
|-------|-------------------------------------------------------------------|----------|--------------------------------------------|
| FR-1  | Claude can start dev servers (npm/pnpm run dev) in container      | MUST     | Support Vite, Next.js, Create React App    |
| FR-2  | Claude can navigate headless browser to localhost URLs            | MUST     | Playwright with Chromium                   |
| FR-3  | Claude can get DOM/accessibility snapshots                        | MUST     | Same format as browser_snapshot MCP tool   |
| FR-4  | Claude can read browser console messages                          | MUST     | console.log, console.error, console.warn   |
| FR-5  | Claude can read network request failures                          | SHOULD   | Failed fetches, 404s, CORS errors          |
| FR-6  | Claude can click elements by ref/selector                         | MUST     | Basic interaction capability               |
| FR-7  | Claude can type into input fields                                 | MUST     | Form filling capability                    |
| FR-8  | Claude can take screenshots (for its own vision, not user)        | SHOULD   | Debugging aid for Claude                   |
| FR-9  | Dev server auto-cleanup on prompt completion                      | MUST     | Don't leave orphan processes               |
| FR-10 | Browser tools work with --allowedTools permission system          | MUST     | Consistent with existing tools             |

### Non-Functional Requirements

| Requirement     | Target                                         | Measurement      |
|-----------------|------------------------------------------------|------------------|
| Container Size  | < 1.5 GB (current ~200MB + Chromium ~500MB)    | Image build      |
| Memory Usage    | < 2GB additional for browser                   | Modal metrics    |
| Startup Latency | < 10s for browser launch                       | Manual testing   |
| Cost Impact     | < $0.02/session additional                     | Modal billing    |

### Acceptance Criteria

- [ ] **Given** a React app prompt in cloud mode, **when** Claude writes a component and runs `npm run dev`, **then** it can navigate to localhost and see the DOM structure
- [ ] **Given** a console.error in the browser, **when** Claude calls browser_console, **then** it receives the error message
- [ ] **Given** a button on the page, **when** Claude calls browser_click with the element ref, **then** the button is clicked and state changes
- [ ] **Given** the prompt completes, **when** the container exits, **then** no orphan dev server or browser processes remain

### Out of Scope

- User-visible browser screenshots in mobile UI (Claude-only debugging)
- Real device testing (Safari, Firefox, mobile viewports)
- Video recording of browser sessions
- Browser DevTools Protocol exposure
- Persistent browser state across sessions

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Modal Container (Enhanced)                                             │
│                                                                         │
│  ┌──────────────────┐                                                   │
│  │  Claude Code     │                                                   │
│  │  (with browser   │                                                   │
│  │   MCP tools)     │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                             │
│           │ Tool calls                                                  │
│           ▼                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  Browser Service (Python)                                          ││
│  │  ┌─────────────────┐    ┌─────────────────────────────────────────┐││
│  │  │ Dev Server Mgr  │    │ Playwright Browser                      │││
│  │  │ - start/stop    │    │ - navigate(url)                         │││
│  │  │ - port tracking │    │ - snapshot() → accessibility tree       │││
│  │  │ - health check  │    │ - console_messages() → log array        │││
│  │  └─────────────────┘    │ - click(ref), type(ref, text)           │││
│  │                         │ - screenshot() → base64                  │││
│  └─────────────────────────┴─────────────────────────────────────────┘│
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  npm run dev (Vite/Next.js/CRA)  →  localhost:5173/3000          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Container Image Changes

```python
# modal_app.py - Updated image definition
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "curl", "ca-certificates", "wget", "gnupg")
    .run_commands(
        # Install Node.js 20
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        # Install Claude CLI
        "npm install -g @anthropic-ai/claude-code",
        # Install Playwright and Chromium
        "pip install playwright",
        "playwright install chromium",
        "playwright install-deps chromium",  # System dependencies
    )
    .pip_install("fastapi[standard]", "pydantic", "httpx", "requests", "playwright")
)
```

### Browser Service Module

New file: `modal/browser_service.py`

```python
"""
Browser service for headless browser testing in Modal containers.
Provides Playwright-based browser automation that Claude can use via tool calls.
"""

import asyncio
import subprocess
import time
from dataclasses import dataclass
from typing import Any
from playwright.async_api import async_playwright, Browser, Page

@dataclass
class DevServer:
    process: subprocess.Popen
    port: int
    url: str
    
class BrowserService:
    def __init__(self):
        self.browser: Browser | None = None
        self.page: Page | None = None
        self.dev_server: DevServer | None = None
        self.console_messages: list[dict] = []
        self.network_errors: list[dict] = []
    
    async def start_browser(self):
        """Launch headless Chromium."""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=True)
        self.page = await self.browser.new_page()
        
        # Capture console messages
        self.page.on("console", lambda msg: self.console_messages.append({
            "type": msg.type,
            "text": msg.text,
            "location": msg.location,
        }))
        
        # Capture network failures
        self.page.on("requestfailed", lambda req: self.network_errors.append({
            "url": req.url,
            "method": req.method,
            "failure": req.failure,
        }))
    
    def start_dev_server(self, cwd: str, command: str = "npm run dev", port: int = 5173):
        """Start a development server."""
        process = subprocess.Popen(
            command.split(),
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.dev_server = DevServer(process, port, f"http://localhost:{port}")
        
        # Wait for server to be ready
        for _ in range(30):  # 30 second timeout
            try:
                import urllib.request
                urllib.request.urlopen(self.dev_server.url, timeout=1)
                return True
            except:
                time.sleep(1)
        return False
    
    async def navigate(self, url: str) -> dict:
        """Navigate to URL and return page info."""
        await self.page.goto(url, wait_until="networkidle")
        return {"url": self.page.url, "title": await self.page.title()}
    
    async def snapshot(self) -> str:
        """Get accessibility tree snapshot (like browser_snapshot MCP tool)."""
        return await self.page.accessibility.snapshot()
    
    async def get_console_messages(self) -> list[dict]:
        """Return captured console messages."""
        return self.console_messages
    
    async def click(self, selector: str) -> dict:
        """Click an element."""
        await self.page.click(selector)
        return await self.snapshot()
    
    async def type_text(self, selector: str, text: str) -> dict:
        """Type text into an element."""
        await self.page.fill(selector, text)
        return await self.snapshot()
    
    async def screenshot(self) -> str:
        """Take screenshot, return base64."""
        import base64
        screenshot_bytes = await self.page.screenshot()
        return base64.b64encode(screenshot_bytes).decode()
    
    async def cleanup(self):
        """Clean up browser and dev server."""
        if self.page:
            await self.page.close()
        if self.browser:
            await self.browser.close()
        if self.dev_server:
            self.dev_server.process.terminate()
            self.dev_server.process.wait(timeout=5)
```

### Integration with execute_prompt

The browser tools will be available to Claude via the `--allowedTools` flag. Claude Code's tool system will route browser_* calls to our BrowserService.

**Option A: Direct Playwright in Container (Simpler)**
- Claude uses standard bash to run dev server
- Claude uses `playwright` CLI or Python script for browser ops
- Pro: No custom tool integration needed
- Con: Less structured, more error-prone

**Option B: Custom MCP Tools (Better UX)**
- Add browser tools to Claude's MCP config in container
- Tools call our BrowserService
- Pro: Same API as local browser tools
- Con: More complex setup

**Recommendation:** Start with Option A (simpler), evolve to Option B if needed.

### Cost Analysis

| Component          | Current   | With Browser | Delta          |
|--------------------|-----------|--------------|----------------|
| Image Size         | ~200 MB   | ~700 MB      | +500 MB        |
| Container Memory   | 4 GB      | 6-8 GB       | +2-4 GB        |
| CPU                | 2 cores   | 4 cores      | +2 cores       |
| Cost per 10 min    | ~$0.02    | ~$0.03-0.04  | +$0.01-0.02    |

**Note:** The additional cost (~$0.01-0.02 per session) is negligible compared to Claude API costs ($0.50-3.00 per session).

---

## Implementation Tasks

### Phase 1: Container Setup (Tasks 1-2)

| # | Task                                           | Est. Time | Dependencies | Notes                                              |
|---|------------------------------------------------|-----------|--------------|---------------------------------------------------|
| 1 | Add Playwright/Chromium to Modal container image | 30 min    | —            | Update image definition, test build size          |
| 2 | Create browser_service.py module               | 45 min    | Task 1       | BrowserService class with core methods            |

### Phase 2: Dev Server Management (Tasks 3-4)

| # | Task                                           | Est. Time | Dependencies | Notes                                              |
|---|------------------------------------------------|-----------|--------------|---------------------------------------------------|
| 3 | Implement dev server lifecycle management      | 30 min    | Task 2       | Start, wait for ready, stop, port detection       |
| 4 | Add auto-cleanup on execute_prompt completion  | 20 min    | Task 3       | Ensure no orphan processes                        |

### Phase 3: Browser Tools (Tasks 5-8)

| # | Task                                           | Est. Time | Dependencies | Notes                                              |
|---|------------------------------------------------|-----------|--------------|---------------------------------------------------|
| 5 | Implement navigate() and snapshot()            | 30 min    | Task 2       | Core navigation and DOM inspection               |
| 6 | Implement console_messages() and network errors | 25 min    | Task 5       | Console log capture                               |
| 7 | Implement click() and type_text()              | 25 min    | Task 5       | Basic interactions                                |
| 8 | Implement screenshot() for Claude vision       | 20 min    | Task 5       | Base64 screenshot for debugging                  |

### Phase 4: Integration (Tasks 9-11)

| # | Task                                           | Est. Time | Dependencies | Notes                                              |
|---|------------------------------------------------|-----------|--------------|---------------------------------------------------|
| 9 | Create helper script for Claude to call browser | 30 min    | Tasks 5-8    | Python script Claude can invoke via bash         |
| 10| Add browser tools to default allowedTools      | 15 min    | Task 9       | Update execute_prompt defaults                   |
| 11| End-to-end test with sample React app          | 45 min    | All above    | Full flow test                                    |

**Total Estimated Time**: ~5.5 hours  
**Recommended Split**: 2 sessions

---

## Test Plan

### Unit Tests

**browser_service.py** (12 tests):
- start_browser launches Chromium successfully
- start_dev_server spawns process and waits for ready
- start_dev_server times out if server doesn't start
- navigate goes to URL and returns title
- snapshot returns accessibility tree
- console_messages captures console.log
- console_messages captures console.error
- click finds and clicks element
- type_text fills input field
- screenshot returns valid base64 PNG
- cleanup terminates browser and dev server
- cleanup handles already-terminated processes

### Integration Tests

- Browser service works in Modal container environment
- Dev server starts and is reachable
- Full navigation → snapshot → interact flow works

### Manual Testing Checklist

- [ ] Deploy updated Modal app with Playwright
- [ ] Send prompt to build simple React component
- [ ] Verify Claude can run `npm run dev`
- [ ] Verify Claude can navigate to localhost
- [ ] Verify Claude can read DOM snapshot
- [ ] Verify Claude can see console errors
- [ ] Verify Claude can click buttons
- [ ] Verify cleanup happens after prompt completes
- [ ] Verify container memory usage is acceptable
- [ ] Verify cold start time is acceptable

---

## Dependencies

| Dependency           | Type     | Status     | Notes                                    |
|----------------------|----------|------------|------------------------------------------|
| Serverless Execution | Feature  | ✅ Complete | Modal cloud infrastructure               |
| Modal Volume         | External | ✅ Ready    | Persistent storage for repos             |
| Playwright           | Package  | Available  | Browser automation library               |
| Chromium             | Binary   | Available  | Via playwright install                   |

---

## Rollout Plan

### Phase 1: MVP (This Feature)
- Browser available in Modal container
- Claude can use bash to control browser via Python script
- Basic: navigate, snapshot, console, click, type

### Phase 2: Enhancements (Future)
- Custom MCP tools for seamless integration
- Screenshot streaming to mobile UI (optional visibility)
- Multiple viewport testing
- Network request mocking

---

## Related Documents

- [Serverless Execution](./serverless-execution.md) - Cloud mode infrastructure
- [Architecture](../architecture.md) - System design
- [Product Spec](../product_spec.md) - Feature requirements

---

*Created: 2026-01-22*

