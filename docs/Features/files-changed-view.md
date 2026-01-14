# Feature: Files Changed View

> **Status:** Complete ✅  
> **Priority:** P0 (MVP)  
> **Complexity:** Medium  
> **Dependencies:** API Server Setup ✅, Git CLI  
> **Completed:** 2026-01-14

---

## Overview

A list view showing all files modified in the current project, allowing users to quickly understand the scope of changes Claude has made.

### User Story

> As a developer, I want to see which files Claude has modified, so I can quickly understand the scope of changes.

### Success Criteria

- [x] Given Claude has modified files, when I open files changed view, then I see a list of all modified files
- [x] Given I tap a file, when it opens, then I navigate to the diff view for that file (placeholder for now)
- [x] Given no files have been changed, when I open files changed view, then I see an empty state
- [x] Given files are changed, when I view the navigation, then I see a badge with the count of changed files

---

## Requirements (from Product Spec)

- [x] List files changed since session start (via git diff or tool usage parsing)
- [x] Show file path and change type (added, modified, deleted)
- [x] Tap file to open diff view (navigation only - diff view is separate feature)
- [x] Badge/count in navigation showing number of changed files
- [ ] Distinguish between staged and unstaged changes (optional for MVP - will show all uncommitted changes)

---

## Technical Design

### API Endpoints

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| GET | `/api/projects/:encodedPath/files` | Get list of changed files | `FileChange[]` |
| GET | `/api/projects/:encodedPath/files/*` | Get file diff (placeholder) | `FileDiff` |

### Data Models

Already defined in `shared/types/index.ts`:

```typescript
export type FileChangeStatus = 'added' | 'modified' | 'deleted';

export interface FileChange {
  path: string;           // File path relative to repo root
  status: FileChangeStatus;
  additions: number;      // Lines added
  deletions: number;      // Lines removed
}
```

New type needed for diff view (future feature):

```typescript
export interface FileDiff {
  path: string;
  status: FileChangeStatus;
  hunks: DiffHunk[];      // For future diff view feature
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}
```

### Component Structure

```
client/src/components/files/
├── index.ts                    # Barrel export
├── FilesChangedView.tsx        # Main container component
├── FileChangeList.tsx          # List of file changes
├── FileChangeItem.tsx          # Individual file change row
├── FilesEmptyState.tsx         # Empty state when no changes
└── FilesBadge.tsx              # Badge showing count of changes
```

### Service Layer

```
server/src/services/
└── gitService.ts               # Git operations (status, diff)
```

---

## Implementation Tasks

### Task 1: Create Git Service (Backend)
**Estimate:** 45 min

Create `server/src/services/gitService.ts` with:
- `getChangedFiles(projectPath: string): Promise<FileChange[]>` - Get list of uncommitted changes
- `isGitRepo(path: string): Promise<boolean>` - Check if path is a git repository
- Use `simple-git` package for Git CLI wrapper
- Handle edge cases: not a git repo, empty repo, binary files

**Files to modify:**
- Create `server/src/services/gitService.ts`
- Update `server/package.json` (add simple-git if not present)

**Acceptance:**
- Service correctly returns list of changed files with additions/deletions
- Handles non-git directories gracefully
- Unit tests pass

---

### Task 2: Implement Files API Endpoint (Backend)
**Estimate:** 30 min

Update `server/src/api/projects.ts` to implement:
- `GET /api/projects/:encodedPath/files` - Returns list of changed files
- Validate project exists and is a git repo
- Return empty array if no changes or not a git repo

**Files to modify:**
- `server/src/api/projects.ts`

**Acceptance:**
- Endpoint returns 200 with file changes array
- Endpoint returns 404 if project not found
- Endpoint returns empty array for non-git projects

---

### Task 3: Add FileDiff Types (Shared)
**Estimate:** 15 min

Add new types for file diff view to `shared/types/index.ts`:
- `FileDiff` interface
- `DiffHunk` interface
- `DiffLine` interface

**Files to modify:**
- `shared/types/index.ts`

**Acceptance:**
- Types compile without errors
- Types are exported from shared package

---

### Task 4: Create useFilesChanged Hook (Frontend)
**Estimate:** 30 min

Create `client/src/hooks/useFilesChanged.ts`:
- Fetch changed files from API using SWR
- Polling at slower interval (5-10 seconds - files change less frequently)
- Return loading, error, and data states

**Files to modify:**
- Create `client/src/hooks/useFilesChanged.ts`

**Acceptance:**
- Hook correctly fetches and caches file changes
- Hook handles loading and error states
- Polling works at configured interval

---

### Task 5: Create FileChangeItem Component (Frontend)
**Estimate:** 30 min

Create `client/src/components/files/FileChangeItem.tsx`:
- Display file path (truncated if long)
- Show status icon (green + for added, yellow pencil for modified, red - for deleted)
- Show +/- line counts
- Tappable row (48px touch target)
- Support onPress callback for navigation

**Files to modify:**
- Create `client/src/components/files/FileChangeItem.tsx`

**Acceptance:**
- Component renders file info correctly
- Touch target meets 44×44px minimum
- Visual distinction between status types

---

### Task 6: Create FileChangeList Component (Frontend)
**Estimate:** 30 min

Create `client/src/components/files/FileChangeList.tsx`:
- Render list of FileChangeItem components
- Support pull-to-refresh
- Handle loading state with skeleton loaders
- Pass tap handler for file navigation

**Files to modify:**
- Create `client/src/components/files/FileChangeList.tsx`

**Acceptance:**
- List renders all file changes
- Pull-to-refresh triggers data reload
- Loading state shows skeleton loaders

---

### Task 7: Create FilesEmptyState Component (Frontend)
**Estimate:** 20 min

