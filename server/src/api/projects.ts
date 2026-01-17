import { Router, type Router as RouterType } from 'express';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import { scanProjects, getProject, getSessionsForProject } from '../services/projectScanner.js';
import { getTemplates } from '../services/templateService.js';
import {
  getChangedFiles,
  getFileDiff,
  getCommittedTree,
  getCommittedFileContent,
  getGitHubRepoUrl,
  getGitHubFileUrl,
  getCurrentBranch,
} from '../services/gitService.js';

const router: RouterType = Router();

/**
 * List all projects with Claude Code sessions
 * GET /api/projects
 *
 * Returns all projects sorted by most recent activity.
 * Includes git remote URL for each project (for cloud execution).
 */
router.get('/', async (_req, res) => {
  try {
    const projects = await scanProjects();

    // Fetch git remote URLs for all projects in parallel
    const projectsWithUrls = await Promise.all(
      projects.map(async (p) => {
        const gitRemoteUrl = await getGitHubRepoUrl(p.path);
        return {
          ...p,
          lastActivityAt: p.lastActivityAt?.toISOString(),
          gitRemoteUrl: gitRemoteUrl ?? undefined,
        };
      })
    );

    res.json(success(projectsWithUrls));
  } catch (err) {
    logger.error('Failed to list projects', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to list projects'));
  }
});

/**
 * Get single project details
 * GET /api/projects/:encodedPath
 *
 * Returns project details including session count and last activity.
 */
router.get('/:encodedPath', async (req, res) => {
  try {
    const { encodedPath } = req.params;
    const project = await getProject(encodedPath);

    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }

    // Convert Date to ISO string for JSON serialization
    const serializedProject = {
      ...project,
      lastActivityAt: project.lastActivityAt?.toISOString(),
    };

    res.json(success(serializedProject));
  } catch (err) {
    logger.error('Failed to get project', {
      encodedPath: req.params.encodedPath,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get project'));
  }
});

/**
 * Get sessions for a project
 * GET /api/projects/:encodedPath/sessions
 *
 * Returns all sessions for a project sorted by most recent activity.
 */
router.get('/:encodedPath/sessions', async (req, res) => {
  try {
    const { encodedPath } = req.params;

    // First check if project exists
    const project = await getProject(encodedPath);
    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }

    const sessions = await getSessionsForProject(encodedPath);

    // Convert Date objects to ISO strings for JSON serialization
    const serializedSessions = sessions.map((s) => ({
      ...s,
      startedAt: s.startedAt?.toISOString() ?? null,
      lastActivityAt: s.lastActivityAt?.toISOString() ?? null,
    }));

    res.json(success(serializedSessions));
  } catch (err) {
    logger.error('Failed to get project sessions', {
      encodedPath: req.params.encodedPath,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get project sessions'));
  }
});

/**
 * Get prompt templates for a project
 * GET /api/projects/:encodedPath/templates
 *
 * Returns templates from .claude/templates.yaml if it exists,
 * otherwise returns default vibe-coding-prompts templates.
 */
router.get('/:encodedPath/templates', async (req, res) => {
  try {
    const { encodedPath } = req.params;

    // First check if project exists
    const project = await getProject(encodedPath);
    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }

    const templates = await getTemplates(encodedPath);
    res.json(success(templates));
  } catch (err) {
    logger.error('Failed to get templates', {
      encodedPath: req.params.encodedPath,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get templates'));
  }
});

/**
 * Get changed files for a project (git status)
 * GET /api/projects/:encodedPath/files
 *
 * Returns all uncommitted changes (staged + unstaged + untracked).
 * Returns empty array if project is not a git repo or has no changes.
 */
router.get('/:encodedPath/files', async (req, res) => {
  try {
    const { encodedPath } = req.params;

    // First check if project exists
    const project = await getProject(encodedPath);
    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }

    // Get changed files from git
    const result = await getChangedFiles({ projectPath: project.path });

    if (!result.success) {
      logger.error('Failed to get changed files', {
        encodedPath,
        projectPath: project.path,
        error: result.error,
      });
      res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get changed files'));
      return;
    }

    // Return file changes (empty array if not a git repo or no changes)
    res.json(success(result.files));
  } catch (err) {
    logger.error('Failed to get changed files', {
      encodedPath: req.params.encodedPath,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get changed files'));
  }
});

/**
 * Get file diff for a specific file
 * GET /api/projects/:encodedPath/files/*filepath
 *
 * Query parameters:
 * - context: Number of context lines (default: 999999 for full file)
 *
 * Returns structured diff with hunks showing line-by-line changes.
 * Handles binary files, new files, deleted files, and renames.
 */
router.get('/:encodedPath/files/*', async (req, res) => {
  try {
    const { encodedPath } = req.params;

    // Extract file path from the wildcard (everything after /files/)
    // Express wildcard routes put the match in params[0]
    const filePath = (req.params as unknown as { '0': string })['0'] || '';

    if (!filePath) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'File path is required'));
      return;
    }

    // Validate file path to prevent path traversal attacks
    // Don't allow paths that go up directories or are absolute
    if (filePath.includes('..') || filePath.startsWith('/')) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'Invalid file path'));
      return;
    }

    // Parse context query parameter (default to 999999 for full file)
    const contextParam = req.query.context as string | undefined;
    const context = contextParam ? parseInt(contextParam, 10) : 999999;

    // Validate context is a valid number
    if (isNaN(context) || context < 0) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'Invalid context parameter'));
      return;
    }

    // First check if project exists
    const project = await getProject(encodedPath);
    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }

    // Get the file diff
    const fileDiff = await getFileDiff({
      projectPath: project.path,
      filePath,
      context,
    });

    res.json(success(fileDiff));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    logger.error('Failed to get file diff', {
      encodedPath: req.params.encodedPath,
      filePath: (req.params as unknown as { '0': string })['0'],
      error: errorMessage,
    });

    // Handle specific error cases
    if (errorMessage.includes('Not a git repository')) {
      res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'Project is not a git repository'));
      return;
    }

    if (errorMessage.includes('File not found') || errorMessage.includes('has no changes')) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'File not found or has no changes'));
      return;
    }

    if (errorMessage.includes('Invalid file path')) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'Invalid file path'));
      return;
    }

    // Generic error
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get file diff'));
  }
});

