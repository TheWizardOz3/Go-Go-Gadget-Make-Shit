# Feature: Project Switcher

**Status:** ✅ Complete  
**Priority:** P0 (MVP)  
**Complexity:** MEDIUM  
**Dependencies:** API Server Setup ✅, JSONL Watcher Service ✅  
**Completed:** 2026-01-14

---

## Overview

A modal interface for switching between projects with Claude Code sessions. The current project name in the header becomes tappable to open a full-screen project list, allowing users to switch between codebases without being at their laptop.

### User Story

> As a developer working on multiple projects, I want to switch between projects from my phone, so I can manage different codebases without being at my laptop.

---

## Requirements

### Functional Requirements

- [x] Display current project name prominently in header (already implemented)
- [x] Tap project name to open project list modal
- [x] Show all projects with Claude Code sessions (backend ready, need UI)
- [x] Most recent/active projects at top (backend sorts this way)
- [x] Selecting a project loads its conversation and session state
- [x] Remember last selected project (persist to localStorage)
- [x] Full-screen modal with project list (not a tiny dropdown)
- [x] Projects show: name, last activity time, session count
- [x] Search/filter if > 10 projects

### Acceptance Criteria

- [x] Given I have sessions in multiple projects, when I tap the project name in header, then I see all projects listed
- [x] Given I select a different project, when it loads, then I see that project's conversation history
- [x] Given I close and reopen the app, when it loads, then it opens to the last selected project

---

## UI/UX Specification

### Header Changes

The current project name becomes a tappable button:
- Display chevron-down icon indicating it's tappable
- Subtle hover/active state for touch feedback
- Truncate long project names with ellipsis

### Project Picker Modal

- Full-screen modal overlay (not a dropdown)
- Dark semi-transparent backdrop
- Modal animates up from bottom (slide-up sheet)
- Close button in top-right or tap backdrop to dismiss

### Project List Item

Each project shows:
- **Project name** (primary, bold)
- **Last activity** (relative time: "2m ago", "Yesterday", etc.)
- **Session count** badge
- **Checkmark** on currently selected project
- Large touch target (min 48px height)

### Search (when > 10 projects)

- Sticky search input at top of modal
- Filter projects as user types
- Clear button to reset search
- Show "No projects match" empty state

### Empty State

If no projects exist:
- Friendly icon
- "No projects found" message
- "Start a Claude Code session to see it here"

---

## Technical Design

### State Management

Use existing `selectedProject` state in `App.tsx`, but:
1. Initialize from localStorage on mount
2. Persist to localStorage on change

```typescript
// localStorage key
const STORAGE_KEY_LAST_PROJECT = 'gogogadgetclaude:lastProject';
```

### Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `ProjectPicker` | `client/src/components/project/ProjectPicker.tsx` | Full modal with list |
| `ProjectListItem` | `client/src/components/project/ProjectListItem.tsx` | Single project row |
| `ProjectSearch` | `client/src/components/project/ProjectSearch.tsx` | Search input component |

### Existing Infrastructure

- **API Endpoint:** `GET /api/projects` ✅
- **Hook:** `useProjects()` ✅
- **Types:** `ProjectSerialized` ✅
- **Project data includes:** path, name, encodedPath, sessionCount, lastSessionId, lastActivityAt

---

## Implementation Tasks

### Task 1: Create ProjectListItem component (~30 min)
**File:** `client/src/components/project/ProjectListItem.tsx`

Build the individual project row component:
- Props: `project`, `isSelected`, `onSelect`
- Display project name (bold)
- Display last activity (relative time using `formatRelativeTime`)
- Display session count badge
- Checkmark indicator when selected
- Touch-friendly height (min 56px)
- Hover/active states

### Task 2: Create ProjectPicker modal component (~45 min)
**File:** `client/src/components/project/ProjectPicker.tsx`

Build the modal container:
- Props: `isOpen`, `onClose`, `projects`, `selectedProject`, `onSelectProject`
- Full-screen modal with dark backdrop
- Header with title ("Select Project") and close button
- Scrollable project list
- Close on backdrop tap
- Slide-up animation (CSS transform)

