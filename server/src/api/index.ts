import { Router, type Router as RouterType } from 'express';
import statusRouter from './status.js';
import projectsRouter from './projects.js';
import sessionsRouter from './sessions.js';
import transcribeRouter from './transcribe.js';
import settingsRouter from './settings.js';
import hooksRouter from './hooks.js';

const router: RouterType = Router();

/**
 * API Router
 *
 * Mounts all API route groups:
 * - /api/status        - Health check
 * - /api/projects      - Project management
 * - /api/sessions      - Session management
 * - /api/transcribe    - Voice transcription
 * - /api/settings      - App settings
 * - /api/hooks         - Claude Code hooks (task-complete)
 * - /api/notifications - Notification testing
 */

router.use('/status', statusRouter);
router.use('/projects', projectsRouter);
router.use('/sessions', sessionsRouter);
router.use('/transcribe', transcribeRouter);
router.use('/settings', settingsRouter);
router.use('/hooks', hooksRouter);
// Also mount notifications/test under hooks for organization
router.use('/', hooksRouter);

export default router;