/**
 * Get committed file tree for a project
 * GET /api/projects/:encodedPath/tree
 *
 * Query parameters:
 * - path: Subdirectory path to fetch (optional, defaults to root)
 *
 * Returns the committed file tree structure with GitHub URLs.
 */
router.get('/:encodedPath/tree', async (req, res) => {
  try {
    const { encodedPath } = req.params;
    const subPath = (req.query.path as string) || '';

    // Validate subPath to prevent path traversal
    if (subPath.includes('..') || subPath.startsWith('/')) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'Invalid path parameter'));
      return;
    }

    // First check if project exists
    const project = await getProject(encodedPath);
    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }

    // Get the committed file tree
    const result = await getCommittedTree({
      projectPath: project.path,
      subPath,
    });

    if (!result.success) {
      if (result.error?.includes('Not a git repository')) {
        res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'Project is not a git repository'));
        return;
      }
      res
        .status(500)
        .json(error(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to get file tree'));
      return;
    }

    // Get GitHub info for the project
    const [githubUrl, branch] = await Promise.all([
      getGitHubRepoUrl(project.path),
      getCurrentBranch(project.path),
    ]);

    res.json(
      success({
        path: subPath,
        githubUrl,
        branch,
        entries: result.entries,
      })
    );
  } catch (err) {
    logger.error('Failed to get file tree', {
      encodedPath: req.params.encodedPath,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get file tree'));
  }
});

/**
 * Get committed file content
 * GET /api/projects/:encodedPath/content/*filepath
 *
 * Returns the committed content of a file with syntax highlighting info.
 */
router.get('/:encodedPath/content/*', async (req, res) => {
  try {
    const { encodedPath } = req.params;

    // Extract file path from the wildcard
    const filePath = (req.params as unknown as { '0': string })['0'] || '';

    if (!filePath) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'File path is required'));
      return;
    }

    // Validate file path to prevent path traversal
    if (filePath.includes('..') || filePath.startsWith('/')) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, 'Invalid file path'));
      return;
    }

    // First check if project exists
    const project = await getProject(encodedPath);
    if (!project) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Project not found'));
      return;
    }

    // Get the committed file content
    const result = await getCommittedFileContent({
      projectPath: project.path,
      filePath,
    });

    if (!result.success || !result.file) {
      const errorMessage = result.error || 'Failed to get file content';

      if (errorMessage.includes('Not a git repository')) {
        res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'Project is not a git repository'));
        return;
      }

      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        res.status(404).json(error(ErrorCodes.NOT_FOUND, 'File not found'));
        return;
      }

      if (errorMessage.includes('Binary file')) {
        res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'Binary file cannot be displayed'));
        return;
      }

      res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, errorMessage));
      return;
    }

    // Get GitHub URL for this file
    const githubUrl = await getGitHubFileUrl(project.path, filePath);

    res.json(
      success({
        ...result.file,
        githubUrl,
      })
    );
  } catch (err) {
    logger.error('Failed to get file content', {
      encodedPath: req.params.encodedPath,
      filePath: (req.params as unknown as { '0': string })['0'],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get file content'));
  }
});

export default router;