### Task 3: Add search functionality to ProjectPicker (~30 min)
**File:** `client/src/components/project/ProjectPicker.tsx`

Enhance modal with search:
- Add sticky search input at top (only if > 10 projects)
- Filter projects by name as user types (case-insensitive)
- Show "No projects match" when filter has no results
- Clear button to reset search
- Focus input on modal open (when search is shown)

### Task 4: Make header project name tappable (~30 min)
**File:** `client/src/App.tsx`

Update header component:
- Convert project name to button
- Add chevron-down icon after name
- Add `onClick` handler to open ProjectPicker
- Pass required props to ProjectPicker
- Add modal state (`isProjectPickerOpen`)

### Task 5: Add localStorage persistence for selected project (~30 min)
**File:** `client/src/App.tsx`

Implement persistence:
- Read from localStorage on initial mount
- Write to localStorage when `selectedProject` changes
- Handle case where stored project no longer exists
- Use constant for storage key
- Only persist valid encodedPath values

### Task 6: Polish and edge cases (~30 min)
**Files:** Various

Handle edge cases and polish:
- Empty state when no projects (already exists, verify it still works)
- Loading state while projects fetch
- Keyboard accessibility (Escape to close modal)
- Safe area insets for notched phones
- Smooth animations with `prefers-reduced-motion` support

---

## Test Plan

### Unit Tests

| Test Case | Component |
|-----------|-----------|
| Renders project info correctly | `ProjectListItem` |
| Shows checkmark when selected | `ProjectListItem` |
| Calls onSelect when clicked | `ProjectListItem` |
| Opens when isOpen=true | `ProjectPicker` |
| Closes when backdrop clicked | `ProjectPicker` |
| Filters projects by search | `ProjectPicker` |
| Shows empty state when no matches | `ProjectPicker` |

### Integration Tests

| Test Case | Scope |
|-----------|-------|
| Selecting project updates conversation | App flow |
| Project persists to localStorage | App flow |
| Stored project loads on refresh | App flow |

### Manual Testing Checklist

- [x] Tap header opens project picker
- [x] Projects sorted by recent activity
- [x] Selecting project updates conversation
- [x] Selected project checkmark visible
- [x] Modal closes on backdrop tap
- [x] Modal closes on X button tap
- [x] Search filters correctly (when > 10 projects)
- [x] Last project remembered after app close/reopen
- [x] Works on iPhone Safari
- [x] Touch targets are large enough
- [x] Animations are smooth
- [x] Respects prefers-reduced-motion

---

## Dependencies

### Required Before This Feature
- [x] API Server Setup
- [x] JSONL Watcher Service
- [x] Conversation View UI

### Blocks These Features
- Session Picker (needs project context)
- Quick Templates (project-specific)

---

## Implementation Summary

### Files Created
- `client/src/components/project/ProjectListItem.tsx` — Single project row with folder icon, name, activity time, session count, selected checkmark
- `client/src/components/project/ProjectListItem.test.tsx` — 13 unit tests
- `client/src/components/project/ProjectPicker.tsx` — Full-screen modal with slide-up animation, dark backdrop, project list
- `client/src/components/project/ProjectPicker.test.tsx` — 22 unit tests
- `client/src/components/project/index.ts` — Barrel export

### Files Modified
- `client/src/App.tsx` — Added modal state, tappable header button with chevron, localStorage persistence for selected project
- `client/src/index.css` — Added custom CSS animations (fade-in, slide-up, fade-out, slide-down) with prefers-reduced-motion support

### Test Results
- **35 new tests** (13 ProjectListItem + 22 ProjectPicker)
- **195 total tests** passing across client and server

### Key Implementation Details
- **localStorage Key:** `gogogadgetclaude:lastProject` stores the `encodedPath` of the last selected project
- **Search Threshold:** Search input only shows when there are >10 projects
- **Animation Approach:** Pure CSS animations (no tailwindcss-animate dependency) to keep bundle minimal
- **Accessibility:** `role="dialog"`, `role="listbox"`, `role="option"`, `aria-modal`, `aria-selected`, Escape key support

---

*Created: 2026-01-14*  
*Completed: 2026-01-14*

