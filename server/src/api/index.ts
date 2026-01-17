import { Router, type Router as RouterType } from 'express';
import statusRouter from './status.js';
import projectsRouter from './projects.js';
import sessionsRouter from './sessions.js';
import transcribeRouter from './transcribe.js';
import settingsRouter from './settings.js';
import hooksRouter from './hooks.js';
import scheduledPromptsRouter from './scheduledPrompts.js';
import cloudRouter from './cloud.js';
import webhooksRouter from './webhooks.js';

const router: RouterType = Router();

/**
 * API Router
 *
 * Mounts all API route groups:
 * - /api/status            - Health check
 * - /api/projects          - Project management
 * - /api/sessions          - Session management (local)
 * - /api/cloud             - Cloud/serverless execution (Modal)
 * - /api/transcribe        - Voice transcription
 * - /api/settings          - App settings
 * - /api/hooks             - Claude Code hooks (task-complete)
 * - /api/scheduled-prompts - Scheduled prompts management
 * - /api/notifications     - Notification testing
 * - /api/webhooks          - External service webhooks (Modal, etc.)
 */

router.use('/status', statusRouter);
router.use('/projects', projectsRouter);
router.use('/sessions', sessionsRouter);
router.use('/cloud', cloudRouter);
router.use('/transcribe', transcribeRouter);
router.use('/settings', settingsRouter);
router.use('/hooks', hooksRouter);
router.use('/scheduled-prompts', scheduledPromptsRouter);
router.use('/webhooks', webhooksRouter);
// Also mount notifications/test under hooks for organization
router.use('/', hooksRouter);

export default router;
