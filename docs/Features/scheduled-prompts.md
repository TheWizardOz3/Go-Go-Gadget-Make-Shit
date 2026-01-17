# Feature Spec: Scheduled Prompts

## 1. Overview

### 1.1 One-Line Summary

Schedule recurring prompts that automatically start new Claude Code sessions at calendar-based times (daily, weekly, monthly, yearly).

### 1.2 User Story

> As a **solo developer**, I want to **schedule prompts to run at specific times** (like daily at 9am or every Monday), so that **I can automate recurring tasks like daily code reviews, weekly maintenance, or monthly reports without manual intervention**.

### 1.3 Problem Statement

Developers often have recurring tasks they want Claude to handle on a schedule — daily standups, weekly dependency updates, monthly cleanup, etc. Currently, users must remember to manually send these prompts at the right time. This is error-prone and adds cognitive overhead.

### 1.4 Business Value

- **User Impact:** True automation of recurring development tasks; "set it and forget it" workflows
- **Business Impact:** Significantly increases app utility — becomes essential infrastructure for automated coding workflows
- **Technical Impact:** Builds scheduling infrastructure that enables future serverless execution where agents run independently

---

## 2. Scope & Requirements

### 2.1 Functional Requirements

| ID    | Requirement                                                 | Priority | Notes                                               |
|-------|-------------------------------------------------------------|----------|-----------------------------------------------------|
| FR-1  | Create scheduled prompts with calendar-based recurrence     | MUST     | Daily, Weekly, Monthly, Yearly schedules            |
| FR-2  | Specify time of day for execution                           | MUST     | Hour and minute picker (e.g., 9:00 AM)              |
| FR-3  | Specify day of week for weekly schedules                    | MUST     | Monday–Sunday picker                                |
| FR-4  | Specify day of month for monthly schedules                  | MUST     | 1–28 (avoid 29-31 complexity)                       |
| FR-5  | Assign scheduled prompt to specific project OR make global  | MUST     | Project picker or "Any project" option              |
| FR-6  | Scheduled prompts always create a NEW session when executed | MUST     | Never continues existing session                    |
| FR-7  | View list of all scheduled prompts                          | MUST     | Show prompt, schedule, project, next run time       |
| FR-8  | Delete scheduled prompts                                    | MUST     | Single tap delete with confirmation                 |
| FR-9  | Enable/disable scheduled prompts without deleting           | MUST     | Toggle on/off                                       |
| FR-10 | Show next execution time for each scheduled prompt          | MUST     | Absolute time display (e.g., "Mon Jan 20, 9:00 AM") |
| FR-11 | Track last execution status for each prompt                 | MUST     | Timestamp + success/failed + error message          |
| FR-12 | Display last execution info in prompt list                  | MUST     | "Last run: Today 9:00 AM ✓" or error details        |
| FR-13 | Scheduled prompts persist across server restarts            | MUST     | Stored in JSON file                                 |
| FR-14 | Scheduled prompts execute regardless of current agent state | MUST     | Fire-and-forget, enables future serverless          |
| FR-15 | Visual feedback when a scheduled prompt executes            | SHOULD   | Toast notification                                  |

### 2.2 Non-Functional Requirements

| Requirement | Target                                       | Measurement        |
|-------------|----------------------------------------------|--------------------|
| Performance | Scheduler overhead < 1% CPU                  | Process monitoring |
| Reliability | Prompts execute within 60s of scheduled time | Manual testing     |
| UX          | Create a scheduled prompt in < 45 seconds    | User testing       |

### 2.3 Acceptance Criteria

- [ ] **Given** I create a daily prompt for 9:00 AM, **when** 9:00 AM arrives, **then** a new Claude session starts with my prompt
- [ ] **Given** I create a weekly prompt for Monday at 9:00 AM, **when** Monday 9:00 AM arrives, **then** a new session starts
- [ ] **Given** I assign a prompt to "ProjectX", **when** it executes, **then** it starts a new session in ProjectX's directory
- [ ] **Given** I set a prompt as global, **when** it executes, **then** it uses the last active project
- [ ] **Given** I disable a scheduled prompt, **when** its scheduled time passes, **then** it does NOT execute
- [ ] **Given** I restart the server, **when** it comes back up, **then** my scheduled prompts resume with correct next-run times
- [ ] **Given** a scheduled prompt executes successfully, **when** I view the prompt list, **then** I see "Last run: [timestamp] ✓"
- [ ] **Given** a scheduled prompt fails to execute, **when** I view the prompt list, **then** I see "Last run: [timestamp] ✗" with error info

