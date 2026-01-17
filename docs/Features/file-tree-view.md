# Feature: File Tree View

> **Status**: 📋 Planned
> **Planned Start**: TBD (after Voice Input UX Improvements)
> **Milestone**: V0.75
> **Feature Doc Version**: 1.1

---

## Overview

This feature enables users to browse the project's file structure and view file contents directly from their phone. Instead of only seeing files that have changed (current behavior), users can explore the entire project directory tree, tap any file to view its contents with syntax highlighting, and optionally open files on GitHub for prettier rendering (especially useful for markdown).

## User Story

> As a developer monitoring Claude from my phone, I want to browse my project's file structure and view file contents in-app, so I can understand the project context and review code without being at my laptop.

## Problem Statement

Currently, the app only shows files that have uncommitted changes (via git status). Users cannot:
- Browse the overall project structure
- Navigate to files that haven't changed
- View the actual contents of any file
- Understand the broader codebase context when reviewing Claude's work

This limits the user's ability to understand project context when reviewing Claude's work or directing the agent.

## Business Value

- **User Impact:** Full project browsing and file viewing from mobile; understand context without laptop
- **Technical Impact:** Reuses diff viewer's syntax highlighting; foundation for future file operations
- **Strategic Impact:** Makes the app a complete mobile code browser, not just a change viewer

---

## Requirements

### Functional Requirements

| ID    | Requirement                                               | Priority | Notes                                           |
|-------|-----------------------------------------------------------|----------|-------------------------------------------------|
| FR-1  | Display project files in a collapsible tree structure     | MUST     | Root-level collapsed by default                 |
| FR-2  | Show file icons based on file type/extension              | MUST     | Visual identification                           |
| FR-3  | Tap file to view contents in-app with syntax highlighting | MUST     | Primary interaction; reuse diff viewer patterns |
| FR-4  | Optional "View on GitHub" link for files                  | MUST     | Secondary action; opens in new tab              |
| FR-5  | Respect .gitignore (hide ignored files)                   | MUST     | No node_modules, dist, etc.                     |
| FR-6  | Show folder expand/collapse indicators                    | MUST     | Chevron icons                                   |
| FR-7  | Remember expanded folder state during session             | SHOULD   | Persist in component state                      |
| FR-8  | Back navigation from file content to tree                 | MUST     | Easy return to browsing                         |
| FR-9  | Show file count badges on folders                         | COULD    | Optional UX enhancement                         |
| FR-10 | Filter/search files by name                               | COULD    | Future enhancement                              |

### Non-Functional Requirements

| Requirement   | Target                  | Measurement           |
|---------------|-------------------------|-----------------------|
| Performance   | < 500ms tree load       | API response time     |
| Performance   | < 300ms file content    | API response time     |
| Performance   | < 100ms folder expand   | UI responsiveness     |
| Scalability   | Handle 10,000+ files    | Large monorepos       |
| Scalability   | Files up to 1MB         | Reasonable file sizes |
| Accessibility | Keyboard navigable tree | WCAG 2.1 AA           |

### Acceptance Criteria

- [ ] **Given** I open the file tree view, **when** the project loads, **then** I see the root-level files and folders
- [ ] **Given** I tap a folder, **when** it expands, **then** I see its contents with proper indentation
- [ ] **Given** I tap a file, **when** it loads, **then** I see the file contents with syntax highlighting
- [ ] **Given** I'm viewing a file, **when** I tap the GitHub icon, **then** GitHub opens to that file
- [ ] **Given** I'm viewing a file, **when** I tap back, **then** I return to the tree with my place preserved
- [ ] **Given** the project has a .gitignore, **when** viewing the tree, **then** ignored files are hidden
- [ ] **Given** the project is not a GitHub repo, **when** viewing files, **then** GitHub links are hidden
- [ ] **Given** I view a markdown file, **when** I tap "View on GitHub", **then** I see GitHub's rendered markdown

### Out of Scope

- File editing from mobile
- Searching/filtering files (future enhancement)
- Non-GitHub hosting support (GitLab, Bitbucket) — for "view on GitHub" feature only
- Viewing file history/blame
- Markdown rendering in-app (use GitHub for pretty markdown)

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

### Accessibility

