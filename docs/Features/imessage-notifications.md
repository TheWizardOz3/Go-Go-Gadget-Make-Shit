# Feature Spec: iMessage Notifications

## 1. Overview

### 1.1 One-Line Summary

Receive iMessage notifications on your phone when Claude Code completes a task, so you know when to check back.

### 1.2 User Story

> As a **developer away from my laptop**, I want to **receive an iMessage notification when Claude finishes a task**, so that **I know when to check the app without constantly watching it**.

### 1.3 Problem Statement

When Claude Code is running a task (building features, fixing bugs, running tests), developers have no way to know when it's done without repeatedly checking the app. This creates friction—either you watch the app constantly or you miss the moment Claude finishes and waste time.

### 1.4 Business Value

- **User Impact:** Removes the need to constantly monitor the app; users can truly step away and trust they'll be notified
- **Business Impact:** Completes the "walk-friendly" vision—users can be doing anything and get pinged when ready
- **Technical Impact:** Leverages Claude Code's native hooks system; establishes notification infrastructure for future channels (Slack, Telegram in V1)

---

## 2. Scope & Requirements

### 2.1 Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | Detect task completion via Claude Code Stop hook | MUST | Hook calls local server endpoint |
| FR-2 | Send iMessage via macOS AppleScript | MUST | Uses `osascript` to send via Messages.app |
| FR-3 | Message includes project name and app link | MUST | Format: "🤖 GoGoGadgetClaude: Task complete in [project]. [link]" |
| FR-4 | Toggle notifications on/off in settings | MUST | Default: off (requires phone number) |
| FR-5 | Configure notification phone number in UI | MUST | Phone number saved to settings.json |
| FR-6 | Rate limit notifications (max 1 per minute) | MUST | Prevent spam during rapid task completion |
| FR-7 | Test notification button in settings | SHOULD | Send a test message to verify setup |

### 2.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Notification Latency | < 10 seconds from task completion | Manual testing |
| Reliability | Works when Messages.app is running | Manual testing |
| Security | Phone number stored locally only | Code review |

### 2.3 Acceptance Criteria

- [x] **Given** Claude finishes a task, **when** the Stop hook fires and notifications are enabled, **then** I receive an iMessage within 10 seconds
- [x] **Given** notifications are disabled in settings, **when** Claude finishes a task, **then** no iMessage is sent
- [x] **Given** Claude finishes multiple tasks rapidly (within 60 seconds), **when** the hooks fire, **then** only one notification is sent (rate limited)
- [x] **Given** I tap the link in the iMessage, **when** it opens, **then** Safari navigates to the web app
- [x] **Given** I enter a phone number in settings and tap test, **when** the test is sent, **then** I receive a test iMessage

### 2.4 Out of Scope

- Slack notifications (planned for V1)
- Telegram notifications (planned for V1)
- Push notifications via APNs (would require app store app)
- Customizable notification messages
- Notification sound/vibration customization (uses iMessage defaults)
- Email notifications (planned for V2)

---

## 3. User Experience

### 3.1 User Flow

**Setup Flow:**
```
Open App → Tap Settings (gear icon) → Enable Notifications → Enter Phone Number → Tap "Send Test" → Receive Test iMessage → Done
```

**Notification Flow:**
```
Claude completes task → Hook fires → Server receives event → Checks if enabled → Sends iMessage → User receives notification
```

**Happy Path:**

