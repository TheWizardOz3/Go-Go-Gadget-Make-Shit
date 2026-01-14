import { Router, type Router as RouterType } from 'express';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import { scanProjects, getProject, getSessionsForProject } from '../services/projectScanner.js';
import { getTemplates } from '../services/templateService.js';
import { getChangedFiles } from '../services/gitService.js';

const router: RouterType = Router();

/**
 * List all projects with Claude Code sessions
 * GET /api/projects
 *
 * Returns all projects sorted by most recent activity.
 */
router.get('/', async (_req, res) => {
  try {
    const projects = await scanProjects();

    // Convert Date objects to ISO strings for JSON serialization
    const serializedProjects = projects.map((p) => ({
      ...p,
      lastActivityAt: p.lastActivityAt?.toISOString(),
    }));

    res.json(success(serializedProjects));
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
 * GET /api/projects/:encodedPath/files/:filePath
 *
 * TODO: Implement file diff view
 */
router.get('/:encodedPath/files/*', (_req, res) => {
  res.status(501).json(error(ErrorCodes.NOT_IMPLEMENTED, 'File diff not yet implemented'));
});

export default router;