Create `client/src/components/files/FilesEmptyState.tsx`:
- Friendly message when no files changed
- Icon representing "no changes"
- Consistent with app's empty state design

**Files to modify:**
- Create `client/src/components/files/FilesEmptyState.tsx`

**Acceptance:**
- Empty state displays when no changes
- Design matches existing empty states

---

### Task 8: Create FilesChangedView Container (Frontend)
**Estimate:** 30 min

Create `client/src/components/files/FilesChangedView.tsx`:
- Main container component
- Uses useFilesChanged hook
- Renders FileChangeList or FilesEmptyState
- Handles error state

**Files to modify:**
- Create `client/src/components/files/FilesChangedView.tsx`
- Create `client/src/components/files/index.ts` (barrel export)

**Acceptance:**
- Container correctly orchestrates child components
- Error state handled gracefully
- Loading/empty/data states all work

---

### Task 9: Create FilesBadge Component (Frontend)
**Estimate:** 20 min

Create `client/src/components/files/FilesBadge.tsx`:
- Small badge showing count of changed files
- Hidden when count is 0
- Color-coded (accent color when files changed)

**Files to modify:**
- Create `client/src/components/files/FilesBadge.tsx`

**Acceptance:**
- Badge shows correct count
- Badge hidden when no changes
- Visually clear and legible

---

### Task 10: Add Files Tab Navigation (Frontend)
**Estimate:** 45 min

Integrate Files view into main app navigation:
- Add tab/button to switch between Conversation and Files views
- Show FilesBadge on Files tab
- Maintain selected file for navigation to diff view
- URL routing: `/files` path

**Files to modify:**
- `client/src/App.tsx`
- Create navigation component if needed

**Acceptance:**
- User can switch between Conversation and Files views
- Badge shows on Files tab
- Navigation state persists correctly

---

### Task 11: Wire Up File Tap Navigation (Frontend)
**Estimate:** 30 min

Connect file tap to navigation:
- Tapping a file navigates to diff view route
- Pass file path as URL parameter
- Diff view shows placeholder (actual diff is next feature)

**Files to modify:**
- `client/src/components/files/FileChangeItem.tsx`
- `client/src/App.tsx` (add diff route)
- Create placeholder `client/src/components/files/FileDiffPlaceholder.tsx`

**Acceptance:**
- Tapping file navigates to `/files/:filePath`
- Placeholder shows file path
- Back navigation works

---

## Test Plan

### Unit Tests (Post-Implementation)
- `gitService.test.ts` - Mock git commands, test parsing
- `useFilesChanged.test.ts` - Mock API, test states
- `FileChangeItem.test.tsx` - Render tests for all status types
- `FileChangeList.test.tsx` - List rendering, empty state
- `FilesBadge.test.tsx` - Count display, visibility

### Integration Tests (Post-Implementation)
- API endpoint returns correct data format
- API handles non-git projects gracefully
- Full flow from API to rendered list

### Manual Testing
- Test on real iPhone Safari
- Verify touch targets are adequate
- Test pull-to-refresh gesture
- Verify badge updates when files change

---

## UI/UX Notes

### Visual Design
- File list shows: status icon, path, +/- counts
- Status icons: 
  - Added: Green circle with `+`
  - Modified: Yellow circle with pencil
  - Deleted: Red circle with `-`
- Path truncated with ellipsis if too long (show filename, truncate directories)
- +/- shown in green/red text

### Mobile Considerations
- 48px minimum row height for touch targets
- File path horizontally scrollable if needed
- Pull-to-refresh enabled
- Tab bar at bottom for thumb-friendly navigation

### Empty State
- Icon: Empty folder or checkmark
- Message: "No files changed"
- Subtext: "Claude hasn't modified any files yet"

---

## Dependencies

### Required Packages
- `simple-git` (backend) - Git CLI wrapper

### Related Features
- **File Diff View** (Feature #11) - Displays actual diff content (builds on this feature)

---

## Notes

- This feature focuses on **listing** changed files only
- **File Diff View** (full file with green/red highlighting) is a separate feature
- Using git status/diff to detect changes (more reliable than parsing tool_use events)
- Showing all uncommitted changes (staged + unstaged combined) for MVP simplicity

---

## Implementation Notes

### Files Created
- `server/src/services/gitService.ts` - Git operations service using `simple-git`
- `client/src/hooks/useFilesChanged.ts` - SWR hook for fetching changed files
- `client/src/components/files/FileChangeItem.tsx` - Individual file row
- `client/src/components/files/FileChangeList.tsx` - Scrollable file list with skeletons
- `client/src/components/files/FilesEmptyState.tsx` - Empty state when no changes
- `client/src/components/files/FilesChangedView.tsx` - Main container
- `client/src/components/files/FilesBadge.tsx` - Count badge (99+ max display)
- `client/src/components/files/FileDiffPlaceholder.tsx` - Placeholder for diff view
- `client/src/components/files/index.ts` - Barrel exports

### Files Modified
- `server/src/api/projects.ts` - Added `GET /files` endpoint
- `server/package.json` - Added `simple-git` dependency
- `shared/types/index.ts` - Added `FileDiff`, `DiffHunk`, `DiffLine` types
- `client/src/App.tsx` - Added tab navigation, file selection state

### Test Coverage
| Test File | Tests |
|-----------|-------|
| `gitService.test.ts` | 16 |
| `useFilesChanged.test.ts` | 10 |
| `FileChangeItem.test.tsx` | 19 |
| `FileChangeList.test.tsx` | 11 |
| `FilesBadge.test.tsx` | 9 |
| **Total New Tests** | **65** |

---

*Created: 2026-01-14*  
*Completed: 2026-01-14*

