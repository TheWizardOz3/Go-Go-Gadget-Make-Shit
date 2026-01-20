/**
 * Scheduled Prompts API Routes
 *
 * CRUD endpoints for managing scheduled prompts that automatically
 * start new Claude sessions at calendar-based times.
 */

import { Router, type Router as RouterType } from 'express';
import { validateRequest, z } from '../middleware/validateRequest.js';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import {
  getAllPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePrompt,
} from '../services/scheduledPromptsStorage.js';
import {
  handlePromptCreated,
  handlePromptUpdated,
  handlePromptDeleted,
  handlePromptToggle,
  isSchedulerRunning,
  runPromptNow,
  getMissedPrompts,
} from '../services/schedulerService.js';

const router: RouterType = Router();

// ============================================================
// Validation Schemas
// ============================================================

/**
 * Schema for creating a scheduled prompt
 */
const createPromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt text is required'),
  scheduleType: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format (24h)'),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  projectPath: z.string().nullable(),
});

/**
 * Schema for updating a scheduled prompt (all fields optional)
 */
const updatePromptSchema = z.object({
  prompt: z.string().min(1).optional(),
  scheduleType: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format (24h)')
    .optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  projectPath: z.string().nullable().optional(),
});

// ============================================================
// Routes
// ============================================================

/**
 * List all scheduled prompts
 * GET /api/scheduled-prompts
 *
 * Returns all scheduled prompts with their current state.
 */
router.get('/', async (_req, res) => {
  try {
    const prompts = await getAllPrompts();

    logger.debug('Retrieved scheduled prompts', {
      count: prompts.length,
    });

    res.json(success(prompts));
  } catch (err) {
    logger.error('Failed to get scheduled prompts', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to load scheduled prompts'));
  }
});

/**
 * Get a single scheduled prompt
 * GET /api/scheduled-prompts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const prompt = await getPromptById(id);

    if (!prompt) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Scheduled prompt not found'));
      return;
    }

    res.json(success(prompt));
  } catch (err) {
    logger.error('Failed to get scheduled prompt', {
      id: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to load scheduled prompt'));
  }
});

/**
 * Create a new scheduled prompt
 * POST /api/scheduled-prompts
 *
 * Body: ScheduledPromptInput
 */
router.post('/', validateRequest({ body: createPromptSchema }), async (req, res) => {
  try {
    const input = req.body as z.infer<typeof createPromptSchema>;

    // Validate schedule-specific requirements
    if (input.scheduleType === 'weekly' && input.dayOfWeek === undefined) {
      res
        .status(400)
        .json(error(ErrorCodes.VALIDATION_ERROR, 'dayOfWeek is required for weekly schedules'));
      return;
    }
    if (input.scheduleType === 'monthly' && input.dayOfMonth === undefined) {
      res
        .status(400)
        .json(error(ErrorCodes.VALIDATION_ERROR, 'dayOfMonth is required for monthly schedules'));
      return;
    }

    // Create the prompt
    const prompt = await createPrompt(input);

    // Register cron job if scheduler is running
    if (isSchedulerRunning()) {
      await handlePromptCreated(prompt);
    }

    logger.info('Created scheduled prompt', {
      id: prompt.id,
      scheduleType: prompt.scheduleType,
      timeOfDay: prompt.timeOfDay,
    });

    res.status(201).json(success(prompt));
  } catch (err) {
    logger.error('Failed to create scheduled prompt', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    if (err instanceof Error && err.message.startsWith('Invalid input:')) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, err.message));
      return;
    }

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to create scheduled prompt'));
  }
});

/**
 * Update a scheduled prompt
 * PUT /api/scheduled-prompts/:id
 *
 * Body: Partial<ScheduledPromptInput>
 */
