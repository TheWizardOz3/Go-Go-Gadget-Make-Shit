# Project Status: GoGoGadgetClaude

**Last Updated**: 2026-01-17 (Scheduled Prompts complete)

---

## Current Milestone: V0.75 - Navigation & Scheduling ✅ COMPLETE

**Functionality Summary**: Enhanced project navigation, scheduled prompts, and voice input improvements.

### Scope Definition

#### Completed Features
- ✅ **Voice Input UX Improvements**: Bigger button, lower latency start/stop, better mobile alignment, waveform visualization
- ✅ **File Tree Viewing**: Browse project files with GitHub links for each file
- ✅ **Allow Edits Setting**: Toggle "ask before edits" setting in Settings panel
- ✅ **Scheduled Prompts**: Schedule repeating prompts (daily/weekly/monthly/yearly)
- ~~**Voice Input Picture-in-Picture**~~: *Cancelled - iOS Safari doesn't support background audio recording*

#### Explicitly Out of Scope
| Item                          | Reason for Exclusion                                        | Planned Milestone |
|-------------------------------|-------------------------------------------------------------|-------------------|
| Claude model picker           | Can change models via Claude Code itself                    | V1                |
| Slack/Telegram notifications  | Additional complexity, iMessage sufficient for personal use | V1                |
| Multi-session monitoring      | User indicated single session is sufficient                 | V2+               |
| Cursor support                | GUI app, hard to observe/control programmatically           | V2                |
| Real-time streaming           | Polling every 2-3s is sufficient                            | V1 if needed      |
| Work account / Okta           | Enterprise feature, requires separate deployment            | V2                |
| Git operations (commit, push) | Better done on laptop, risky on mobile                      | V2                |

#### Boundaries
- We will NOT support Cursor (GUI app) in this milestone—Claude Code CLI only
- We will NOT run agents in the cloud—laptop must be awake
- We will NOT provide authentication on the web UI—Tailscale is the security boundary

#### Technical Scope
- File system tree API endpoint
- Audio visualization with Web Audio API
- Scheduling mechanism for prompts

---

## V0.75 Build Order

| Order | Feature                        | Status      | Description                                             |
|-------|--------------------------------|-------------|---------------------------------------------------------|
| 1     | Voice Input UX Improvements    | ✅ Done      | Bigger button, waveform visualization, lower latency    |
| 2     | Allow Edits Setting            | ✅ Done      | Toggle "ask before edits" in Settings panel             |
| 3     | File Tree Viewing              | ✅ Done      | Browse project files with GitHub links                  |
| 4     | Scheduled Prompts              | ✅ Done      | Calendar-based scheduling (daily/weekly/monthly/yearly) |
| 5     | Voice Input Picture-in-Picture | ❌ Cancelled | iOS Safari doesn't support background audio recording   |

---

## V0.75 Progress — COMPLETE ✅

**Test Count: 631 tests** (398 client + 194 server + 39 new for Scheduled Prompts)

| Feature/Task                | Completion Date | Notes                                                                                                           |
|-----------------------------|-----------------|-----------------------------------------------------------------------------------------------------------------|
| Scheduled Prompts           | 2026-01-17      | Calendar-based scheduling, project targeting, fire-and-forget execution - [doc](Features/scheduled-prompts.md)  |
| File Tree Viewing           | 2026-01-17      | Browse committed files in-app with content viewer - [doc](Features/file-tree-view.md)                           |
| Voice Input UX Improvements | 2026-01-17      | Bigger button (56×56px), waveform visualization, lower latency - [doc](Features/voice-input-ux-improvements.md) |
| Allow Edits Setting         | 2026-01-16      | Toggle in Settings to skip permission prompts                                                                   |
| New Session Navigation Fix  | 2026-01-16      | Bug fix: new sessions now correctly navigate to the new session                                                 |
| Voice Input PiP             | ❌ Cancelled     | iOS Safari doesn't support background audio recording for web apps                                              |

### Next Milestone: V1 - Notifications & Serverless
| Feature               | Priority | Notes                             |
|-----------------------|----------|-----------------------------------|
| Claude model picker   | Medium   | Change models from mobile UI      |
| Notification channels | High     | Abstract layer for Slack/Telegram |
| Serverless execution  | High     | Run agents without laptop awake   |

---

## Completed Milestones

### MVP (v0.14.1) - Completed 2026-01-15 🎉

**Functionality Summary**: Monitor and control a single Claude Code session from your phone—see conversation, send prompts (text/voice), view file changes, get notified when done.

**All 13 MVP features complete!** Total: 493 tests (320 client + 173 server)

| Category    | Features                                                                                |
|-------------|-----------------------------------------------------------------------------------------|
| Core Loop   | API Server, JSONL Watcher, Conversation View, Status Indicator, Text Input, Stop Button |
| Navigation  | Project Switcher, Session Picker, Quick Templates                                       |
| Code Review | Files Changed View, File Diff View                                                      |
| Polish      | Voice Input, iMessage Notifications                                                     |

