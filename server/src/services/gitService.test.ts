/**
 * Tests for Git Service
 *
 * Tests git repository detection and file change detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isGitRepo, getChangedFiles, getRepoRoot } from './gitService.js';

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(),
}));

import { simpleGit } from 'simple-git';
const mockSimpleGit = vi.mocked(simpleGit);

describe('gitService', () => {
  // Common mock setup
  let mockGitInstance: {
    checkIsRepo: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    diffSummary: ReturnType<typeof vi.fn>;
    revparse: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh mock git instance for each test
    mockGitInstance = {
      checkIsRepo: vi.fn(),
      status: vi.fn(),
      diffSummary: vi.fn(),
      revparse: vi.fn(),
    };

    mockSimpleGit.mockReturnValue(mockGitInstance as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGitRepo', () => {
    it('should return true for a git repository', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);

      const result = await isGitRepo('/path/to/git/repo');

      expect(result).toBe(true);
      expect(mockSimpleGit).toHaveBeenCalledWith(
        expect.objectContaining({
          baseDir: '/path/to/git/repo',
        })
      );
    });

    it('should return false for a non-git directory', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(false);

      const result = await isGitRepo('/path/to/regular/dir');

      expect(result).toBe(false);
    });

    it('should return false when git check throws an error', async () => {
      mockGitInstance.checkIsRepo.mockRejectedValue(new Error('Git not found'));

      const result = await isGitRepo('/path/to/dir');

      expect(result).toBe(false);
    });
  });

  describe('getRepoRoot', () => {
    it('should return the repository root path', async () => {
      mockGitInstance.revparse.mockResolvedValue('/home/user/project\n');

      const result = await getRepoRoot('/home/user/project/src/lib');

      expect(result).toBe('/home/user/project');
      expect(mockGitInstance.revparse).toHaveBeenCalledWith(['--show-toplevel']);
    });

    it('should return null if not a git repository', async () => {
      mockGitInstance.revparse.mockRejectedValue(new Error('Not a git repo'));

      const result = await getRepoRoot('/not/a/repo');

      expect(result).toBeNull();
    });
  });

  describe('getChangedFiles', () => {
    it('should return empty files array for non-git directory', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(false);

      const result = await getChangedFiles({ projectPath: '/not/a/repo' });

      expect(result.success).toBe(true);
      expect(result.files).toEqual([]);
      expect(result.isGitRepo).toBe(false);
    });

    it('should return empty files array when no changes', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: [],
        modified: [],
        not_added: [],
        deleted: [],
        created: [],
        files: [],
      });
      mockGitInstance.diffSummary.mockResolvedValue({ files: [] });

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toEqual([]);
      expect(result.isGitRepo).toBe(true);
    });

    it('should return modified files with correct status', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: [],
        modified: ['src/index.ts'],
        not_added: [],
        deleted: [],
        created: [],
        files: [{ path: 'src/index.ts', index: ' ', working_dir: 'M' }],
      });
      mockGitInstance.diffSummary
        .mockResolvedValueOnce({ files: [] }) // staged
        .mockResolvedValueOnce({
          files: [{ file: 'src/index.ts', insertions: 10, deletions: 5, binary: false }],
        }); // unstaged

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual({
        path: 'src/index.ts',
        status: 'modified',
        additions: 10,
        deletions: 5,
      });
    });

    it('should return added (untracked) files', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: [],
        modified: [],
        not_added: ['new-file.ts'],
        deleted: [],
        created: [],
        files: [{ path: 'new-file.ts', index: '?', working_dir: '?' }],
      });
      mockGitInstance.diffSummary.mockResolvedValue({ files: [] });

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual({
        path: 'new-file.ts',
        status: 'added',
        additions: 0,
        deletions: 0,
      });
    });

    it('should return staged added files', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: ['staged-new.ts'],
        modified: [],
        not_added: [],
        deleted: [],
        created: [],
        files: [{ path: 'staged-new.ts', index: 'A', working_dir: ' ' }],
      });
      mockGitInstance.diffSummary
        .mockResolvedValueOnce({
          files: [{ file: 'staged-new.ts', insertions: 25, deletions: 0, binary: false }],
        }) // staged
        .mockResolvedValueOnce({ files: [] }); // unstaged

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual({
        path: 'staged-new.ts',
        status: 'added',
        additions: 25,
        deletions: 0,
      });
    });

    it('should return deleted files', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: [],
        modified: [],
        not_added: [],
        deleted: ['removed.ts'],
        created: [],
        files: [{ path: 'removed.ts', index: ' ', working_dir: 'D' }],
      });
      mockGitInstance.diffSummary.mockResolvedValue({ files: [] });

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual({
        path: 'removed.ts',
        status: 'deleted',
        additions: 0,
        deletions: 0,
      });
    });

    it('should sort files: deleted first, then added, then modified', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: [],
        modified: ['b-modified.ts'],
        not_added: ['c-new.ts'],
        deleted: ['a-deleted.ts'],
        created: [],
        files: [
          { path: 'b-modified.ts', index: ' ', working_dir: 'M' },
          { path: 'c-new.ts', index: '?', working_dir: '?' },
          { path: 'a-deleted.ts', index: ' ', working_dir: 'D' },
        ],
      });
      mockGitInstance.diffSummary.mockResolvedValue({ files: [] });

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(3);
      expect(result.files[0].status).toBe('deleted');
      expect(result.files[1].status).toBe('added');
      expect(result.files[2].status).toBe('modified');
    });

    it('should handle multiple files of mixed types', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: ['staged.ts'],
        modified: ['mod1.ts', 'mod2.ts'],
        not_added: ['new1.ts', 'new2.ts'],
        deleted: ['del.ts'],
        created: [],
        files: [
          { path: 'staged.ts', index: 'M', working_dir: ' ' },
          { path: 'mod1.ts', index: ' ', working_dir: 'M' },
          { path: 'mod2.ts', index: ' ', working_dir: 'M' },
          { path: 'new1.ts', index: '?', working_dir: '?' },
          { path: 'new2.ts', index: '?', working_dir: '?' },
          { path: 'del.ts', index: ' ', working_dir: 'D' },
        ],
      });
      mockGitInstance.diffSummary
        .mockResolvedValueOnce({
          files: [{ file: 'staged.ts', insertions: 5, deletions: 2, binary: false }],
        })
        .mockResolvedValueOnce({
          files: [
            { file: 'mod1.ts', insertions: 10, deletions: 3, binary: false },
            { file: 'mod2.ts', insertions: 1, deletions: 1, binary: false },
          ],
        });

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(6);
      // Verify order: deleted, added, modified
      expect(result.files[0].status).toBe('deleted');
      expect(result.files[1].status).toBe('added');
      expect(result.files[2].status).toBe('added');
      expect(result.files[3].status).toBe('modified');
    });

    it('should skip binary files in diff stats', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: [],
        modified: ['image.png', 'code.ts'],
        not_added: [],
        deleted: [],
        created: [],
        files: [
          { path: 'image.png', index: ' ', working_dir: 'M' },
          { path: 'code.ts', index: ' ', working_dir: 'M' },
        ],
      });
      mockGitInstance.diffSummary.mockResolvedValueOnce({ files: [] }).mockResolvedValueOnce({
        files: [
          { file: 'image.png', binary: true },
          { file: 'code.ts', insertions: 5, deletions: 2, binary: false },
        ],
      });

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      const codeFile = result.files.find((f) => f.path === 'code.ts');
      const imageFile = result.files.find((f) => f.path === 'image.png');

      expect(codeFile).toEqual({
        path: 'code.ts',
        status: 'modified',
        additions: 5,
        deletions: 2,
      });
      // Binary file has no line stats
      expect(imageFile).toEqual({
        path: 'image.png',
        status: 'modified',
        additions: 0,
        deletions: 0,
      });
    });

    it('should merge staged and unstaged stats for same file', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockResolvedValue({
        staged: ['both.ts'],
        modified: ['both.ts'],
        not_added: [],
        deleted: [],
        created: [],
        files: [{ path: 'both.ts', index: 'M', working_dir: 'M' }],
      });
      mockGitInstance.diffSummary
        .mockResolvedValueOnce({
          files: [{ file: 'both.ts', insertions: 5, deletions: 2, binary: false }],
        }) // staged
        .mockResolvedValueOnce({
          files: [{ file: 'both.ts', insertions: 3, deletions: 1, binary: false }],
        }); // unstaged

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual({
        path: 'both.ts',
        status: 'modified',
        additions: 8, // 5 + 3
        deletions: 3, // 2 + 1
      });
    });

    it('should handle errors gracefully', async () => {
      mockGitInstance.checkIsRepo.mockResolvedValue(true);
      mockGitInstance.status.mockRejectedValue(new Error('Git command failed'));

      const result = await getChangedFiles({ projectPath: '/project' });

      expect(result.success).toBe(false);
      expect(result.files).toEqual([]);
      expect(result.isGitRepo).toBe(false);
      expect(result.error).toContain('Failed to get changed files');
    });
  });
});
