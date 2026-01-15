# Feature: File Diff View

> **Status:** ✅ Complete  
> **Priority:** P0 (MVP)  
> **Complexity:** High  
> **Dependencies:** Files Changed View ✅, Git CLI ✅  
> **Started:** 2026-01-14  
> **Completed:** 2026-01-15

---

## 1. Overview

### 1.1 One-Line Summary

Display full file content with syntax highlighting and visual indicators for added, deleted, and modified lines, enabling mobile code review.

### 1.2 User Story

> As a **developer reviewing code changes**, I want to **see the full file with green/red highlighting for changes**, so that **I can understand exactly what Claude modified without returning to my laptop**.

### 1.3 Problem Statement

After seeing which files changed in the Files Changed View, users need to review the actual code changes to verify Claude's work. Traditional diff tools (like GitHub diffs) use side-by-side views that don't work well on mobile. Users need a mobile-optimized view showing the complete file context with changes clearly highlighted.

### 1.4 Business Value

- **User Impact:** Enables confident code review from phone, making the app truly useful for remote monitoring
- **Business Impact:** Completes the MVP's core value proposition - full visibility into agent actions
- **Technical Impact:** Final critical piece of the read-only monitoring workflow

---

## 2. Scope & Requirements

### 2.1 Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | Display full file content (not just diff hunks) | MUST | Show complete context, not just changes |
| FR-2 | Highlight added lines with green background | MUST | Clear visual distinction |
| FR-3 | Highlight deleted lines with red background | MUST | Show what was removed |
| FR-4 | Syntax highlighting based on file extension | MUST | Code must be readable |
| FR-5 | Line numbers for all lines | MUST | Enable precise reference |
| FR-6 | Horizontal scroll for long lines | MUST | Mobile screens are narrow |
| FR-7 | Support all common file types | SHOULD | .js, .ts, .tsx, .py, .md, etc. |
| FR-8 | "Jump to next change" navigation | SHOULD | Quick scan of changes |
| FR-9 | Copy code to clipboard | COULD | Nice-to-have for mobile |
| FR-10 | Binary file detection | MUST | Show message for images, etc. |

### 2.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Performance | Render < 1s for files up to 1000 lines | Manual testing |
| Performance | Lazy load/virtualize files > 1000 lines | Manual testing |
| Mobile UX | Pinch-to-zoom supported | Manual testing on iPhone |
| Accessibility | 4.5:1 contrast for diff highlights | Color contrast checker |
| Memory | Handle files up to 10,000 lines | Test with large files |

### 2.3 Acceptance Criteria

- [ ] **Given** a modified file, **when** I view the diff, **then** I see the complete file content with line numbers
- [ ] **Given** a file with additions, **when** viewing the diff, **then** added lines have green background
- [ ] **Given** a file with deletions, **when** viewing the diff, **then** deleted lines have red background with strikethrough
- [ ] **Given** a TypeScript file, **when** viewing the diff, **then** code is syntax highlighted correctly
- [ ] **Given** a line longer than screen width, **when** viewing, **then** I can horizontally scroll
- [ ] **Given** a binary file, **when** viewing, **then** I see a message "Binary file, cannot display diff"
- [ ] **Given** I'm viewing a diff, **when** I tap back, **then** I return to Files Changed View

### 2.4 Out of Scope

- Side-by-side diff view (too cramped on mobile)
- Inline editing of files (read-only for MVP)
- File download (can copy-paste if needed)
- Commit/stage operations (git actions out of scope)
- Diff customization (unified context lines, etc.)
- Split hunk view (all changes shown together)

---

## 3. User Experience

### 3.1 User Flow

```
Files Changed View → Tap File → File Diff View → Review Changes → Back to Files
                                      ↓
                               Horizontal Scroll
                               Pinch to Zoom
                               Jump to Next Change
```

**Happy Path:**

1. User views Files Changed View, sees list of modified files
2. User taps a file (e.g., `src/App.tsx`)
3. Diff view loads, showing full file content
4. User scrolls through, sees green highlights for additions
5. User sees red backgrounds with strikethrough for deletions
6. User pinches to zoom for small text
7. User scrolls horizontally for long lines
8. User taps "Jump to next change" to skip to next modification
9. User taps back arrow to return to file list

