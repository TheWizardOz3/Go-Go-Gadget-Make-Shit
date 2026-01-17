# Feature: File Tree View

> **Status**: 🚧 In Progress
> **Started**: 2026-01-17
> **Milestone**: V0.75
> **Feature Doc Version**: 2.0

---

## Overview

This feature enables users to browse the project's committed file structure and view file contents directly from their phone. Users can explore the project directory tree, tap any file to view its contents with syntax highlighting and line numbers, and optionally open files on GitHub for prettier rendering (especially useful for markdown).

**Key Simplification:** We use Git commands (`git ls-tree`, `git show`) to read committed files rather than the filesystem. This eliminates the need for `.gitignore` parsing, binary detection, and file size checking—Git handles all of that.

## User Story

> As a developer monitoring Claude from my phone, I want to browse my project's file structure and view file contents in-app, so I can understand the project context and review code without being at my laptop.

## Problem Statement

Currently, the app only shows files that have uncommitted changes (via git status). Users cannot:
- Browse the overall project structure
- Navigate to files that haven't changed
- View the actual contents of any committed file

This limits the user's ability to understand project context when reviewing Claude's work.

## Technical Approach

**Git-based file access (not filesystem):**

| Approach         | Command                           | Benefit                                 |
|------------------|-----------------------------------|-----------------------------------------|
| Get file tree    | `git ls-tree -r HEAD --name-only` | Only tracked files, no gitignore needed |
| Get file content | `git show HEAD:filepath`          | Committed content, git handles binary   |

This is simpler and safer than reading the filesystem directly.

---

## Requirements

### Functional Requirements

| ID   | Requirement                                               | Priority | Notes                                      |
|------|-----------------------------------------------------------|----------|--------------------------------------------|
| FR-1 | Display project files in a collapsible tree structure     | MUST     | Root-level collapsed by default            |
| FR-2 | Show file icons based on file type/extension              | MUST     | Visual identification                      |
| FR-3 | Tap file to view contents in-app with syntax highlighting | MUST     | Primary interaction; line numbers required |
| FR-4 | Optional "View on GitHub" link for files                  | MUST     | Secondary action; opens in new tab         |
| FR-5 | Show folder expand/collapse indicators                    | MUST     | Chevron icons                              |
| FR-6 | Remember expanded folder state during session             | SHOULD   | Persist in component state                 |
| FR-7 | Back navigation from file content to tree                 | MUST     | Easy return to browsing                    |

### Non-Functional Requirements

| Requirement   | Target                  | Measurement       |
|---------------|-------------------------|-------------------|
| Performance   | < 500ms tree load       | API response time |
| Performance   | < 300ms file content    | API response time |
| Accessibility | Keyboard navigable tree | WCAG 2.1 AA       |

### Acceptance Criteria

- [ ] **Given** I open the file tree view, **when** the project loads, **then** I see the root-level files and folders
- [ ] **Given** I tap a folder, **when** it expands, **then** I see its contents with proper indentation
- [ ] **Given** I tap a file, **when** it loads, **then** I see the file contents with syntax highlighting and line numbers
- [ ] **Given** I'm viewing a file, **when** I tap the GitHub icon, **then** GitHub opens to that file
- [ ] **Given** I'm viewing a file, **when** I tap back, **then** I return to the tree with my place preserved

### Out of Scope

- Viewing uncommitted/local changes (use "Files Changed" view for that)
- File editing from mobile
- Searching/filtering files
- Non-GitHub hosting support (GitLab, Bitbucket)
- Viewing file history/blame

---

## Design Specification

### Visual Design

**Tab Navigation:**
```
┌────────────────────────────────────────────────────┐
│  [Conversation]  [Files Changed]  [Browse Files]   │
│                                        ▲ active    │
└────────────────────────────────────────────────────┘
```

**File Tree View (Browse Mode):**
```
┌────────────────────────────────────────────────────┐
│  Browse Files                                      │
├────────────────────────────────────────────────────┤
│  ▼ 📁 client/                                      │
│      ▼ 📁 src/                                     │
│          ▶ 📁 components/                          │
│          ▶ 📁 hooks/                               │
│          📄 App.tsx                                │  ← Tap to view
│          📄 main.tsx                               │
│          🎨 index.css                              │
│      📦 package.json                               │
│  ▼ 📁 server/                                      │
│      ▼ 📁 src/                                     │
│          ▶ 📁 api/                                 │
│          📄 index.ts                               │
│  📝 README.md                                      │
│  📄 package.json                                   │
└────────────────────────────────────────────────────┘
```

