/**
 * Git Service
 *
 * Service for Git operations to support file change tracking.
 * Uses simple-git as a wrapper around Git CLI commands.
 */

import { simpleGit, type SimpleGit, type StatusResult, type DiffResultTextFile } from 'simple-git';
import { logger } from '../lib/logger.js';
import path from 'path';
import type {
  FileDiff,
  DiffHunk,
  FileChangeStatus,
  FileTreeEntry,
  FileContentResponse,
} from 'shared';

// ============================================================
// Types (re-export shared types for convenience)
// ============================================================

export type { FileChangeStatus };

/** File change from git diff */
export interface FileChange {
  /** File path relative to repo root */
  path: string;
  /** Change type */
  status: FileChangeStatus;
  /** Lines added */
  additions: number;
  /** Lines removed */
  deletions: number;
}

export interface GetChangedFilesOptions {
  /** Absolute path to the project directory */
  projectPath: string;
}

export interface GetChangedFilesResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** List of changed files (empty if not a git repo or no changes) */
  files: FileChange[];
  /** Whether the path is a git repository */
  isGitRepo: boolean;
  /** Error message if operation failed */
  error?: string;
}

// ============================================================
// Internal Functions
// ============================================================

/**
 * Create a simple-git instance for a given path
 */
function createGit(basePath: string): SimpleGit {
  return simpleGit({
    baseDir: basePath,
    binary: 'git',
    maxConcurrentProcesses: 1,
    trimmed: true,
  });
}

/**
 * Map git status code to our FileChangeStatus
 */
function mapStatusToChangeType(index: string, workingDir: string): FileChangeStatus {
  // Check for deleted files
  if (index === 'D' || workingDir === 'D') {
    return 'deleted';
  }

  // Check for new/added files
  if (index === 'A' || index === '?' || workingDir === '?') {
    return 'added';
  }

  // Everything else is modified (M, R for renamed, C for copied, etc.)
  return 'modified';
}

// ============================================================
// Public API
// ============================================================

/**
 * Check if a directory is a Git repository
 *
 * @param path - Path to check
 * @returns True if the path is inside a git repository
 */