- `role="tree"` and `role="treeitem"` ARIA attributes for tree
- `aria-expanded` for folders
- Keyboard navigation (arrow keys, Enter to expand/open)
- Screen reader announces folder state and file names
- File content viewer has proper heading structure

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
│  │ projects.ts       │───►│ fileTreeService  │                  │
│  │ (route handlers)  │    │ (tree + content) │                  │
│  └───────────────────┘    └────────┬─────────┘                  │
│                                    │                             │
│                                    ▼                             │
│                           ┌──────────────────┐                  │
│                           │ gitService.ts    │                  │
│                           │ (GitHub URL)     │                  │
│                           └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Design

**Endpoint 1: GET /api/projects/:encodedPath/tree**

Returns the file tree structure for navigation.

**Query Parameters:**
- `path` (optional): Subdirectory path to fetch (for lazy loading)

**Response:**
```typescript
interface FileTreeResponse {
  /** Root or subdirectory path */
  path: string;
  /** GitHub repo URL (null if not a GitHub repo) */
  githubUrl: string | null;
  /** Current git branch */
  branch: string | null;
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
  /** Children (only populated for directories if fetched) */
  children?: FileTreeEntry[];
}
```

---

**Endpoint 2: GET /api/projects/:encodedPath/content/*filepath**

Returns the raw content of a file for viewing.

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
  /** File size in bytes */
  size: number;
  /** Line count */
  lineCount: number;
  /** GitHub URL for this file (null if not GitHub) */
  githubUrl: string | null;
  /** Is file binary? (return early if true) */
  isBinary: boolean;
  /** Is file too large? (> 1MB) */
  isTooBig: boolean;
}
```

**Error Cases:**
- 404: File not found
- 400: File is binary (cannot display)
- 400: File too large (> 1MB)
- 400: Path traversal attempt

---

### New Files to Create

| File                                                   | Purpose                   | Est. Lines |
|--------------------------------------------------------|---------------------------|------------|
| `server/src/services/fileTreeService.ts`               | Tree scanning + content   | ~250       |
| `server/src/services/fileTreeService.test.ts`          | Unit tests                | ~200       |
| `client/src/components/files/tree/FileTreeView.tsx`    | Tree navigation component | ~150       |
| `client/src/components/files/tree/FileTreeNode.tsx`    | Recursive tree node       | ~120       |
| `client/src/components/files/tree/FileContentView.tsx` | File content viewer       | ~180       |
| `client/src/components/files/tree/FileIcon.tsx`        | File type icon component  | ~80        |
| `client/src/components/files/tree/index.ts`            | Barrel export             | ~5         |
| `client/src/hooks/useFileTree.ts`                      | Tree data fetching hook   | ~60        |
| `client/src/hooks/useFileContent.ts`                   | Content fetching hook     | ~60        |
| `client/src/hooks/useFileTree.test.ts`                 | Hook tests                | ~80        |
| `client/src/hooks/useFileContent.test.ts`              | Hook tests                | ~80        |

### Files to Modify

| File                                   | Changes                       | Est. Impact |
|----------------------------------------|-------------------------------|-------------|
| `server/src/api/projects.ts`           | Add /tree and /content routes | ~60 lines   |
| `server/src/services/gitService.ts`    | Add getGitHubUrl function     | ~50 lines   |
| `client/src/App.tsx`                   | Add FileTreeView route/tab    | ~15 lines   |
| `client/src/components/files/index.ts` | Export tree components        | ~5 lines    |
| `shared/types/index.ts`                | Add FileTree types            | ~30 lines   |

### Implementation Details

#### 1. File Tree Service (Backend)

```typescript
// server/src/services/fileTreeService.ts
import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';

interface GetFileTreeOptions {
  projectPath: string;
  subPath?: string;
  maxDepth?: number;
}

