import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

/**
 * List all projects with Claude Code sessions
 * GET /api/projects
 */
router.get('/', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: List projects' },
  });
});

/**
 * Get single project details
 * GET /api/projects/:encodedPath
 */
router.get('/:encodedPath', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Get project details' },
  });
});

/**
 * Get prompt templates for a project
 * GET /api/projects/:encodedPath/templates
 */
router.get('/:encodedPath/templates', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Get project templates' },
  });
});

/**
 * Get changed files for a project (git status)
 * GET /api/projects/:encodedPath/files
 */
router.get('/:encodedPath/files', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Get changed files' },
  });
});

/**
 * Get file diff for a specific file
 * GET /api/projects/:encodedPath/files/:filePath
 */
router.get('/:encodedPath/files/*', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Get file diff' },
  });
});

export default router;