**Alternate Paths:**

- **Binary File:** Show message "Binary file (image/pdf/etc.), cannot display diff" with file type icon
- **Very Large File (>5000 lines):** Show warning "Large file, rendering may be slow" with option to view anyway
- **File Not Found:** Show error "File no longer exists" (edge case: file deleted after viewing file list)
- **Git Error:** Show error toast "Unable to load diff" with retry button

### 3.2 Visual Design

**Layout:**
```
┌────────────────────────────────────┐
│ ← Back    src/utils/api.ts    ⋮  │  ← Header with back button, filename, menu
├────────────────────────────────────┤
│  1  │ import { foo } from 'bar';  │  ← Line numbers + code
│  2  │ import { api } from './api';│
│  3+ │ import { baz } from 'baz';  │  ← Green background for added line
│  4  │                              │
│  5- │ const old = 'removed';       │  ← Red background + strikethrough for deleted
│  6  │ const new = 'added';         │
│  7  │                              │
│     │ (scroll continues...)        │
└────────────────────────────────────┘
```

**Color Scheme:**

| Element | Light Mode | Dark Mode | Purpose |
|---------|------------|-----------|---------|
| Added line background | `#E6FFE6` | `#1A3A1A` | Green tint, subtle |
| Added line indicator | `+` in green | `+` in green | Explicit marker |
| Deleted line background | `#FFE6E6` | `#3A1A1A` | Red tint, subtle |
| Deleted line indicator | `-` in red | `-` in red | Explicit marker |
| Line number background | `#F5F5F5` | `#1A1A1A` | Subtle separation |
| Line number text | `#999` | `#666` | Muted |
| Code background | `#FAFAFA` | `#0A0A0A` | App background |

**Line Number Display:**
- Normal lines: `  1  │ code`
- Added lines: `  3+ │ code` (green `+`)
- Deleted lines: `  5- │ code` (red `-`)
- Width: 6 characters + gutter space

**Mobile Considerations:**
- Font size: 12px base (respects system text size settings)
- Line height: 1.5 (18px) for readability
- Pinch-to-zoom: Native browser zoom enabled
- Horizontal scroll: Enabled for lines > viewport width
- Touch targets: "Jump to next" button 48×48px minimum

---

## 4. Technical Approach

### 4.1 Architecture Fit

**Affected Areas:**

| Area | Impact | Description |
|------|--------|-------------|
| Frontend | NEW | New `DiffViewer` component with syntax highlighting |
| Backend | MODIFY | Extend `gitService` to get full file diff with context |
| Database | NONE | No database changes |
| External Services | NONE | No new external services |

**Alignment with Existing Patterns:**
- Uses existing `gitService` from Files Changed View
- Follows component structure pattern (container + presentational components)
- Uses SWR for data fetching like other views
- Syntax highlighting via Shiki (already in architecture)

### 4.2 Data Models

Already defined in `shared/types/index.ts` (from Files Changed View feature):

```typescript
export interface FileDiff {
  path: string;
  status: FileChangeStatus;
  oldPath?: string;          // For renamed files
  language?: string;          // File language for syntax highlighting
  isBinary: boolean;
  isTooBig: boolean;          // Files > 10,000 lines
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;           // Starting line in old file
  oldLines: number;           // Number of lines in old file
  newStart: number;           // Starting line in new file
  newLines: number;           // Number of lines in new file
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;            // Line content (without +/- prefix)
  oldLineNumber?: number;     // Line number in old file (if applicable)
  newLineNumber?: number;     // Line number in new file (if applicable)
}
```

**Additional Client-Side Model:**

```typescript
// For rendered diff view
export interface RenderedDiffLine {
  lineNumber: number;         // Display line number
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
  tokens?: Token[];           // Shiki syntax highlighting tokens
}
```

### 4.3 API Design

**New Endpoint:**

```typescript
GET /api/projects/:encodedPath/files/*filepath
```

**Query Parameters:**
- `context` (optional): Number of context lines (default: 3, use `999999` for full file)