<details>
<summary>MVP Feature Details</summary>

| Feature/Task               | Completion Date | Notes                                                                                |
|----------------------------|-----------------|--------------------------------------------------------------------------------------|
| Product Specification      | 2026-01-13      | Full spec in `docs/product_spec.md`                                                  |
| Architecture Documentation | 2026-01-13      | Full architecture in `docs/architecture.md`                                          |
| Project Scaffolding        | 2026-01-13      | All 10 tasks complete - pnpm, Express, Vite, Tailwind, ESLint, Husky                 |
| Environment Setup          | 2026-01-13      | `.env` files, README, setup scripts, Tailscale/Groq docs                             |
| API Server Setup           | 2026-01-14      | [Feature doc](Features/api-server-setup.md) - Middleware, routes, validation         |
| JSONL Watcher Service      | 2026-01-14      | [Feature doc](Features/jsonl-watcher-service.md) - Parser, scanner, watcher, caching |
| Conversation View UI       | 2026-01-14      | [Feature doc](Features/conversation-view-ui.md) - All 12 tasks complete              |
| Status Indicator           | 2026-01-14      | [Feature doc](Features/status-indicator.md) - All 4 tasks complete                   |
| Text Input & Send          | 2026-01-14      | [Feature doc](Features/text-input-send.md) - 36 new tests, 133 total                 |
| Stop Button                | 2026-01-14      | [Feature doc](Features/stop-button.md) - 27 new tests, 160 total                     |
| Project Switcher           | 2026-01-14      | [Feature doc](Features/project-switcher.md) - 35 new tests, 195 total                |
| Session Picker             | 2026-01-14      | [Feature doc](Features/session-picker.md) - 49 new tests, 244 total                  |
| Quick Templates            | 2026-01-14      | [Feature doc](Features/quick-templates.md) - 51 new tests, 295 total                 |
| Files Changed View         | 2026-01-14      | [Feature doc](Features/files-changed-view.md) - 65 new tests, 360 total              |
| File Diff View             | 2026-01-15      | [Feature doc](Features/file-diff-view.md) - 54 new tests, 414 total                  |
| Voice Input                | 2026-01-15      | [Feature doc](Features/voice-input.md) - 46 new tests, 460 total                     |
| iMessage Notifications     | 2026-01-15      | [Feature doc](Features/imessage-notifications.md) - 33 new tests, 493 total          |

</details>

---

## Future Milestones

### V1: Notifications & Serverless
**Functionality Summary**: Multiple notification channels, model control, and serverless execution

**Key Features:**
- Claude model picker (change models from mobile UI)
- Notification channel abstraction layer
- Slack webhook notifications
- Telegram bot notifications
- Serverless/async execution (run agents without laptop awake)

**Technical Scope:**
- Claude CLI model switching integration
- Notification channel abstraction layer
- Slack webhook integration
- Telegram bot setup
- Cloud compute integration for serverless mode

---

### V2: Enterprise & Integration
**Functionality Summary**: Work account support, Cursor integration, and enhanced UX

**Key Features:**
- Okta SSO integration for work accounts
- GitHub org repo support
- Cursor support (if Cursor adds CLI agent mode)
- Super app embeddable API
- Full account segregation (work/personal)
- Email notifications (SMTP)
- Enhanced diff view (expand/collapse, better navigation)

**Technical Scope:**
- Okta OIDC integration
- GitHub OAuth with org permissions
- Cursor observation/control layer
- API design for embedding
- Separate deployment architecture
- SMTP client (nodemailer)
- Improved diff UI components

---

### Long-Term / Future Considerations
| Feature/Capability          | Rationale                | Tentative Timeline |
|-----------------------------|--------------------------|--------------------|
| Command history & favorites | Power user convenience   | V2+                |
| iPad optimization           | Better tablet experience | V2+                |

---

## Known Issues

### High Priority
| Issue    | Description | Impact | Workaround | Target Fix |
|----------|-------------|--------|------------|------------|
| None yet | —           | —      | —          | —          |

### Low Priority
| Issue    | Description | Impact | Workaround | Target Fix |
|----------|-------------|--------|------------|------------|
| None yet | —           | —      | —          | —          |

---

## Technical Debt Registry

### High Priority
| Debt Item | Description | Impact | Estimated Effort | Target Resolution |
|-----------|-------------|--------|------------------|-------------------|
| None      | —           | —      | —                | —                 |

### Low Priority / Improvements
| Debt Item | Description | Impact | Estimated Effort | Target Resolution |
|-----------|-------------|--------|------------------|-------------------|
| None yet  | —           | —      | —                | —                 |

---

## Quick Reference Links

- [Product Specification](product_spec.md)
- [Architecture Documentation](architecture.md)
- [Decision Log](decision_log.md)
- [Full Changelog](changelog.md)