export async function isGitRepo(path: string): Promise<boolean> {
  try {
    const git = createGit(path);
    const isRepo = await git.checkIsRepo();
    return isRepo;
  } catch (error) {
    logger.debug('Error checking git repo status', {
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get list of changed files in a Git repository
 *
 * Returns all uncommitted changes (staged + unstaged + untracked).
 * For each file, includes the change type and line counts.
 *
 * @param options - Options including the project path
 * @returns Result with list of changed files
 */
export async function getChangedFiles(
  options: GetChangedFilesOptions
): Promise<GetChangedFilesResult> {
  const { projectPath } = options;

  logger.debug('Getting changed files', { projectPath });

  try {
    // Check if this is a git repository
    const isRepo = await isGitRepo(projectPath);

    if (!isRepo) {
      logger.debug('Path is not a git repository', { projectPath });
      return {
        success: true,
        files: [],
        isGitRepo: false,
      };
    }

    const git = createGit(projectPath);

    // Get status to find all changed files
    const status: StatusResult = await git.status();

    // Get diff summary for line counts
    // --stat gives us insertions/deletions
    // We need both staged and unstaged diffs
    const [stagedDiff, unstagedDiff] = await Promise.all([
      git.diffSummary(['--cached']),
      git.diffSummary(),
    ]);

    // Create a map of file paths to their diff stats
    const diffStatsMap = new Map<string, { additions: number; deletions: number }>();

    // Add staged diff stats
    for (const file of stagedDiff.files) {
      if (file.binary) continue; // Skip binary files
      const textFile = file as DiffResultTextFile;
      diffStatsMap.set(textFile.file, {
        additions: textFile.insertions ?? 0,
        deletions: textFile.deletions ?? 0,
      });
    }

    // Add/merge unstaged diff stats
    for (const file of unstagedDiff.files) {
      if (file.binary) continue; // Skip binary files
      const textFile = file as DiffResultTextFile;
      const existing = diffStatsMap.get(textFile.file);
      if (existing) {
        // Merge stats (file has both staged and unstaged changes)
        diffStatsMap.set(textFile.file, {
          additions: existing.additions + (textFile.insertions ?? 0),
          deletions: existing.deletions + (textFile.deletions ?? 0),
        });
      } else {
        diffStatsMap.set(textFile.file, {
          additions: textFile.insertions ?? 0,
          deletions: textFile.deletions ?? 0,
        });
      }
    }

    // Build the list of changed files from status
    const files: FileChange[] = [];

    // Helper type for file info
    interface FileInfo {
      path: string;
      index: string;
      workingDir: string;
    }

    // Process all file states from git status
    const allFiles: FileInfo[] = [
      ...status.staged.map((filePath: string): FileInfo => {
        const fileStatus = status.files.find((f: { path: string }) => f.path === filePath);
        return {
          path: filePath,
          index: fileStatus?.index ?? 'M',
          workingDir: fileStatus?.working_dir ?? ' ',
        };
      }),
      ...status.modified
        .filter((filePath: string) => !status.staged.includes(filePath))
        .map(
          (filePath: string): FileInfo => ({
            path: filePath,
            index: ' ',
            workingDir: 'M',
          })
        ),
      ...status.not_added.map(
        (filePath: string): FileInfo => ({
          path: filePath,
          index: '?',
          workingDir: '?',
        })
      ),
      ...status.deleted
        .filter((filePath: string) => !status.staged.includes(filePath))
        .map(
          (filePath: string): FileInfo => ({
            path: filePath,
            index: ' ',
            workingDir: 'D',
          })
        ),
      ...status.created
        .filter((filePath: string) => !status.staged.includes(filePath))
        .map(
          (filePath: string): FileInfo => ({
            path: filePath,
            index: ' ',
            workingDir: 'A',
          })
        ),
    ];

    // Deduplicate files (a file might appear in multiple lists)
    const seenPaths = new Set<string>();

    for (const fileInfo of allFiles) {
      if (seenPaths.has(fileInfo.path)) continue;
      seenPaths.add(fileInfo.path);

      const changeStatus = mapStatusToChangeType(fileInfo.index, fileInfo.workingDir);
      const stats = diffStatsMap.get(fileInfo.path) ?? { additions: 0, deletions: 0 };

      files.push({
        path: fileInfo.path,
        status: changeStatus,
        additions: stats.additions,
        deletions: stats.deletions,
      });
    }

    // Sort files: deleted first, then added, then modified, alphabetically within each group
    files.sort((a, b) => {
      const statusOrder: Record<FileChangeStatus, number> = {
        deleted: 0,
        added: 1,
        modified: 2,
      };

      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      return a.path.localeCompare(b.path);
    });

    logger.debug('Found changed files', {
      projectPath,
      fileCount: files.length,
    });

    return {
      success: true,
      files,
      isGitRepo: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to get changed files', {
      projectPath,
      error: errorMessage,
    });

    return {
      success: false,
      files: [],
      isGitRepo: false,
      error: `Failed to get changed files: ${errorMessage}`,
    };
  }
}

/**
 * Get the root directory of a git repository
 *
 * @param path - Any path inside the repository
 * @returns The root directory path, or null if not a git repo
 */
export async function getRepoRoot(path: string): Promise<string | null> {
  try {
    const git = createGit(path);
    const root = await git.revparse(['--show-toplevel']);
    return root.trim();
  } catch {
    return null;
  }
}

// ============================================================
// File Diff Functions
// ============================================================

/**
 * Detect programming language from file extension
 *
 * @param filePath - File path
 * @returns Language identifier for syntax highlighting, or 'text' for unknown
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.py': 'python',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'zsh',
    '.fish': 'fish',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.sql': 'sql',
    '.xml': 'xml',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.r': 'r',
    '.R': 'r',
    '.lua': 'lua',
    '.pl': 'perl',
    '.pm': 'perl',
  };

  return languageMap[ext] || 'text';
}

/**
 * Parse a unified diff hunk header line
 * Format: @@ -oldStart,oldLines +newStart,newLines @@
 *
 * @param line - Hunk header line
 * @returns Parsed hunk information or null if invalid
 */
function parseHunkHeader(line: string): {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
} | null {
  // Match: @@ -1,4 +1,5 @@
  const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!match) return null;

  return {
    oldStart: parseInt(match[1], 10),
    oldLines: match[2] ? parseInt(match[2], 10) : 1,
    newStart: parseInt(match[3], 10),
    newLines: match[4] ? parseInt(match[4], 10) : 1,
  };
}

/**
 * Parse unified diff output into structured hunks
 *
 * @param diffText - Raw unified diff output
 * @returns Array of parsed diff hunks
 */
function parseDiffHunks(diffText: string): DiffHunk[] {
  const lines = diffText.split('\n');
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of lines) {
    // Check for hunk header
    if (line.startsWith('@@')) {
      // Save previous hunk if it exists
      if (currentHunk) {
        hunks.push(currentHunk);
      }

      // Parse new hunk header
      const hunkInfo = parseHunkHeader(line);
      if (hunkInfo) {
        oldLineNumber = hunkInfo.oldStart;
        newLineNumber = hunkInfo.newStart;
        currentHunk = {
          oldStart: hunkInfo.oldStart,
          oldLines: hunkInfo.oldLines,
          newStart: hunkInfo.newStart,
          newLines: hunkInfo.newLines,
          lines: [],
        };
      }
      continue;
    }

    // Skip diff metadata lines (before first hunk)
    if (!currentHunk) continue;

    // Parse diff lines
    if (line.startsWith('+')) {
      // Added line
      currentHunk.lines.push({
        type: 'add',
        content: line.slice(1), // Remove leading '+'
        newLineNumber: newLineNumber++,
      });
    } else if (line.startsWith('-')) {
      // Deleted line
      currentHunk.lines.push({
        type: 'delete',
        content: line.slice(1), // Remove leading '-'
        oldLineNumber: oldLineNumber++,
      });
    } else if (line.startsWith(' ')) {
      // Context line
      currentHunk.lines.push({
        type: 'context',
        content: line.slice(1), // Remove leading ' '
        oldLineNumber: oldLineNumber++,
        newLineNumber: newLineNumber++,
      });
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file" - skip
      continue;
    } else if (line === '') {
      // Empty line in diff (represents a blank line)
      if (currentHunk.lines.length > 0) {
        // Add as context line if we're in a hunk
        currentHunk.lines.push({
          type: 'context',
          content: '',
          oldLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++,
        });
      }
    }
  }

  // Add the last hunk
  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

export interface GetFileDiffOptions {
  /** Absolute path to the project directory */
  projectPath: string;
  /** Relative file path from project root */
  filePath: string;
  /** Number of context lines (default: 999999 for full file) */
  context?: number;
}

/**
 * Get detailed diff for a single file
 *
 * Returns structured diff information including hunks with line-by-line changes.
 * Handles binary files, new files, deleted files, and renames.
 *
 * @param options - Options including project path, file path, and context lines
 * @returns FileDiff object with structured diff information
 * @throws Error if not a git repository or file path is invalid
 */
export async function getFileDiff(options: GetFileDiffOptions): Promise<FileDiff> {
  const { projectPath, filePath, context = 999999 } = options;

  logger.debug('Getting file diff', { projectPath, filePath, context });

  // Check if this is a git repository
  const isRepo = await isGitRepo(projectPath);
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  const git = createGit(projectPath);

  // Validate file path (basic security check)
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
    throw new Error('Invalid file path');
  }

  // Determine file status
  const status: StatusResult = await git.status();

  // Check if file exists in working tree or is tracked
  const allChangedFiles = [
    ...status.modified,
    ...status.created,
    ...status.deleted,
    ...status.staged,
    ...status.not_added,
  ];

  const fileExists = allChangedFiles.includes(filePath);
  if (!fileExists) {
    // File might be unchanged or doesn't exist
    throw new Error('File not found or has no changes');
  }

  // Determine change status
  let changeStatus: FileChangeStatus = 'modified';
  if (status.created.includes(filePath) || status.not_added.includes(filePath)) {
    changeStatus = 'added';
  } else if (status.deleted.includes(filePath)) {
    changeStatus = 'deleted';
  }

  // Check if file is binary using --numstat
  let isBinary = false;
  try {
    const numstat = await git.raw(['diff', '--numstat', 'HEAD', '--', filePath]);
    // Binary files show as: "- - filename" in numstat
    if (numstat.trim().startsWith('-\t-\t')) {
      isBinary = true;
    }
  } catch {
    // If file is new/untracked, check using git ls-files
    if (changeStatus === 'added') {
      try {
        const lsFiles = await git.raw(['ls-files', '--eol', '--', filePath]);
        // Binary files will have different eol info
        if (!lsFiles || lsFiles.includes('i/-text')) {
          isBinary = true;
        }
      } catch {
        // Assume text if we can't determine
        isBinary = false;
      }
    }
  }

  // Detect language
  const language = detectLanguage(filePath);

  // For binary files, return minimal diff info
  if (isBinary) {
    return {
      path: filePath,
      status: changeStatus,
      language,
      isBinary: true,
      isTooBig: false,
      hunks: [],
    };
  }

  // Get the diff with specified context
  let diffText = '';
  try {
    // Use --unified flag to set context lines
    // Compare against HEAD (or nothing if new file)
    if (changeStatus === 'added') {
      // For new files, show diff against /dev/null
      diffText = await git.raw([
        'diff',
        '--no-index',
        '--unified=' + context,
        '/dev/null',
        filePath,
      ]);
    } else {
      // For modified or deleted files, compare against HEAD
      diffText = await git.raw(['diff', '--unified=' + context, 'HEAD', '--', filePath]);
    }
  } catch (error) {
    // git diff returns exit code 1 when there are differences
    // We need to check if this is a real error or just diffs present
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message);
      // Check if there's actual output (which means diffs exist, not an error)
      if ('stdout' in error && error.stdout) {
        diffText = String(error.stdout);
      } else {
        logger.error('Failed to get diff', { filePath, error: errorMessage });
        throw new Error(`Failed to get diff: ${errorMessage}`);
      }
    }
  }

  // Parse the diff into hunks
  const hunks = parseDiffHunks(diffText);

  // Count total lines to check if file is too big
  const totalLines = hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0);
  const isTooBig = totalLines > 10000;

  logger.debug('File diff parsed', {
    filePath,
    hunksCount: hunks.length,
    totalLines,
    isTooBig,
  });

  return {
    path: filePath,
    status: changeStatus,
    language,
    isBinary: false,
    isTooBig,
    hunks,
  };
}