**Response:**
```typescript
{
  data: FileDiff
}
```

**Error Responses:**
- `404` - File not found
- `400` - Not a git repository
- `500` - Git operation failed

### 4.4 Component Structure

```
client/src/components/files/
├── diff/
│   ├── index.ts                      # Barrel export
│   ├── DiffViewer.tsx                # Main container
│   ├── DiffHeader.tsx                # Back button, filename, menu
│   ├── DiffContent.tsx               # Scrollable diff content
│   ├── DiffLine.tsx                  # Individual line with syntax highlighting
│   ├── DiffLineNumber.tsx            # Line number gutter
│   ├── DiffEmptyState.tsx            # No changes or errors
│   ├── DiffLoadingSkeleton.tsx       # Loading state
│   ├── JumpToChangeButton.tsx        # Floating "next change" button
│   └── BinaryFileView.tsx            # Message for binary files
```

### 4.5 Service Layer (Backend)

**Extend `gitService.ts`:**

```typescript
export async function getFileDiff(
  projectPath: string,
  filePath: string,
  options?: { context?: number }
): Promise<FileDiff>
```

**Implementation Steps:**
1. Validate project path and file path
2. Check if file is binary using `git diff --numstat`
3. Get diff using `git diff HEAD -- <file>` with context
4. Parse diff output into structured hunks
5. Detect file language from extension
6. Return `FileDiff` object

**Edge Cases:**
- Binary files: Set `isBinary: true`, return empty hunks
- New files: All lines are "add" type
- Deleted files: All lines are "delete" type
- Renamed files: Include `oldPath` in response
- Large files: Set `isTooBig: true` if > 10,000 lines

### 4.6 Syntax Highlighting

**Library:** Shiki (already in architecture)

**Implementation:**
1. Detect language from file extension
2. Use Shiki to tokenize each line
3. Render tokens with appropriate CSS classes
4. Apply diff highlighting on top of syntax highlighting

**Themes:**
- Light mode: `github-light`
- Dark mode: `github-dark`

**Supported Languages:**
- Priority: JavaScript, TypeScript, Python, Markdown, JSON, YAML, HTML, CSS
- Fallback: Plain text for unsupported languages

---

## 5. Implementation Tasks

### Task 1: Extend Git Service for Full File Diffs (Backend)
**Estimate:** 60 min

Extend `server/src/services/gitService.ts`:
- Add `getFileDiff(projectPath, filePath, options)` function
- Use `simple-git` to get unified diff with full context
- Parse diff output into `FileDiff` structure with hunks
- Detect binary files via `--numstat` flag
- Handle edge cases (new files, deleted files, renames)
- Detect file language from extension

**Files to modify:**
- `server/src/services/gitService.ts`

**Acceptance:**
- Function returns structured `FileDiff` object
- Binary files detected correctly
- New/deleted files handled properly
- Line numbers accurate

---

### Task 2: Implement File Diff API Endpoint (Backend)
**Estimate:** 30 min

Update `server/src/api/projects.ts`:
- Implement `GET /api/projects/:encodedPath/files/*filepath`
- Call `gitService.getFileDiff()`
- Handle query parameter `context` (default: 999999 for full file)
- Validate file path (prevent path traversal)
- Return 404 if file not found

**Files to modify:**
- `server/src/api/projects.ts`

**Acceptance:**
- Endpoint returns diff data correctly
- Path traversal prevented
- Error cases handled

---

### Task 3: Create useFileDiff Hook (Frontend)
**Estimate:** 30 min

Create `client/src/hooks/useFileDiff.ts`:
- Fetch file diff from API using SWR
- Accept `projectPath` and `filePath` parameters
- No polling (diff is static until refresh)
- Return loading, error, and data states

**Files to create:**
- `client/src/hooks/useFileDiff.ts`

**Acceptance:**
- Hook fetches diff correctly
- Handles loading and error states
- Returns `FileDiff` data

---

### Task 4: Create Language Detector Utility (Frontend)
**Estimate:** 20 min

Create `client/src/lib/languageDetector.ts`:
- Map file extensions to Shiki language identifiers
- Support common languages (ts, tsx, js, jsx, py, md, json, yaml, html, css, etc.)
- Fallback to 'text' for unknown extensions