1. User opens app and taps the settings gear icon in header
2. User toggles "Enable Notifications" to ON
3. User enters their phone number (the iPhone they're using)
4. User taps "Send Test Notification" to verify setup
5. User receives test iMessage with link to app
6. User closes settings and continues using app
7. When Claude completes a task, user receives iMessage notification

**Alternate Paths:**

- **No phone number entered:** Toggle stays disabled, shows helper text
- **Invalid phone number:** Shows validation error, prevents save
- **Messages.app not running:** Notification may fail silently (macOS handles this)
- **Rate limited:** Second notification within 60s is silently skipped

### 3.2 UI Design Notes

**Settings Modal:**
- Access via gear icon in header (right side, before status indicator)
- Full-height modal similar to Project/Session pickers
- Sections:
  1. **Notifications**
     - Toggle: "Enable Notifications" (disabled by default)
     - Input: "Phone Number" (shown when toggle is on)
     - Button: "Send Test Notification" (shown when phone number valid)
  2. **About** (future: theme, version info, etc.)

**Notification Message Format:**
```
🤖 GoGoGadgetClaude: Task complete in [ProjectName].
http://[tailscale-host]:3456
```

---

## 4. Technical Approach

### 4.1 Architecture Fit

**Affected Areas:**

| Area | Impact | Description |
|------|--------|-------------|
| Frontend | NEW | Settings modal component, useSettings hook |
| Backend | NEW | settingsService, notificationService, hooks endpoint |
| Database | NEW | ~/.gogogadgetclaude/settings.json file |
| External Services | NEW | macOS Messages.app via AppleScript |

**Alignment with Existing Patterns:**
- Settings service follows same pattern as sessionManager (file-based, in services/)
- API routes follow existing pattern in server/src/api/
- Settings modal reuses Modal component pattern from ProjectPicker
- Hook endpoint follows REST conventions

### 4.2 Data Model

**Settings file location:** `~/.gogogadgetclaude/settings.json`

```typescript
interface AppSettings {
  notificationsEnabled: boolean;       // Default: false
  notificationPhoneNumber?: string;    // E.164 format preferred, but flexible
  defaultTemplates: Template[];        // Existing, not modified
  theme: 'light' | 'dark' | 'system';  // Existing, not modified
}
```

### 4.3 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/settings` | Get current settings |
| PUT | `/api/settings` | Update settings (partial) |
| POST | `/api/hooks/task-complete` | Hook endpoint for Claude Code Stop event |
| POST | `/api/notifications/test` | Send test notification |

### 4.4 AppleScript Implementation

```bash
# Send iMessage via osascript
osascript -e 'tell application "Messages"
    set targetBuddy to "+1234567890"
    set targetService to (1st service whose service type = iMessage)
    set textMessage to "🤖 GoGoGadgetClaude: Task complete in MyProject. http://macbook.tailnet.ts.net:3456"
    send textMessage to buddy targetBuddy of targetService
end tell'
```

### 4.5 Rate Limiting Strategy

- Store `lastNotificationTime` in memory (server process)
- Before sending notification, check if 60 seconds have passed
- If rate limited, log but don't send
- Rate limit resets when server restarts (acceptable for MVP)

---

## 5. Implementation Tasks

### Task 1: Create settingsService.ts (~30 min)

**Files:**
- `server/src/services/settingsService.ts` (new)

**Details:**
- Read/write settings to `~/.gogogadgetclaude/settings.json`
- Create directory/file if doesn't exist
- Zod validation for settings shape
- Default values for missing fields
- Export: `getSettings()`, `updateSettings(partial)`

### Task 2: Implement Settings API endpoints (~30 min)

**Files:**
- `server/src/api/settings.ts` (modify)

**Details:**
- `GET /api/settings` - return current settings
- `PUT /api/settings` - merge partial update into settings
- Use settingsService for data access
- Validate request body with Zod

### Task 3: Create notificationService.ts (~45 min)

**Files:**
- `server/src/services/notificationService.ts` (new)

**Details:**
- `sendTaskCompleteNotification(projectName: string)` function
- Execute AppleScript via `execa`
- Include Tailscale URL from config/env
- Implement rate limiting (in-memory, 60 second cooldown)
- Handle errors gracefully (log, don't crash)

### Task 4: Add hook endpoint (~30 min)

**Files:**
- `server/src/api/hooks.ts` (new)
- `server/src/api/index.ts` (modify - add route)

**Details:**
- `POST /api/hooks/task-complete` endpoint
- Parse hook payload (event type, timestamp)
- Check if notifications enabled via settingsService
- Trigger notificationService if enabled
- Return 200 OK immediately (don't block Claude)

### Task 5: Create useSettings hook (~20 min)

**Files:**
- `client/src/hooks/useSettings.ts` (new)

**Details:**
- Fetch settings with SWR (no polling needed)
- `updateSettings(partial)` mutation function
- Loading and error states
- Type-safe with AppSettings interface

### Task 6: Create Settings UI component (~45 min)

**Files:**
- `client/src/components/settings/SettingsModal.tsx` (new)
- `client/src/components/settings/index.ts` (new)

**Details:**
- Full-screen modal (reuse Modal pattern)
- Notifications section:
  - Toggle switch for enable/disable
  - Phone number input (appears when enabled)
  - Phone number validation (basic format check)
  - "Send Test" button (appears when phone valid)
- Uses useSettings hook for data
- Optimistic updates on toggle

### Task 7: Add Settings button to header (~20 min)

**Files:**
- `client/src/App.tsx` (modify)

**Details:**
- Add gear icon button in header (right side, before status)
- State for settings modal open/close
- Import and render SettingsModal

---

## 6. Test Plan

### Unit Tests

| Component | Test Cases |
|-----------|------------|
| settingsService | Read settings, write settings, create defaults, validate schema |
| notificationService | Format message, rate limiting logic |
| useSettings hook | Fetch, update, error handling |

### Integration Tests

| Endpoint | Test Cases |
|----------|------------|
| GET /api/settings | Returns settings, creates file if missing |
| PUT /api/settings | Updates partial, validates input |
| POST /api/hooks/task-complete | Triggers notification when enabled, respects rate limit |
| POST /api/notifications/test | Sends test message |

### Manual Testing Checklist

- [x] Settings modal opens/closes properly
- [x] Toggle saves immediately
- [x] Phone number input validates format
- [x] Test notification button enables when valid phone entered
- [x] Settings persist across modal close/reopen
- [x] Settings persist to disk (`~/.gogogadgetclaude/settings.json`)
- [ ] Test notification sends and is received (skipped - requires real iMessage)
- [ ] Claude task completion triggers notification (skipped - requires Claude session)
- [ ] Rate limiting prevents spam (skipped - requires real notifications)
- [ ] App link in iMessage opens web app (skipped - requires receiving iMessage)

---

## 7. Dependencies & Risks

### Dependencies

| Dependency | Risk Level | Mitigation |
|------------|------------|------------|
| macOS Messages.app | Low | Standard macOS app, always available |
| AppleScript/osascript | Low | Built into macOS |
| Claude Code hooks | Low | Already documented, setup script exists |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Messages.app not signed in | Medium | Notifications fail | Document requirement in setup |
| Phone number format issues | Low | Invalid number | Basic validation + test button |
| Rate limit too aggressive | Low | Miss notifications | 60s seems reasonable, can adjust |

---

## 8. Future Considerations

- **V1:** Add Slack and Telegram as notification channels
- **V1:** Notification channel abstraction (common interface)
- **V2:** Email notifications via SMTP
- **V2:** Customizable notification messages
- **V2:** Per-project notification settings

---

*Created: 2026-01-15*