export async function getFileTree(options: GetFileTreeOptions): Promise<FileTreeEntry[]> {
  const { projectPath, subPath = '', maxDepth = 1 } = options;
  const targetPath = path.join(projectPath, subPath);
  
  // Load .gitignore rules
  const ig = await loadGitignore(projectPath);
  
  // Read directory entries
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  
  // Filter and transform entries
  const result: FileTreeEntry[] = [];
  
  for (const entry of entries) {
    const relativePath = path.join(subPath, entry.name);
    
    // Skip hidden files and gitignored files
    if (entry.name.startsWith('.') || ig.ignores(relativePath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        extension: null,
        children: maxDepth > 1 
          ? await getFileTree({ projectPath, subPath: relativePath, maxDepth: maxDepth - 1 })
          : undefined,
      });
    } else {
      result.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
        extension: path.extname(entry.name) || null,
      });
    }
  }
  
  // Sort: folders first, then alphabetically
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function loadGitignore(projectPath: string): Promise<ReturnType<typeof ignore>> {
  const ig = ignore();
  
  // Always ignore common directories
  ig.add(['node_modules', '.git', 'dist', 'build', '.next', '.cache']);
  
  try {
    const gitignorePath = path.join(projectPath, '.gitignore');
    const content = await fs.readFile(gitignorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore file
  }
  
  return ig;
}
```

#### 2. File Content Service (Backend)

```typescript
// Addition to server/src/services/fileTreeService.ts

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

interface GetFileContentOptions {
  projectPath: string;
  filePath: string;
}

export async function getFileContent(options: GetFileContentOptions): Promise<FileContentResponse> {
  const { projectPath, filePath } = options;
  
  // Validate path (prevent traversal)
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
    throw new Error('Invalid file path');
  }
  
  const fullPath = path.join(projectPath, filePath);
  
  // Check file exists and get stats
  const stats = await fs.stat(fullPath);
  
  if (!stats.isFile()) {
    throw new Error('Not a file');
  }
  
  // Check file size
  if (stats.size > MAX_FILE_SIZE) {
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath) || null,
      language: detectLanguage(filePath),
      content: '',
      size: stats.size,
      lineCount: 0,
      githubUrl: null,
      isBinary: false,
      isTooBig: true,
    };
  }
  
  // Read file content
  const buffer = await fs.readFile(fullPath);
  
  // Check if binary
  const isBinary = isBinaryFile(buffer);
  if (isBinary) {
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath) || null,
      language: 'binary',
      content: '',
      size: stats.size,
      lineCount: 0,
      githubUrl: null,
      isBinary: true,
      isTooBig: false,
    };
  }
  
  const content = buffer.toString('utf-8');
  const lineCount = content.split('\n').length;
  
  // Get GitHub URL
  const githubUrl = await getGitHubFileUrl(projectPath, filePath);
  
  return {
    path: filePath,
    name: path.basename(filePath),
    extension: path.extname(filePath) || null,
    language: detectLanguage(filePath),
    content,
    size: stats.size,
    lineCount,
    githubUrl,
    isBinary: false,
    isTooBig: false,
  };
}

function isBinaryFile(buffer: Buffer): boolean {
  // Check for null bytes in first 8KB (common binary indicator)
  const sample = buffer.subarray(0, 8192);
  return sample.includes(0);
}
```

#### 3. GitHub URL Helper (Backend)

```typescript
// Addition to server/src/services/gitService.ts

/**
 * Get the GitHub repository URL from git remote
 */