### 2.4 Out of Scope

- One-time scheduled prompts (only recurring schedules for MVP)
- Complex cron expressions — use friendly UI instead
- Full execution history/log (only tracking last execution per prompt)
- Timezone configuration — uses system timezone
- "Run now" button to manually trigger a scheduled prompt (can add later)

---

## 3. User Experience

### 3.1 User Flow

```
Open App → Tap "Schedule" icon → See scheduled prompts list → Tap "+" to add
                                        ↓                            ↓
                               Tap prompt to toggle on/off     Fill form:
                               Swipe to delete                 - Prompt text
                                                               - Schedule type
                                                               - Time
                                                               - Project (or global)
```

**Happy Path:**

1. User taps the schedule icon (clock icon) in the header
2. Scheduled prompts panel slides up showing existing prompts (or empty state)
3. User taps "Add Scheduled Prompt" button
4. User enters prompt text (e.g., "Review yesterday's commits and create a summary")
5. User selects schedule type: Daily, Weekly, Monthly, or Yearly
6. User sets time (e.g., 9:00 AM)
7. User selects project from dropdown (or "Global" to prompt for project at runtime)
8. User taps "Save" — prompt appears in list with next execution time shown

**Alternate Paths:**

- **Toggle:** User taps enable/disable toggle on a prompt row
- **Delete:** User swipes left on a prompt row to reveal delete button, taps to delete
- **Empty State:** If no scheduled prompts, show helpful message with example use cases

### 3.2 UI Components

**Scheduled Prompts Panel:**
- Full-height slide-up panel (like session picker)
- Header with title "Scheduled Prompts" and close button
- List of scheduled prompts (or empty state with examples)
- Floating "+" button to add new

**Scheduled Prompt Row:**
- Prompt text (truncated if long, ~2 lines max)
- Schedule badge (e.g., "Daily at 9:00 AM", "Mon at 9:00 AM")
- Project badge (e.g., "GoGoGadgetClaude" or "Global")
- Next run time (e.g., "Next: Tomorrow 9:00 AM")
- Last execution status (e.g., "Last run: Today 9:00 AM ✓" or "Failed 2h ago")
- Enable/disable toggle
- Swipe-to-delete

**Add/Edit Form:**
- Prompt text input (multi-line, similar to regular input)
- Schedule type segmented control: Daily | Weekly | Monthly | Yearly
- Time picker (hour:minute, 12h or 24h based on system)
- Day of week picker (visible only for Weekly)
- Day of month picker (visible only for Monthly)
- Project dropdown: list of projects + "Global (select at runtime)" option
- Save/Cancel buttons

---

## 4. Technical Approach

### 4.1 Architecture Fit

| Area              | Impact | Description                                                     |
|-------------------|--------|-----------------------------------------------------------------|
| Frontend          | NEW    | ScheduledPromptsPanel, ScheduledPromptForm, useScheduledPrompts |
| Backend           | NEW    | schedulerService.ts, scheduled-prompts API routes               |
| Database          | NEW    | `~/.gogogadgetclaude/scheduled-prompts.json`                    |
| External Services | NONE   | Uses existing Claude CLI integration (spawns new session)       |

**Alignment with Existing Patterns:**
- New service follows existing service layer pattern (like `sessionManager.ts`)
- API endpoints follow existing REST patterns in `server/src/api/`
- Frontend components follow existing panel patterns (like SessionPicker)
- Session creation uses existing `claudeService.ts` patterns

### 4.2 Data Model