// ============================================================
// File Tree Functions (for browsing committed files)
// ============================================================

export interface GetCommittedTreeOptions {
  /** Absolute path to the project directory */
  projectPath: string;
  /** Subdirectory path to fetch (empty for root) */
  subPath?: string;
}

export interface GetCommittedTreeResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Tree entries (files and folders) */
  entries: FileTreeEntry[];
  /** Error message if operation failed */
  error?: string;
}

/**
 * Build a tree structure from flat file paths
 *
 * Takes a list of file paths and builds a hierarchical tree structure.
 * Handles nested directories by creating intermediate folder entries.
 *
 * @param filePaths - Array of file paths relative to repo root
 * @param subPath - Optional subdirectory to filter by
 * @returns Array of tree entries for the specified level
 */
function buildTreeFromPaths(filePaths: string[], subPath: string = ''): FileTreeEntry[] {
  // Map to collect entries at the current level
  const entriesMap = new Map<string, FileTreeEntry>();

  for (const filePath of filePaths) {
    // Skip files not under the subPath
    if (subPath && !filePath.startsWith(subPath + '/') && filePath !== subPath) {
      continue;
    }

    // Get the relative path from subPath
    const relativePath = subPath ? filePath.slice(subPath.length + 1) : filePath;

    // Skip empty paths (happens if subPath equals filePath exactly)
    if (!relativePath) continue;

    // Split into parts
    const parts = relativePath.split('/');
    const firstPart = parts[0];

    // Determine if this is a file or directory at this level
    const isFile = parts.length === 1;
    const entryPath = subPath ? `${subPath}/${firstPart}` : firstPart;

    if (!entriesMap.has(firstPart)) {
      if (isFile) {
        // It's a file
        const ext = path.extname(firstPart);
        entriesMap.set(firstPart, {
          name: firstPart,
          path: entryPath,
          type: 'file',
          extension: ext || null,
        });
      } else {
        // It's a directory
        entriesMap.set(firstPart, {
          name: firstPart,
          path: entryPath,
          type: 'directory',
          extension: null,
        });
      }
    }
  }

  // Convert to array and sort: directories first, then alphabetically
  const entries = Array.from(entriesMap.values());
  entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return entries;
}