export async function getGitHubUrl(projectPath: string): Promise<string | null> {
  try {
    const git = createGit(projectPath);
    const remotes = await git.getRemotes(true);
    
    const origin = remotes.find(r => r.name === 'origin');
    if (!origin?.refs?.fetch) return null;
    
    const url = origin.refs.fetch;
    
    // Convert SSH URL to HTTPS
    if (url.startsWith('git@github.com:')) {
      return url
        .replace('git@github.com:', 'https://github.com/')
        .replace(/\.git$/, '');
    }
    
    // Already HTTPS URL
    if (url.includes('github.com')) {
      return url.replace(/\.git$/, '');
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get GitHub URL for a specific file
 */
export async function getGitHubFileUrl(
  projectPath: string, 
  filePath: string
): Promise<string | null> {
  const repoUrl = await getGitHubUrl(projectPath);
  if (!repoUrl) return null;
  
  const branch = await getCurrentBranch(projectPath);
  return `${repoUrl}/blob/${branch}/${filePath}`;
}

/**
 * Get the current git branch name
 */
export async function getCurrentBranch(projectPath: string): Promise<string> {
  try {
    const git = createGit(projectPath);
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim() || 'main';
  } catch {
    return 'main';
  }
}
```

#### 4. Frontend File Content Viewer

```typescript
// client/src/components/files/tree/FileContentView.tsx
import { useFileContent } from '@/hooks/useFileContent';
import { cn } from '@/lib/cn';

interface FileContentViewProps {
  encodedPath: string;
  filePath: string;
  onBack: () => void;
}

export function FileContentView({ encodedPath, filePath, onBack }: FileContentViewProps) {
  const { data, isLoading, error } = useFileContent(encodedPath, filePath);
  
  if (isLoading) return <FileContentSkeleton />;
  if (error) return <FileContentError error={error} onBack={onBack} />;
  if (!data) return null;
  
  if (data.isBinary) {
    return <BinaryFileMessage fileName={data.name} onBack={onBack} />;
  }
  
  if (data.isTooBig) {
    return <FileTooLargeMessage 
      fileName={data.name} 
      size={data.size} 
      githubUrl={data.githubUrl}
      onBack={onBack} 
    />;
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-accent"
        >
          ← Back
        </button>
        <span className="font-medium truncate mx-2">{data.name}</span>
        {data.githubUrl && (
          <a
            href={data.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent"
            title="View on GitHub"
          >
            GitHub ↗
          </a>
        )}
      </div>
      
      {/* File info */}
      <div className="px-4 py-2 text-sm text-text-secondary border-b border-border">
        {data.path} · {data.lineCount} lines · {data.language}
      </div>
      
      {/* Content with line numbers */}
      <div className="flex-1 overflow-auto">
        <pre className="text-sm font-mono">
          <code>
            {data.content.split('\n').map((line, i) => (
              <div key={i} className="flex hover:bg-surface">
                <span className="w-12 text-right pr-4 text-text-tertiary select-none">
                  {i + 1}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-all">
                  {line || ' '}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
```

### Dependencies

**New npm dependency:**
- `ignore` (npm package) — Parse .gitignore rules (~15KB)

---

## Implementation Tasks

| #  | Task                                                    | Est. Time | Dependencies | Notes                                      |
|----|---------------------------------------------------------|-----------|--------------|--------------------------------------------|
| 1  | Add `FileTreeEntry` and `FileContent` types             | 20 min    | —            | Type definitions for API                   |
| 2  | Create `fileTreeService.ts` with getFileTree            | 45 min    | Task 1       | File scanning, gitignore filtering         |
| 3  | Add `getFileContent` to fileTreeService                 | 45 min    | Task 1       | File reading, binary detection, size check |
| 4  | Add `getGitHubUrl` and `getCurrentBranch` to gitService | 30 min    | —            | Git remote URL extraction                  |
| 5  | Add `/api/projects/:id/tree` endpoint                   | 30 min    | Tasks 2, 4   | Route handler + validation                 |
| 6  | Add `/api/projects/:id/content/*` endpoint              | 30 min    | Tasks 3, 4   | Route handler + validation                 |
| 7  | Create `useFileTree.ts` hook                            | 30 min    | Task 5       | SWR data fetching for tree                 |
| 8  | Create `useFileContent.ts` hook                         | 30 min    | Task 6       | SWR data fetching for content              |
| 9  | Create `FileIcon.tsx` component                         | 30 min    | —            | Extension-based icons                      |
| 10 | Create `FileTreeNode.tsx` component                     | 45 min    | Tasks 7, 9   | Recursive node with expand/collapse        |
| 11 | Create `FileContentView.tsx` component                  | 60 min    | Task 8       | Content viewer with line numbers           |
| 12 | Create `FileTreeView.tsx` main component                | 45 min    | Tasks 10, 11 | Layout, navigation between tree/content    |
| 13 | Add lazy loading for subdirectories                     | 30 min    | Task 12      | Fetch children on expand                   |
| 14 | Integrate into App.tsx navigation                       | 30 min    | Task 12      | Tab/route addition                         |
| 15 | Add file tree service tests                             | 45 min    | Tasks 2, 3   | Unit tests for service                     |
| 16 | Add component tests                                     | 45 min    | Tasks 10-12  | React Testing Library                      |

**Total Estimated Time**: ~9.5 hours

---

## Test Plan

### Unit Tests

**fileTreeService.test.ts** (18 tests):
- Lists files in a directory
- Respects .gitignore rules
- Always ignores node_modules
- Always ignores .git folder
- Sorts directories before files
- Sorts alphabetically within groups
- Handles empty directories
- Handles missing .gitignore gracefully
- Handles permission errors
- Respects maxDepth option
- Returns correct extension for files
- Returns null extension for directories
- Reads file content correctly
- Detects binary files
- Returns isTooBig for large files
- Returns correct line count
- Handles non-existent files
- Prevents path traversal attacks

**gitService additions** (6 tests):
- Extracts GitHub URL from SSH remote
- Extracts GitHub URL from HTTPS remote
- Returns null for non-GitHub remotes
- Gets current branch name
- Returns 'main' when branch detection fails
- Generates correct file URL with branch

**useFileTree.test.ts** (8 tests):
- Fetches tree data on mount
- Returns loading state initially
- Returns error state on failure
- Caches results with SWR
- Fetches subdirectory on demand
- Handles network errors
- Refetches on encodedPath change
- Returns null when no encodedPath

**useFileContent.test.ts** (8 tests):
- Fetches content on mount
- Returns loading state initially
- Returns error state on failure
- Handles binary file response
- Handles too-large file response
- Caches results with SWR
- Refetches on filePath change
- Returns null when no filePath

### Component Tests

**FileTreeNode.test.tsx** (10 tests):
- Renders file with correct icon
- Renders folder with chevron
- Expands folder on click
- Collapses folder on click
- Shows loading state while fetching children
- Calls onSelectFile when file clicked
- Applies correct indentation for depth
- Has correct ARIA attributes
- Keyboard navigation works
- Truncates long file names

**FileContentView.test.tsx** (12 tests):
- Renders loading skeleton initially
- Renders error state on failure
- Renders file content when loaded
- Shows line numbers
- Shows file path and info
- Shows GitHub link when available
- Hides GitHub link when not available
- Back button calls onBack
- Shows binary file message
- Shows file too large message
- Content is horizontally scrollable
- Accessible heading structure

**FileTreeView.test.tsx** (10 tests):
- Renders tree view by default
- Shows content view when file selected
- Returns to tree view on back
- Preserves tree state after viewing file
- Renders loading skeleton initially
- Renders error state on failure
- Handles empty file tree
- Scrolls content area
- Accessible tree structure
- Responsive on mobile widths

### Manual Testing Checklist

- [ ] File tree loads within 500ms for typical projects
- [ ] Folders expand/collapse smoothly
- [ ] Tapping file shows content with syntax highlighting
- [ ] File content loads within 300ms
- [ ] Line numbers display correctly
- [ ] Long lines are horizontally scrollable
- [ ] Back button returns to tree
- [ ] Tree state is preserved after viewing file
- [ ] GitHub link opens correct file on correct branch
- [ ] Binary files show appropriate message
- [ ] Large files (>1MB) show appropriate message
- [ ] node_modules and .git are hidden
- [ ] Custom .gitignore rules are respected
- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 15 Pro Max (large screen)
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Large project (10,000+ files) loads without freezing

---

## Edge Cases

| Scenario                       | Expected Behavior                                           |
|--------------------------------|-------------------------------------------------------------|
| Non-git project                | Show files, hide GitHub links                               |
| Non-GitHub git repo            | Show files, hide GitHub links                               |
| Empty directory                | Show empty folder (expandable but empty)                    |
| Very deep nesting (20+ levels) | Works but may be hard to navigate on mobile                 |
| Binary files (images, etc.)    | Show "Binary file cannot be displayed" with GitHub link     |
| Very large file (>1MB)         | Show "File too large" with GitHub link                      |
| File with no extension         | Show generic icon, detect language from content if possible |
| Symlinks                       | Skip or show as regular files (avoid infinite loops)        |
| Permission denied on folder    | Show folder but display error when expanding                |
| Files with very long names     | Truncate with ellipsis, full name in title attribute        |
| UTF-8 encoding issues          | Display replacement characters, show warning                |

---

## Related Documents

- [Product Spec - File Tree View](../product_spec.md#feature-file-tree-view)
- [Architecture - Frontend Stack](../architecture.md#frontend-stack)
- [Files Changed View](./files-changed-view.md) — Reuse patterns from diff viewer
- [File Diff View](./file-diff-view.md) — Reuse syntax highlighting approach
- [Project Status - V0.75 Build Order](../project_status.md#v075-build-order)

---

*Created: 2026-01-17*
*Last Updated: 2026-01-17*