**File Content View (after tapping a file):**
```
┌────────────────────────────────────────────────────┐
│  ← Back              App.tsx            GitHub ↗   │
├────────────────────────────────────────────────────┤
│  client/src/App.tsx · 45 lines · TypeScript        │
├────────────────────────────────────────────────────┤
│   1 │ import { useState } from 'react';            │
│   2 │ import { useProjects } from './hooks';       │
│   3 │                                              │
│   4 │ export function App() {                      │
│   5 │   const { projects } = useProjects();        │
│   6 │                                              │
│   7 │   return (                                   │
│   8 │     <div className="min-h-screen">           │
│   9 │       {/* ... */}                            │
│  10 │     </div>                                   │
│  11 │   );                                         │
│  12 │ }                                            │
│     │                                              │
│  ⋮  │ (scroll for more)                           │
└────────────────────────────────────────────────────┘
```

### File Icons by Extension

| Extension(s)    | Icon | Color       |
|-----------------|------|-------------|
| .ts, .tsx       | 📘   | Blue        |
| .js, .jsx       | 📒   | Yellow      |
| .json           | 📦   | Orange      |
| .md             | 📝   | Gray        |
| .css, .scss     | 🎨   | Pink/Purple |
| .html           | 🌐   | Orange      |
| .py             | 🐍   | Green       |
| Images          | 🖼️  | —           |
| Default/Unknown | 📄   | Gray        |
| Folder          | 📁   | Yellow      |

### Touch Targets

- **File row:** Full width, 44px min height — tap anywhere to open file
- **Folder row:** Full width, 44px min height — tap anywhere to expand/collapse
- **Back button:** 44×44px touch target
- **GitHub link:** 44×44px touch target
- **Indentation:** 16px per level

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                                │
│                                                                  │
│  ┌───────────────────┐    ┌──────────────────┐                  │
│  │ FileTreeView.tsx  │───►│ useFileTree.ts   │                  │
│  │ (tree browser)    │    │ (tree fetching)  │                  │
│  └─────────┬─────────┘    └────────┬─────────┘                  │
│            │                       │                             │
│            │ onSelectFile          │ GET /api/projects/:id/tree  │
│            ▼                       │                             │
│  ┌───────────────────┐    ┌──────────────────┐                  │
│  │ FileContentView   │───►│ useFileContent   │                  │
│  │ (content viewer)  │    │ (content fetch)  │                  │
│  └───────────────────┘    └────────┬─────────┘                  │
│                                    │                             │
│                                    │ GET /api/projects/:id/      │
│                                    │   content/:path             │
└────────────────────────────────────┼─────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Express)                                               │
│                                                                  │
│  ┌───────────────────┐    ┌──────────────────┐                  │
│  │ projects.ts       │───►│ gitService.ts    │                  │
│  │ (route handlers)  │    │ (git commands)   │                  │
│  └───────────────────┘    └──────────────────┘                  │
│                                    │                             │
│                                    ▼                             │
│                           git ls-tree, git show                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Design

**Endpoint 1: GET /api/projects/:encodedPath/tree**

Returns the committed file tree structure.

**Query Parameters:**
- `path` (optional): Subdirectory path to fetch

**Response:**
```typescript
interface FileTreeResponse {
  /** Root or subdirectory path */
  path: string;
  /** GitHub repo URL (null if not a GitHub repo) */
  githubUrl: string | null;
  /** Current git branch */
  branch: string;
  /** Tree entries (files and folders) */
  entries: FileTreeEntry[];
}

interface FileTreeEntry {
  /** File or folder name */
  name: string;
  /** Relative path from project root */
  path: string;
  /** Entry type */
  type: 'file' | 'directory';
  /** File extension (null for directories) */
  extension: string | null;
}
```

---

