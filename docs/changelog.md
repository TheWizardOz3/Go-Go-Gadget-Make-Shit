# Changelog: GoGoGadgetClaude

> **Purpose:** Development history tracking notable changes. Follows [Keep a Changelog](https://keepachangelog.com/) conventions. For architectural decisions and rationale, see `decision_log.md`.

**Related Documents:**
- `decision_log.md` — Why changes were made
- `architecture.md` — Technical implementation details
- `product_spec.md` — Product requirements

---

## Version Index

| Version | Date | Type | Summary |
|---------|------|------|---------|
| 0.28.11 | 2026-01-25 | patch | Latency optimization - thinking indicator, optimistic UI, Modal warm containers |
| 0.28.10 | 2026-01-25 | patch | Cloud scheduled prompts fix - timezone migration, ntfy notifications |
| 0.28.9 | 2026-01-22 | patch | Timezone fix for scheduled prompts in cloud |
| 0.28.8 | 2026-01-22 | patch | Filter orphaned projects from project list |
| 0.28.7 | 2026-01-22 | patch | Fix server crash when project directory doesn't exist |
| 0.28.6 | 2026-01-22 | patch | Cloud mode loading performance - instant render with cached data |
| 0.28.5 | 2026-01-22 | patch | Force Cloud Mode toggle for testing |
| 0.28.4 | 2026-01-21 | patch | Fix cloud scheduled prompts - Modal URL, startup sync |
| 0.28.3 | 2026-01-21 | patch | Session picker preview fixes - cloud previews and line breaks |
| 0.28.2 | 2026-01-21 | patch | Cloud session messages fix - Modal message format parsing |
| 0.28.1 | 2026-01-20 | patch | Cloud session selection fixes |
| 0.28.0 | 2026-01-20 | minor | Context Continuation - continue sessions across environments |
| 0.27.0 | 2026-01-19 | minor | Unified session visibility - merge local and cloud sessions |
| 0.26.0 | 2026-01-19 | minor | Cloud-based scheduled prompts, edit prompt functionality |
| 0.25.0 | 2026-01-19 | minor | Image Attachments for prompts |
| 0.24.0 | 2026-01-18 | minor | Persistent Repo Volumes with explicit push |
| 0.23.0 | 2026-01-18 | minor | Cloud Mode Polish - session continuation, ntfy, debug logging |
| 0.21.0 | 2026-01-17 | minor | Serverless/Async Execution via Modal |
| 0.20.0 | 2026-01-17 | minor | ntfy Notifications |
| 0.19.0 | 2026-01-17 | minor | Notification Abstraction Layer |
| 0.18.0 | 2026-01-17 | minor | Floating Voice Button |
| 0.17.0 | 2026-01-17 | minor | Scheduled Prompts |
| 0.16.0 | 2026-01-17 | minor | File Tree Viewing |
| 0.15.0 | 2026-01-17 | minor | Voice Input UX Improvements |
| 0.14.0 | 2026-01-15 | **MVP** | iMessage Notifications - MVP DONE! |

> Pre-MVP versions (0.0.1 - 0.13.1) archived in `archive/changelog-pre-mvp.md`

**Types:** `major` | `minor` | `patch` | `prerelease`

---

## Releases

<!-- Add new versions below this line, newest first -->

## [Unreleased]

### Added
- Server Operations Cheatsheet (`docs/server-operations-cheatsheet.md`)

---

## [0.28.11] - 2026-01-25

**Latency Optimization** — Improved perceived performance in cloud mode. Added thinking indicator with elapsed time during Claude processing, optimistic message display for instant feedback, warm Modal containers (`min_containers=1`) to reduce cold starts from ~5s to ~0.5s, and rate-limited volume reloads.

---

## [0.28.10] - 2026-01-25

**Cloud Scheduled Prompts Fix** — Fixed prompts running at UTC instead of local time by adding timezone migration during sync. Settings are now always synced to Modal (not conditional on ntfy topic). Added backup notification logic in cloud scheduler.

---

## [0.28.9] - 2026-01-22

**Timezone Fix** — Scheduled prompts now correctly respect user's timezone in cloud execution. Added `timezone` field to prompts and timezone-aware cloud scheduler. Existing prompts migrated to include timezone.

---

## [0.28.8] - 2026-01-22

**Filter Orphaned Projects** — Projects that have been renamed, moved, or deleted on disk are now automatically filtered from the project list to prevent selection errors.

---

## [0.28.7] - 2026-01-22

**Server Crash Fix** — Added validation before spawning Claude process to prevent crashes when project directory no longer exists. Returns descriptive error instead of unhandled exception.

---

## [0.28.6] - 2026-01-22

**Cloud Mode Loading Performance** — Reduced loading times from 5-7s to <1s for returning cloud users. Instant render with cached projects/sessions from localStorage, faster 2s connectivity check, skip unnecessary local fetches.

---

## [0.28.5] - 2026-01-22

**Force Cloud Mode** — Added developer toggle in Settings to force Cloud mode for testing even when laptop is connected.

---

## [0.28.4] - 2026-01-21

**Cloud Scheduled Prompts Execution Fix** — Fixed Modal API URL, added startup sync for prompts, added manual sync endpoint for troubleshooting.

---

## [0.28.3] - 2026-01-21

**Session Picker Previews** — Fixed cloud sessions showing generic "Cloud session" text instead of actual prompt preview. Fixed line breaks collapsing in previews (now shows " · " separator).

---

## [0.28.2] - 2026-01-21

**Cloud Session Messages** — Fixed messages not displaying because server was incorrectly parsing Modal's already-transformed message format. Simplified session picker UI by removing redundant badges.

---

## [0.28.1] - 2026-01-20

**Cloud Session Selection Fixes** — Fixed cloud session messages not loading, Modal API endpoint mismatches, and production build same-origin check.

---

## [0.28.0] - 2026-01-20

**Context Continuation** — Continue sessions from one environment to another with automatic context transfer. "Continue in..." action on session list items generates context summary and injects as preamble. New `/api/sessions/:id/context-summary` endpoint on both local and Modal.

---

## [0.27.0] - 2026-01-19

**Unified Session Visibility** — Sessions from local and cloud environments merged into a single list. Cross-environment matching by git remote URL, visual source badges (green=local, violet=cloud), session count breakdown by source.

---

## [0.26.0] - 2026-01-19

**Cloud Scheduled Prompts & Edit** — Scheduled prompts now run via Modal when laptop is offline (30-min cron check). Added ability to edit existing scheduled prompts by clicking them.

---

## [0.25.0] - 2026-01-19

**Image Attachments** — Attach screenshots or images to prompts. Works in both local mode (temp file with `@filepath`) and cloud mode (base64 to Modal). 5MB file size limit.

---

## [0.24.0] - 2026-01-18

**Persistent Repo Volumes** — Git repos now persist in Modal Volume across containers, eliminating re-cloning on every prompt. Changes accumulate across prompts; users explicitly push via new `/api/cloud/push` endpoint when ready.

---

## [0.23.0] - 2026-01-18

**Cloud Mode Polish** — Cloud session continuation (`--continue` flag), ntfy notifications from Modal, cloud job pending UI with stages, persistent debug logging to localStorage, file tree caching, unified local/cloud UI experience. Multiple bug fixes for paths, URLs, and routing.

---

## [0.21.0] - 2026-01-17

**Serverless/Async Execution** — Run Claude Code agents in the cloud via Modal even when laptop is asleep. React app on Vercel for laptop-optional access. Modal functions for execute_prompt, session management, webhooks. API endpoint switching based on laptop availability.

---

## [0.20.0] - 2026-01-17

**ntfy Notifications** — Push notifications via ntfy.sh or self-hosted servers. NtfyChannel class with HTTP POST, Bearer token auth, rate limiting. Settings UI for server URL, topic, and auth token.

---

## [0.19.0] - 2026-01-17

**Notification Abstraction Layer** — Pluggable notification channel architecture. NotificationChannel interface, BaseChannel with shared rate limiting, IMessageChannel extracted from legacy service, NotificationManager for parallel broadcasting. Channel-based settings with auto-migration.

---

## [0.18.0] - 2026-01-17

**Floating Voice Button** — Persistent mic button on Files tab. Tap to record, long-press (500ms) to send. SharedPromptContext for cross-view state sync.

---

## [0.17.0] - 2026-01-17

**Scheduled Prompts** — Schedule prompts to run automatically (daily/weekly/monthly/yearly). Project-specific or global targeting, fire-and-forget execution, toast notifications on execution. Persistent storage with node-cron scheduling.

---

## [0.16.0] - 2026-01-17

**File Tree Viewing** — Browse committed project files in-app. Uses `git ls-tree` for listing, `git show` for content. File content viewer with line numbers, GitHub links for each file.

---

## [0.15.0] - 2026-01-17

**Voice Input UX Improvements** — Bigger voice button (56×56px), real-time waveform visualization using Web Audio API, lower latency start/stop. Added "Allow Edits" setting to skip Claude permission prompts.

---

## [0.14.0] - 2026-01-15 🎉 MVP COMPLETE

**iMessage Notifications** — Receive notifications when Claude completes tasks. Settings modal with toggle, phone number input, test button. macOS AppleScript via osascript, 60-second rate limiting.

**MVP Features Complete:** API Server, JSONL Watcher, Conversation View, Status Indicator, Text Input, Stop Button, Project Switcher, Session Picker, Quick Templates, Files Changed View, File Diff View, Voice Input, iMessage Notifications.

---

> **Pre-MVP entries (v0.0.1 - v0.13.1)** have been archived to `archive/changelog-pre-mvp.md` to reduce context size. These document project setup, scaffolding, and initial feature development.