/**
 * Get the committed file tree from a git repository
 *
 * Uses `git ls-tree` to list all committed files, then builds
 * a hierarchical tree structure. Only shows files that are
 * tracked and committed (not local changes).
 *
 * @param options - Options including project path and optional subdirectory
 * @returns Result with tree entries
 */
export async function getCommittedTree(
  options: GetCommittedTreeOptions
): Promise<GetCommittedTreeResult> {
  const { projectPath, subPath = '' } = options;

  logger.debug('Getting committed file tree', { projectPath, subPath });

  try {
    // Check if this is a git repository
    const isRepo = await isGitRepo(projectPath);
    if (!isRepo) {
      return {
        success: false,
        entries: [],
        error: 'Not a git repository',
      };
    }

    const git = createGit(projectPath);

    // Get all committed files using git ls-tree
    // -r = recursive, --name-only = only file names
    const output = await git.raw(['ls-tree', '-r', 'HEAD', '--name-only']);

    // Parse the output into an array of file paths
    const filePaths = output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Build tree structure from flat paths
    const entries = buildTreeFromPaths(filePaths, subPath);

    logger.debug('Built file tree', {
      projectPath,
      subPath,
      totalFiles: filePaths.length,
      entriesAtLevel: entries.length,
    });

    return {
      success: true,
      entries,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to get committed file tree', {
      projectPath,
      subPath,
      error: errorMessage,
    });

    return {
      success: false,
      entries: [],
      error: `Failed to get file tree: ${errorMessage}`,
    };
  }
}