**Files to create:**
- `client/src/lib/languageDetector.ts`

**Acceptance:**
- Correctly maps extensions to languages
- Returns 'text' for unknown types

---

### Task 5: Create DiffLineNumber Component (Frontend)
**Estimate:** 30 min

Create `client/src/components/files/diff/DiffLineNumber.tsx`:
- Display line number with proper width (6 chars)
- Show `+` or `-` indicator for added/deleted lines
- Color-coded indicators (green/red)
- Muted color for normal lines

**Files to create:**
- `client/src/components/files/diff/DiffLineNumber.tsx`

**Acceptance:**
- Line numbers displayed correctly
- Indicators show for add/delete
- Visual design matches spec

---

### Task 6: Create DiffLine Component (Frontend)
**Estimate:** 45 min

Create `client/src/components/files/diff/DiffLine.tsx`:
- Render a single line of diff with syntax highlighting
- Use Shiki for tokenization
- Apply background color based on line type (add/delete/context)
- Include line number via `DiffLineNumber` component
- Horizontal scroll for long lines

**Files to create:**
- `client/src/components/files/diff/DiffLine.tsx`

**Acceptance:**
- Syntax highlighting works
- Background colors applied correctly
- Horizontal scroll enabled
- Monospace font applied

---

### Task 7: Create DiffContent Component (Frontend)
**Estimate:** 45 min

Create `client/src/components/files/diff/DiffContent.tsx`:
- Container for all diff lines
- Iterate through hunks and render lines
- Track current line numbers (old vs new)
- Support virtualization for large files (use `react-window` or similar)
- Vertically scrollable

**Files to create:**
- `client/src/components/files/diff/DiffContent.tsx`

**Acceptance:**
- All diff lines rendered correctly
- Line numbers sequential and accurate
- Scrolling smooth for large files
- Virtualization works for 1000+ lines

---

### Task 8: Create JumpToChangeButton Component (Frontend)
**Estimate:** 30 min

Create `client/src/components/files/diff/JumpToChangeButton.tsx`:
- Floating button (bottom-right corner)
- "Jump to next change" action
- Scrolls to next add/delete line
- Hidden when at last change
- Shows count: "3 changes"

**Files to create:**
- `client/src/components/files/diff/JumpToChangeButton.tsx`

**Acceptance:**
- Button positioned correctly (thumb-friendly)
- Scrolls to next change on tap
- Count displayed accurately
- Hidden at last change

---

### Task 9: Create DiffHeader Component (Frontend)
**Estimate:** 30 min

Create `client/src/components/files/diff/DiffHeader.tsx`:
- Back button (left)
- File path (truncated if long, show full on tap)
- Menu button (right) - for future actions
- Sticky header (stays at top when scrolling)

**Files to create:**
- `client/src/components/files/diff/DiffHeader.tsx`

**Acceptance:**
- Back navigation works
- File path displayed clearly
- Header sticky on scroll

---

### Task 10: Create BinaryFileView Component (Frontend)
**Estimate:** 20 min

Create `client/src/components/files/diff/BinaryFileView.tsx`:
- Message: "Binary file, cannot display diff"
- Icon representing file type (image, pdf, etc.)
- File path displayed
- Back button to return to file list

**Files to create:**
- `client/src/components/files/diff/BinaryFileView.tsx`

**Acceptance:**
- Clear message displayed
- Icon matches file type
- User can navigate back

---

### Task 11: Create DiffLoadingSkeleton Component (Frontend)
**Estimate:** 20 min

Create `client/src/components/files/diff/DiffLoadingSkeleton.tsx`:
- Skeleton loader showing line numbers and code placeholders
- Animated shimmer effect
- Realistic structure (like actual diff)

**Files to create:**
- `client/src/components/files/diff/DiffLoadingSkeleton.tsx`

**Acceptance:**
- Loading state looks polished
- Animation smooth
- Layout matches real diff

---

### Task 12: Create DiffEmptyState Component (Frontend)
**Estimate:** 20 min

