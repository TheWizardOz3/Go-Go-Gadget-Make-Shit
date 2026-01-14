/**
 * Git Service
 *
 * Service for Git operations to support file change tracking.
 * Uses simple-git as a wrapper around Git CLI commands.
 */

import { simpleGit, type SimpleGit, type StatusResult, type DiffResultTextFile } from 'simple-git';
import { logger } from '../lib/logger.js';

// ============================================================
// Types
// ============================================================

/** File change status from git diff */
export type FileChangeStatus = 'added' | 'modified' | 'deleted';

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
