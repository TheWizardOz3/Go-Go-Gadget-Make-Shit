/**
 * Cloud API Routes
 *
 * API endpoints for serverless/cloud execution via Modal.
 * Provides job dispatch, status checking, and cloud session management.
 *
 * Routes:
 *   GET  /api/cloud/health          - Check cloud service health
 *   POST /api/cloud/jobs            - Dispatch a new cloud job
 *   GET  /api/cloud/jobs/:id        - Get job status
 *   GET  /api/cloud/sessions        - List all cloud sessions
 *   GET  /api/cloud/sessions/:id    - Get cloud session details
 *   GET  /api/cloud/sessions/:id/messages - Get cloud session messages
 */

import { Router, type Router as RouterType } from 'express';
import { validateRequest, z } from '../middleware/validateRequest.js';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import { config } from '../lib/config.js';
import {
  isModalConfigured,
  checkModalHealth,
  dispatchJob,
  getJobStatus,
} from '../services/modalClient.js';
import {
  isCloudAvailable,
  listCloudProjectPaths,
  getRecentCloudSessions,
  getCloudSession,
  getCloudSessionMessages,
} from '../services/cloudSessionManager.js';

// ============================================================
// Webhook URL Construction
// ============================================================

/**
 * Construct the cloud job completion webhook URL.
 *
 * Uses the configured server URL or falls back to Tailscale hostname.
 * The webhook is called by Modal when a job completes.
 *
 * @returns Webhook URL for Modal to call
 */
function getWebhookUrl(): string {
  // Try configured server URL first
  if (config.serverUrl) {
    return `${config.serverUrl}/api/webhooks/cloud-job-complete`;
  }

  // Fall back to Tailscale hostname with HTTPS port
  if (config.tailscaleHostname) {
    const hostname = config.tailscaleHostname.includes('://')
      ? config.tailscaleHostname
      : `https://${config.tailscaleHostname}`;
    return `${hostname}:${config.port}/api/webhooks/cloud-job-complete`;
  }

  // Last resort: localhost (unlikely to work from Modal, but provides a fallback)
  return `http://localhost:${config.httpPort}/api/webhooks/cloud-job-complete`;
}

const router: RouterType = Router();

// ============================================================
// Validation Schemas
// ============================================================

const dispatchJobSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(50000, 'Prompt too long'),
  repoUrl: z.string().url('Must be a valid git URL'),
  projectName: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  allowedTools: z.array(z.string()).optional(),
  notificationWebhook: z.string().url().optional(),
});

// ============================================================
// Health Check
// ============================================================

/**
 * Check cloud service health
 * GET /api/cloud/health
 *
 * Returns whether Modal is configured and accessible.
 */