Create `client/src/components/files/diff/DiffEmptyState.tsx`:
- Handle error states (file not found, git error)
- Empty state if file has no changes (edge case)
- Retry button for errors

**Files to create:**
- `client/src/components/files/diff/DiffEmptyState.tsx`

**Acceptance:**
- Error states handled gracefully
- Retry button works
- Messages clear and helpful

---

### Task 13: Create DiffViewer Container (Frontend)
**Estimate:** 45 min

Create `client/src/components/files/diff/DiffViewer.tsx`:
- Main container component
- Uses `useFileDiff` hook
- Renders appropriate child components based on state
- Handles binary files, loading, errors, and success states
- Passes file path from route params

**Files to create:**
- `client/src/components/files/diff/DiffViewer.tsx`
- `client/src/components/files/diff/index.ts` (barrel export)

**Acceptance:**
- Container orchestrates all states correctly
- All child components integrated
- Route params handled

---

### Task 14: Integrate DiffViewer into App Routing (Frontend)
**Estimate:** 30 min

Update `client/src/App.tsx`:
- Replace placeholder diff route with real `DiffViewer`
- Pass file path from URL params
- Maintain navigation state (selected file)
- Back navigation returns to Files Changed View with scroll position

**Files to modify:**
- `client/src/App.tsx`

**Acceptance:**
- Navigation to diff view works
- Back navigation works
- File path passed correctly

---

### Task 15: Add Pinch-to-Zoom Support (Frontend)
**Estimate:** 30 min

Enable native pinch-to-zoom for diff view:
- Set viewport meta tag to allow user scaling
- Test on iPhone Safari
- Ensure zoom doesn't break layout

**Files to modify:**
- `client/index.html` (viewport meta tag)
- `client/src/components/files/diff/DiffViewer.tsx` (CSS to support zoom)

**Acceptance:**
- Pinch-to-zoom works on mobile
- Layout remains intact when zoomed
- Double-tap zoom works

---

### Task 16: Optimize Performance for Large Files (Frontend)
**Estimate:** 45 min

Implement optimizations:
- Virtualize line rendering using `react-window`
- Lazy load syntax highlighting (only visible lines)
- Show warning for files > 5000 lines
- Add "Load full file" button for very large files

**Files to modify:**
- `client/src/components/files/diff/DiffContent.tsx`

**Acceptance:**
- Files with 1000+ lines render smoothly
- Scrolling performance maintained
- Warning shown for very large files

---

## 6. Test Plan

### Unit Tests (Post-Implementation)
- `gitService.test.ts` (extend) - Test `getFileDiff()` with various scenarios
- `useFileDiff.test.ts` - Mock API, test hook states
- `languageDetector.test.ts` - Test extension to language mapping
- `DiffLine.test.tsx` - Test line rendering for all types
- `DiffContent.test.tsx` - Test hunk rendering
- `DiffViewer.test.tsx` - Test state orchestration

### Integration Tests (Post-Implementation)
- API endpoint returns correct diff structure
- Full flow: Files Changed → Tap File → Diff Viewer displays
- Binary file detection works end-to-end
- Error handling for non-existent files

### Manual Testing Checklist
- [ ] Test with TypeScript file (syntax highlighting)
- [ ] Test with Python file (different language)
- [ ] Test with Markdown file (different highlighting)
- [ ] Test with binary file (image) - should show message
- [ ] Test with very long lines - horizontal scroll works
- [ ] Test with large file (1000+ lines) - performance acceptable
- [ ] Test pinch-to-zoom on iPhone Safari
- [ ] Test back navigation preserves scroll position in Files Changed View
- [ ] Test "Jump to next change" button
- [ ] Test in light and dark mode - colors visible
- [ ] Test with different system font sizes

---

## 7. UI/UX Notes

### Visual Design

**Line Height & Spacing:**
- Line height: 1.5 (18px for 12px font)
- Line number gutter width: 60px (accommodates 6 digits)
- Horizontal padding: 8px after line numbers, 16px after code