**Endpoint 2: GET /api/projects/:encodedPath/content/*filepath**

Returns the committed content of a file.

**Response:**
```typescript
interface FileContentResponse {
  /** File path */
  path: string;
  /** File name */
  name: string;
  /** File extension */
  extension: string | null;
  /** Detected language for syntax highlighting */
  language: string;
  /** File content (text) */
  content: string;
  /** Line count */
  lineCount: number;
  /** GitHub URL for this file (null if not GitHub) */
  githubUrl: string | null;
}
```

**Error Cases:**
- 404: File not found in git
- 400: Path traversal attempt
- 400: Binary file (cannot display)

---

### New Files to Create

| File                                                   | Purpose                  | Est. Lines |
|--------------------------------------------------------|--------------------------|------------|
| `client/src/components/files/tree/FileTreeView.tsx`    | Tree + content container | ~120       |
| `client/src/components/files/tree/FileTreeNode.tsx`    | Recursive tree node      | ~100       |
| `client/src/components/files/tree/FileContentView.tsx` | File content viewer      | ~120       |
| `client/src/components/files/tree/FileIcon.tsx`        | File type icon component | ~60        |
| `client/src/components/files/tree/index.ts`            | Barrel export            | ~5         |
| `client/src/hooks/useFileTree.ts`                      | Tree data fetching hook  | ~40        |
| `client/src/hooks/useFileContent.ts`                   | Content fetching hook    | ~40        |

### Files to Modify

| File                                | Changes                                      | Est. Impact |
|-------------------------------------|----------------------------------------------|-------------|
| `shared/types/index.ts`             | Add FileTreeEntry, FileContentResponse types | ~25 lines   |
| `server/src/services/gitService.ts` | Add tree, content, and GitHub URL functions  | ~80 lines   |
| `server/src/api/projects.ts`        | Add /tree and /content routes                | ~50 lines   |
| `client/src/App.tsx`                | Add FileTreeView route/tab                   | ~15 lines   |

---

## Implementation Tasks

| #  | Task                                            | Est. Time | Dependencies | Status |
|----|-------------------------------------------------|-----------|--------------|--------|
| 1  | Add FileTree types to shared/types              | 15 min    | —            | ✅      |
| 2  | Add `getCommittedTree` to gitService            | 30 min    | Task 1       | ✅      |
| 3  | Add `getCommittedFileContent` to gitService     | 30 min    | Task 1       | ✅      |
| 4  | Add `getGitHubUrl` helper to gitService         | 20 min    | —            | ✅      |
| 5  | Add `/tree` and `/content` API endpoints        | 30 min    | Tasks 2-4    | ✅      |
| 6  | Create `useFileTree` and `useFileContent` hooks | 30 min    | Task 5       | ✅      |
| 7  | Create `FileIcon` component                     | 20 min    | —            | ✅      |
| 8  | Create `FileTreeNode` component                 | 40 min    | Tasks 6, 7   | ✅      |
| 9  | Create `FileContentView` component              | 45 min    | Task 6       | ✅      |
| 10 | Create `FileTreeView` main component            | 40 min    | Tasks 8, 9   | ✅      |
| 11 | Integrate into App navigation                   | 20 min    | Task 10      | ✅      |
| 12 | Add tests                                       | 60 min    | Tasks 2-10   | ✅      |

**Total Estimated Time**: ~6.5 hours

---

## Test Plan

### Unit Tests

**gitService additions** (10 tests):
- `getCommittedTree` lists files from git ls-tree
- `getCommittedTree` builds tree structure from flat paths
- `getCommittedTree` handles subdirectory path
- `getCommittedTree` handles empty directory
- `getCommittedFileContent` returns file content
- `getCommittedFileContent` returns correct line count
- `getCommittedFileContent` detects language from extension
- `getCommittedFileContent` throws for binary files
- `getGitHubUrl` extracts URL from SSH remote
- `getGitHubUrl` extracts URL from HTTPS remote

### Component Tests

**FileTreeNode.test.tsx** (8 tests):
- Renders file with correct icon
- Renders folder with chevron
- Expands folder on click
- Collapses folder on click
- Calls onSelectFile when file clicked
- Applies correct indentation for depth
- Has correct ARIA attributes
- Truncates long file names

**FileContentView.test.tsx** (8 tests):
- Renders file content with line numbers
- Shows file path and info
- Shows GitHub link when available
- Back button calls onBack
- Content is scrollable
- Shows loading state
- Shows error state
- Accessible structure

### Manual Testing Checklist

- [ ] File tree loads and displays project structure
- [ ] Folders expand/collapse smoothly
- [ ] Tapping file shows content with line numbers
- [ ] Back button returns to tree
- [ ] Tree state is preserved after viewing file
- [ ] GitHub link opens correct file
- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 15 Pro Max (large screen)

---

## Edge Cases

| Scenario                   | Expected Behavior                           |
|----------------------------|---------------------------------------------|
| Non-git project            | Show error "Not a git repository"           |
| Non-GitHub git repo        | Show files, hide GitHub links               |
| Empty directory            | Show empty folder                           |
| Binary files               | Show "Binary file" message with GitHub link |
| File not in git            | 404 error                                   |
| Very deep nesting          | Works, may be hard to navigate on mobile    |
| Files with very long names | Truncate with ellipsis                      |

---

## Related Documents

- [Files Changed View](./files-changed-view.md) — Similar patterns for file display
- [File Diff View](./file-diff-view.md) — Reuse syntax highlighting approach
- [Project Status](../project_status.md)

---

*Created: 2026-01-17*
*Last Updated: 2026-01-17*