router.get('/health', async (_req, res) => {
  try {
    const configured = await isModalConfigured();

    if (!configured) {
      res.json(
        success({
          available: false,
          configured: false,
          message: 'Modal serverless is not configured. Enable in settings.',
        })
      );
      return;
    }

    const healthResult = await checkModalHealth();

    if (!healthResult.success) {
      res.json(
        success({
          available: false,
          configured: true,
          healthy: false,
          error: healthResult.error,
        })
      );
      return;
    }

    res.json(
      success({
        available: true,
        configured: true,
        healthy: healthResult.healthy,
      })
    );
  } catch (err) {
    logger.error('Failed to check cloud health', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to check cloud health'));
  }
});

// ============================================================
// Job Management
// ============================================================

/**
 * Dispatch a new cloud job
 * POST /api/cloud/jobs
 * Body: {
 *   prompt: string,
 *   repoUrl: string,
 *   projectName: string,
 *   allowedTools?: string[],
 *   notificationWebhook?: string
 * }
 *
 * Submits a job to Modal for async execution.
 * Returns immediately with a job ID for status polling.
 */
router.post('/jobs', validateRequest({ body: dispatchJobSchema }), async (req, res) => {
  try {
    const { prompt, repoUrl, projectName, allowedTools, notificationWebhook } = req.body as z.infer<
      typeof dispatchJobSchema
    >;

    logger.info('Dispatching cloud job', {
      projectName,
      repoUrl: repoUrl.replace(/\/\/[^@]+@/, '//***@'), // Mask credentials in logs
      promptLength: prompt.length,
    });

    // Check if Modal is configured
    const configured = await isModalConfigured();
    if (!configured) {
      res
        .status(503)
        .json(
          error(
            ErrorCodes.SERVICE_UNAVAILABLE,
            'Cloud execution is not configured. Enable serverless in settings.'
          )
        );
      return;
    }

    // Use provided webhook URL or construct one automatically
    // This enables notifications through all enabled channels when the job completes
    const webhookUrl = notificationWebhook || getWebhookUrl();

    logger.debug('Using webhook URL for cloud job', {
      projectName,
      webhookUrl: webhookUrl.replace(/\/\/[^@]+@/, '//***@'),
      isAutoGenerated: !notificationWebhook,
    });

    // Dispatch the job
    const result = await dispatchJob({
      prompt,
      repoUrl,
      projectName,
      allowedTools,
      notificationWebhook: webhookUrl,
    });

    if (!result.success) {
      logger.error('Failed to dispatch cloud job', {
        projectName,
        error: result.error,
      });
      res
        .status(500)
        .json(error(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to dispatch job'));
      return;
    }

    logger.info('Cloud job dispatched', {
      jobId: result.jobId,
      status: result.status,
    });

    res.status(202).json(
      success({
        jobId: result.jobId,
        status: result.status,
        message: 'Job dispatched. Poll /api/cloud/jobs/:id for status.',
      })
    );
  } catch (err) {
    logger.error('Failed to dispatch cloud job', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to dispatch cloud job'));
  }
});

/**
 * Get cloud job status
 * GET /api/cloud/jobs/:id
 *
 * Returns the current status of a cloud job.
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if Modal is configured
    const configured = await isModalConfigured();
    if (!configured) {
      res
        .status(503)
        .json(error(ErrorCodes.SERVICE_UNAVAILABLE, 'Cloud execution is not configured'));
      return;
    }

    const result = await getJobStatus(id);

    if (!result.success) {
      if (result.error === 'Job not found') {
        res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Job not found'));
        return;
      }

      res
        .status(500)
        .json(error(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to get job status'));
      return;
    }

    res.json(success(result.job));
  } catch (err) {
    logger.error('Failed to get cloud job status', {
      jobId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get job status'));
  }
});

// ============================================================
// Cloud Sessions
// ============================================================

/**
 * List cloud sessions
 * GET /api/cloud/sessions
 * Query params:
 *   - limit: number (default: 20, max: 100)
 *   - projectPath: string (optional) - filter by project
 *
 * Returns cloud sessions sorted by most recent activity.
 */
router.get('/sessions', async (req, res) => {
  try {
    // Check if cloud is available
    const available = await isCloudAvailable();
    if (!available) {
      res.json(
        success({
          sessions: [],
          available: false,
          message: 'Cloud sessions not available. Modal is not configured.',
        })
      );
      return;
    }

    // Parse query parameters
    const limitParam = req.query.limit;
    let limit = 20;
    if (typeof limitParam === 'string') {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100);
      }
    }

    // Get cloud sessions
    const sessions = await getRecentCloudSessions(limit);

    res.json(
      success({
        sessions,
        available: true,
        count: sessions.length,
      })
    );
  } catch (err) {
    logger.error('Failed to list cloud sessions', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to list cloud sessions'));
  }
});

/**
 * List cloud projects
 * GET /api/cloud/projects
 *
 * Returns all project paths that have cloud sessions.
 */
router.get('/projects', async (_req, res) => {
  try {
    const available = await isCloudAvailable();
    if (!available) {
      res.json(
        success({
          projects: [],
          available: false,
        })
      );
      return;
    }

    const projects = await listCloudProjectPaths();

    res.json(
      success({
        projects,
        available: true,
        count: projects.length,
      })
    );
  } catch (err) {
    logger.error('Failed to list cloud projects', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to list cloud projects'));
  }
});

/**
 * Get cloud session details
 * GET /api/cloud/sessions/:id
 * Query params:
 *   - projectPath: string (optional) - helps find session faster
 *
 * Returns cloud session metadata.
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath =
      typeof req.query.projectPath === 'string' ? req.query.projectPath : undefined;

    const available = await isCloudAvailable();
    if (!available) {
      res.status(503).json(error(ErrorCodes.SERVICE_UNAVAILABLE, 'Cloud sessions not available'));
      return;
    }

    const session = await getCloudSession(id, projectPath);

    if (!session) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Cloud session not found'));
      return;
    }

    res.json(success(session));
  } catch (err) {
    logger.error('Failed to get cloud session', {
      sessionId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get cloud session'));
  }
});

/**
 * Get cloud session messages
 * GET /api/cloud/sessions/:id/messages
 * Query params:
 *   - projectPath: string (required) - the encoded project path
 *
 * Returns messages for a cloud session.
 */
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = req.query.projectPath;

    if (typeof projectPath !== 'string' || !projectPath) {
      res
        .status(400)
        .json(error(ErrorCodes.BAD_REQUEST, 'projectPath query parameter is required'));
      return;
    }

    const available = await isCloudAvailable();
    if (!available) {
      res.status(503).json(error(ErrorCodes.SERVICE_UNAVAILABLE, 'Cloud sessions not available'));
      return;
    }

    const result = await getCloudSessionMessages(id, projectPath);

    if (!result.success) {
      if (result.error === 'Session not found') {
        res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Cloud session not found'));
        return;
      }

      res
        .status(500)
        .json(error(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to get messages'));
      return;
    }

    res.json(
      success({
        messages: result.messages,
        status: result.status,
        sessionId: id,
        cached: result.cached,
      })
    );
  } catch (err) {
    logger.error('Failed to get cloud session messages', {
      sessionId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get cloud session messages'));
  }
});

export default router;