```typescript
type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ExecutionStatus = 'success' | 'failed';

interface LastExecution {
  timestamp: string;               // ISO timestamp
  status: ExecutionStatus;
  error?: string;                  // Error message if failed
}

interface ScheduledPrompt {
  id: string;                      // UUID
  prompt: string;                  // The prompt text to send
  scheduleType: ScheduleType;      // Recurrence pattern
  timeOfDay: string;               // "HH:MM" in 24h format (e.g., "09:00")
  dayOfWeek?: number;              // 0-6 (Sun-Sat), required for 'weekly'
  dayOfMonth?: number;             // 1-28, required for 'monthly'
  projectPath: string | null;      // Specific project path, or null for global
  enabled: boolean;                // Whether actively scheduled
  createdAt: string;               // ISO timestamp
  lastExecution?: LastExecution;   // Most recent execution result
  nextRunAt?: string;              // ISO timestamp of next scheduled run
}

// Storage: ~/.gogogadgetclaude/scheduled-prompts.json
interface ScheduledPromptsFile {
  prompts: ScheduledPrompt[];
}
```

### 4.3 Fire-and-Forget Execution

The scheduler is intentionally lightweight:

1. Cron job fires at scheduled time
2. Spawn `claude -p "prompt"` in the project directory (async, don't wait)
3. Record `lastExecution` with timestamp and status (success if spawn succeeded)
4. Done — Claude CLI handles the rest independently

No waiting for completion, no session tracking, no concurrency concerns. The app is just a trigger.

### 4.4 API Endpoints

| Method | Endpoint                            | Purpose                     | Request Body                    |
|--------|-------------------------------------|-----------------------------|---------------------------------|
| GET    | `/api/scheduled-prompts`            | List all scheduled prompts  | —                               |
| POST   | `/api/scheduled-prompts`            | Create new scheduled prompt | `ScheduledPromptInput`          |
| PUT    | `/api/scheduled-prompts/:id`        | Update prompt               | `Partial<ScheduledPromptInput>` |
| DELETE | `/api/scheduled-prompts/:id`        | Delete scheduled prompt     | —                               |
| PATCH  | `/api/scheduled-prompts/:id/toggle` | Toggle enabled/disabled     | —                               |

```typescript
interface ScheduledPromptInput {
  prompt: string;
  scheduleType: ScheduleType;
  timeOfDay: string;         // "HH:MM"
  dayOfWeek?: number;        // Required if weekly
  dayOfMonth?: number;       // Required if monthly
  projectPath: string | null;
}
```

### 4.5 Scheduler Implementation

**Library:** Use `node-cron` for cron-based scheduling (well-maintained, simple API)

**Cron Pattern Mapping:**
| Schedule Type | Cron Pattern Example | Description                   |
|---------------|----------------------|-------------------------------|
| Daily         | `0 9 * * *`          | Every day at 9:00 AM          |
| Weekly        | `0 9 * * 1`          | Every Monday at 9:00 AM       |
| Monthly       | `0 9 1 * *`          | 1st of every month at 9:00 AM |
| Yearly        | `0 9 1 1 *`          | January 1st at 9:00 AM        |

**Execution Flow:**
1. Cron job fires at scheduled time
2. Look up the prompt's `projectPath` (or use last active project if global)
3. Spawn `claude -p "prompt"` in that directory (fire-and-forget)
4. Update `lastExecution` with timestamp and success/failed status
5. Recalculate `nextRunAt`
6. Send toast notification to connected clients

**Server Lifecycle:**
- On startup: load all prompts, register cron jobs for enabled prompts
- On toggle enable: register cron job
- On toggle disable: unregister cron job
- On delete: unregister cron job and remove from storage
- Prompts persist and resume across restarts

---

## 5. Implementation Tasks

**Status: ✅ Complete**

### Backend (Completed)

| # | Task                                                          | Status |
|---|---------------------------------------------------------------|--------|
| 1 | Create ScheduledPrompt types and JSON storage utilities       | ✅      |
| 2 | Add `node-cron` dependency and create cron pattern utilities  | ✅      |
| 3 | Build SchedulerService core (register/unregister cron jobs)   | ✅      |
| 4 | Implement new session execution (spawn Claude in project dir) | ✅      |
| 5 | Create API endpoints for scheduled prompts CRUD               | ✅      |
| 6 | Add server startup/shutdown lifecycle handling                | ✅      |

### Frontend (Completed)

| #  | Task                                                    | Status |
|----|---------------------------------------------------------|--------|
| 7  | Create useScheduledPrompts hook (fetch, mutate)         | ✅      |
| 8  | Build ScheduledPromptsPanel with list view              | ✅      |
| 9  | Build ScheduledPromptForm with schedule type pickers    | ✅      |
| 10 | Build time picker and conditional day pickers           | ✅      |
| 11 | Add project selector (list projects + global option)    | ✅      |
| 12 | Add toggle and delete interactions                      | ✅      |
| 13 | Add panel trigger button and integration                | ✅      |
| 14 | Add execution toast notifications via WebSocket/polling | ✅      |

### Files Created/Modified

**Server:**
- `server/src/services/scheduledPromptsStorage.ts` - JSON storage service with CRUD operations
- `server/src/services/schedulerService.ts` - Cron job management, prompt execution
- `server/src/lib/cronUtils.ts` - Pattern generation, next run calculation, descriptions
- `server/src/api/scheduledPrompts.ts` - REST API endpoints
- `server/src/api/index.ts` - Route registration
- `server/src/index.ts` - Scheduler lifecycle integration
- `server/src/services/settingsService.ts` - Added lastActiveProjectPath tracking
- `server/src/api/sessions.ts` - Updates lastActiveProjectPath on prompt send

**Client:**
- `client/src/hooks/useScheduledPrompts.ts` - SWR hook with utilities
- `client/src/hooks/useScheduledPromptNotifications.ts` - Toast notifications
- `client/src/components/scheduled/ScheduledPromptsPanel.tsx` - Main panel
- `client/src/components/scheduled/ScheduledPromptForm.tsx` - Create/edit form
- `client/src/components/scheduled/ScheduledPromptListItem.tsx` - List item component
- `client/src/components/scheduled/index.ts` - Barrel exports
- `client/src/components/ui/Toast.tsx` - Toast notification component
- `client/src/App.tsx` - Panel integration
- `client/src/lib/api.ts` - Added PATCH method

**Shared:**
- `shared/types/index.ts` - ScheduledPrompt types, AppSettings update

**Tests:**
- `server/src/lib/cronUtils.test.ts` - 21 unit tests
- `client/src/hooks/useScheduledPrompts.test.ts` - 18 unit tests

---

## 6. Test Plan

**Status: ✅ Complete (39 tests)**

### Unit Tests (✅ 39 tests)

- **cronUtils.test.ts** (21 tests): Pattern generation, next run calculation, schedule descriptions, validation
- **useScheduledPrompts.test.ts** (18 tests): Time formatting, schedule descriptions, relative time display, execution status

### Manual Testing (✅ Verified)

- ✅ Panel opens from header button
- ✅ Empty state displays correctly
- ✅ Form functionality works (prompt, frequency, time, project)
- ✅ Schedule types work (Daily/Weekly/Monthly/Yearly)
- ✅ Project selector shows all projects + Global option
- ✅ Creating prompt saves to API and displays in list
- ✅ List item shows prompt text, schedule badge, project badge, next run time
- ✅ Toggle & Delete controls work
- ✅ API CRUD operations work correctly
- ✅ Scheduler service starts on server boot

---

## 7. Rollout & Feature Flags

Not required — feature is additive and non-breaking. Ship when ready.

---

## 8. Design Decisions

1. **Global prompts use last active project**
   - No user prompt needed at runtime — keeps it fire-and-forget
   - Future enhancement: could notify user to select project

2. **Day of month limited to 1-28**
   - Avoids February and 30/31 edge cases
   - Simple and predictable

3. **Fire-and-forget execution model**
   - Spawn Claude CLI process and move on immediately
   - No waiting, no session tracking, no concurrency concerns
   - Claude handles everything independently

4. **Track only last execution (not full history)**
   - Simple: timestamp + success/failed + optional error
   - Sufficient for debugging without storage bloat
   - Full history can be added later if needed

5. **System timezone only**
   - Store and execute in local time
   - Keep simple for single-user local app

---

## 9. Known Limitations

1. **Server must be running** — Prompts only fire if Node.js server is active
2. **Laptop must be awake** — macOS sleep means missed prompts
3. **Missed executions aren't retried** — If server is down at scheduled time, prompt is skipped
4. **Single machine** — No multi-device coordination (future serverless will address this)

---

*Created: 2026-01-17*
*Updated: 2026-01-17 — Implementation complete. All tasks finished, 39 tests written, manual verification passed.*