router.put('/:id', validateRequest({ body: updatePromptSchema }), async (req, res) => {
  try {
    const id = req.params.id as string;
    const input = req.body as z.infer<typeof updatePromptSchema>;

    // Check if there's anything to update
    if (Object.keys(input).length === 0) {
      res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'No fields provided to update'));
      return;
    }

    // Update the prompt
    const prompt = await updatePrompt(id, input);

    if (!prompt) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Scheduled prompt not found'));
      return;
    }

    // Re-register cron job if scheduler is running
    if (isSchedulerRunning()) {
      await handlePromptUpdated(prompt);
    }

    logger.info('Updated scheduled prompt', { id });

    res.json(success(prompt));
  } catch (err) {
    logger.error('Failed to update scheduled prompt', {
      id: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    if (
      err instanceof Error &&
      (err.message.startsWith('Invalid input:') || err.message.includes('is required'))
    ) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, err.message));
      return;
    }

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to update scheduled prompt'));
  }
});

/**
 * Delete a scheduled prompt
 * DELETE /api/scheduled-prompts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id as string;

    // Delete the prompt
    const deleted = await deletePrompt(id);

    if (!deleted) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Scheduled prompt not found'));
      return;
    }

    // Unregister cron job if scheduler is running
    if (isSchedulerRunning()) {
      handlePromptDeleted(id);
    }

    logger.info('Deleted scheduled prompt', { id });

    res.json(success({ deleted: true, id }));
  } catch (err) {
    logger.error('Failed to delete scheduled prompt', {
      id: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to delete scheduled prompt'));
  }
});

/**
 * Toggle a scheduled prompt's enabled state
 * PATCH /api/scheduled-prompts/:id/toggle
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const id = req.params.id as string;

    // Toggle the prompt
    const prompt = await togglePrompt(id);

    if (!prompt) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Scheduled prompt not found'));
      return;
    }

    // Update cron job if scheduler is running
    if (isSchedulerRunning()) {
      await handlePromptToggle(prompt);
    }

    logger.info('Toggled scheduled prompt', {
      id,
      enabled: prompt.enabled,
    });

    res.json(success(prompt));
  } catch (err) {
    logger.error('Failed to toggle scheduled prompt', {
      id: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to toggle scheduled prompt'));
  }
});

/**
 * Get list of missed scheduled prompts
 * GET /api/scheduled-prompts/missed
 *
 * Returns prompts whose scheduled time has passed but weren't executed
 * (typically because the server wasn't running at that time).
 */
router.get('/status/missed', async (_req, res) => {
  try {
    const missed = await getMissedPrompts();

    logger.debug('Retrieved missed prompts', {
      count: missed.length,
    });

    res.json(
      success({
        missed,
        count: missed.length,
        message:
          missed.length > 0
            ? 'Some scheduled prompts were missed. Use POST /api/scheduled-prompts/:id/run to execute them manually.'
            : 'No missed prompts.',
      })
    );
  } catch (err) {
    logger.error('Failed to get missed prompts', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to check for missed prompts'));
  }
});

/**
 * Manually run a scheduled prompt now
 * POST /api/scheduled-prompts/:id/run
 *
 * Immediately executes the scheduled prompt, creating a new Claude session.
 * Useful for testing or catching up on missed prompts.
 */
router.post('/:id/run', async (req, res) => {
  try {
    const id = req.params.id as string;

    if (!isSchedulerRunning()) {
      res
        .status(503)
        .json(
          error(ErrorCodes.INTERNAL_ERROR, 'Scheduler is not running. Server may be starting up.')
        );
      return;
    }

    const result = await runPromptNow(id);

    if (!result) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Scheduled prompt not found'));
      return;
    }

    if (!result.success) {
      logger.warn('Manual prompt execution failed', {
        id,
        error: result.error,
      });

      res
        .status(500)
        .json(
          error(ErrorCodes.INTERNAL_ERROR, result.error ?? 'Failed to execute scheduled prompt')
        );
      return;
    }

    logger.info('Manually executed scheduled prompt', {
      id,
      timestamp: result.timestamp,
    });

    res.json(
      success({
        executed: true,
        promptId: id,
        timestamp: result.timestamp,
        message: 'Scheduled prompt executed successfully. A new Claude session has been started.',
      })
    );
  } catch (err) {
    logger.error('Failed to run scheduled prompt', {
      id: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to run scheduled prompt'));
  }
});

export default router;