export interface GetCommittedFileContentOptions {
  /** Absolute path to the project directory */
  projectPath: string;
  /** Relative file path from project root */
  filePath: string;
}

export interface GetCommittedFileContentResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** File content response (null if failed) */
  file: FileContentResponse | null;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Check if content appears to be binary
 *
 * Simple heuristic: if there are null bytes in the first 8KB, it's binary.
 *
 * @param content - File content string
 * @returns True if content appears to be binary
 */
function isBinaryContent(content: string): boolean {
  // Check first 8KB for null bytes
  const sample = content.slice(0, 8192);
  return sample.includes('\0');
}

/**
 * Get the committed content of a file from git
 *
 * Uses `git show HEAD:filepath` to retrieve the committed version
 * of a file. This only shows committed content, not local changes.
 *
 * @param options - Options including project path and file path
 * @returns Result with file content response
 */
export async function getCommittedFileContent(
  options: GetCommittedFileContentOptions
): Promise<GetCommittedFileContentResult> {
  const { projectPath, filePath } = options;

  logger.debug('Getting committed file content', { projectPath, filePath });

  try {
    // Validate file path (prevent path traversal)
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return {
        success: false,
        file: null,
        error: 'Invalid file path',
      };
    }

    // Check if this is a git repository
    const isRepo = await isGitRepo(projectPath);
    if (!isRepo) {
      return {
        success: false,
        file: null,
        error: 'Not a git repository',
      };
    }

    const git = createGit(projectPath);

    // Get file content using git show
    let content: string;
    try {
      content = await git.show([`HEAD:${filePath}`]);
    } catch (error) {
      // File not found in git
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('does not exist') || errorMessage.includes('not in')) {
        return {
          success: false,
          file: null,
          error: 'File not found in repository',
        };
      }
      throw error;
    }

    // Check if content is binary
    if (isBinaryContent(content)) {
      return {
        success: false,
        file: null,
        error: 'Binary file cannot be displayed',
      };
    }

    // Get file metadata
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath) || null;
    const language = detectLanguage(filePath);
    const lineCount = content.split('\n').length;

    logger.debug('Got file content', {
      filePath,
      lineCount,
      language,
      size: content.length,
    });

    return {
      success: true,
      file: {
        path: filePath,
        name: fileName,
        extension,
        language,
        content,
        lineCount,
        githubUrl: null, // Will be populated by the API layer
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to get committed file content', {
      projectPath,
      filePath,
      error: errorMessage,
    });

    return {
      success: false,
      file: null,
      error: `Failed to get file content: ${errorMessage}`,
    };
  }
}

// ============================================================
// GitHub URL Functions
// ============================================================

/**
 * Get the GitHub repository URL from git remote
 *
 * Extracts the GitHub URL from the origin remote, converting
 * SSH URLs to HTTPS format for browser access.
 *
 * @param projectPath - Path to the git repository
 * @returns GitHub repo URL (e.g., "https://github.com/user/repo") or null
 */
export async function getGitHubRepoUrl(projectPath: string): Promise<string | null> {
  try {
    const git = createGit(projectPath);
    const remotes = await git.getRemotes(true);

    // Find origin remote
    const origin = remotes.find((r) => r.name === 'origin');
    if (!origin?.refs?.fetch) return null;

    const url = origin.refs.fetch;

    // Convert SSH URL to HTTPS
    // git@github.com:user/repo.git → https://github.com/user/repo
    if (url.startsWith('git@github.com:')) {
      return url.replace('git@github.com:', 'https://github.com/').replace(/\.git$/, '');
    }

    // Already HTTPS URL - just clean it up
    if (url.includes('github.com')) {
      return url.replace(/\.git$/, '');
    }

    // Not a GitHub repo
    return null;
  } catch (error) {
    logger.debug('Failed to get GitHub URL', {
      projectPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get the current git branch name
 *
 * @param projectPath - Path to the git repository
 * @returns Branch name or 'main' as fallback
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

/**
 * Get the GitHub URL for a specific file
 *
 * Generates a URL to view the file on GitHub at the current branch.
 *
 * @param projectPath - Path to the git repository
 * @param filePath - Relative file path from repo root
 * @returns GitHub file URL or null if not a GitHub repo
 */
export async function getGitHubFileUrl(
  projectPath: string,
  filePath: string
): Promise<string | null> {
  const repoUrl = await getGitHubRepoUrl(projectPath);
  if (!repoUrl) return null;

  const branch = await getCurrentBranch(projectPath);
  return `${repoUrl}/blob/${branch}/${filePath}`;
}