**Diff Highlighting:**
- Additions: Subtle green background (#E6FFE6 light, #1A3A1A dark)
- Deletions: Subtle red background (#FFE6E6 light, #3A1A1A dark) + strikethrough text
- Context: No background, normal text

**Syntax Highlighting:**
- Use Shiki with `github-light` and `github-dark` themes
- Diff highlighting applied via background color, syntax highlighting via text color

**Monospace Font:**
- Font family: `SF Mono, Monaco, Menlo, Consolas, monospace`
- Font size: 12px base (respects system accessibility settings)

### Mobile Considerations

**Touch Targets:**
- Back button: 48×48px minimum
- "Jump to next change" button: 48×48px minimum
- Menu button: 48×48px minimum

**Scrolling:**
- Vertical: Main scroll for viewing all lines
- Horizontal: Per-line scroll for long lines
- Pinch-to-zoom: Native browser zoom enabled

**Performance:**
- Lazy render lines outside viewport
- Limit initial render to 100 lines, load more on scroll

**Accessibility:**
- Respect system font size settings
- High contrast mode support
- Screen reader: Announce line numbers and change types

### Empty States

**No Changes (Edge Case):**
- Message: "This file has no changes"
- Subtext: "It may have been reverted"

**Binary File:**
- Icon: File type icon (image, video, pdf, etc.)
- Message: "Binary file, cannot display diff"
- Subtext: File path shown

**Error:**
- Icon: Warning icon
- Message: "Unable to load file diff"
- Action: "Retry" button

---

## 8. Dependencies

### Required Packages

**Backend:**
- `simple-git` (already installed for Files Changed View)

**Frontend:**
- `shiki` - Syntax highlighting (already in architecture)
- `react-window` (optional) - Virtualized scrolling for large files

### Related Features

- **Files Changed View ✅** - Provides navigation to diff view
- **Voice Input** (Feature #12) - Unrelated, can be built in parallel
- **iMessage Notifications** (Feature #13) - Unrelated, can be built in parallel

---

## 9. Notes

### Design Decisions

**Unified Diff (Not Side-by-Side):**
- Rationale: Mobile screens too narrow for side-by-side
- Approach: Show deletions inline with strikethrough, additions with green background

**Full File Context:**
- Rationale: Users need to understand surrounding code, not just changes
- Approach: Set git diff context to high value (999999) to get full file

**Syntax Highlighting Over Diff Highlighting:**
- Rationale: Code readability is primary, diff indication secondary
- Approach: Syntax colors on text, diff colors on background

**Virtualization Threshold:**
- Files < 1000 lines: Render all (simple)
- Files 1000-5000 lines: Virtualize (performance)
- Files > 5000 lines: Show warning + "Load anyway" button

### Security Considerations

**Path Traversal Prevention:**
- Validate file path stays within project directory
- Use `path.join()` and check result starts with project path

**Binary File Safety:**
- Detect binary files before attempting to read
- Don't try to render binary data as text (can cause crashes)

### Future Enhancements (Out of Scope for MVP)

- Collapse/expand hunks
- View file at specific commit
- Compare with different branches
- Split view (old vs new) for desktop
- Copy code snippet to clipboard
- Search within file
- Comment on specific lines

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Large files cause performance issues | Medium | High | Implement virtualization early, test with large files |
| Syntax highlighting increases bundle size | Medium | Medium | Use dynamic imports for Shiki themes |
| Complex diff parsing bugs | Medium | High | Comprehensive unit tests for parser, test many file types |
| Mobile rendering breaks on some devices | Low | Medium | Test on real iPhone Safari, use safe CSS |
| Git errors not handled gracefully | Medium | Medium | Wrap all git operations in try/catch, provide helpful error messages |

---

## 11. Success Metrics

**MVP Success:**
- [ ] Users can view diffs for all common file types
- [ ] Syntax highlighting works correctly
- [ ] Performance acceptable on iPhone for typical files (< 500 lines)
- [ ] Zero critical bugs in first week of use

**Post-Launch Metrics (Manual Observation):**
- How often do users use the diff view vs just file list?
- Do users immediately return to laptop or feel confident with mobile review?
- How often do users encounter performance issues (large files)?

---

*Created: 2026-01-14*  
*Status: Planning Complete, Ready for Implementation*

