/**
 * Scheduler Service
 *
 * Manages scheduled prompts using node-cron.
 * Handles registering/unregistering cron jobs and executing prompts.
 *
 * This is a fire-and-forget system - we spawn Claude processes
 * and don't wait for them to complete.
 */

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../lib/logger.js';
import { toCronPattern, calculateNextRunAt, getScheduleDescription } from '../lib/cronUtils.js';
import {
  getAllPrompts,
  getPromptById,
  updateLastExecution,
  updateNextRunAt,
  type ScheduledPrompt,
  type LastExecution,
} from './scheduledPromptsStorage.js';
import { startNewSession } from './claudeService.js';
import { getSettings } from './settingsService.js';

// ============================================================
// Types
// ============================================================

/** Registered cron task with metadata */
interface RegisteredTask {
  task: ScheduledTask;
  promptId: string;
  cronPattern: string;
}

/** Result of executing a scheduled prompt */
export interface ExecutionResult {
  success: boolean;
  promptId: string;
  timestamp: string;
  error?: string;
}

/** Callback for when a prompt executes */
export type OnExecuteCallback = (promptId: string, result: ExecutionResult) => void;

// ============================================================
// State
// ============================================================

/** Map of prompt ID to registered cron task */
const registeredTasks = new Map<string, RegisteredTask>();

/** Whether the scheduler is running */
let isRunning = false;

/** Callback for execution events (for notifications) */
let onExecuteCallback: OnExecuteCallback | null = null;

// ============================================================
// Execution
// ============================================================

/**
 * Get the project path for execution
 *
 * If prompt has a specific projectPath, use it.
 * If null (global), use the last active project from settings.
 *
 * @param prompt - The scheduled prompt
 * @returns Project path or null if no project available
 */
async function resolveProjectPath(prompt: ScheduledPrompt): Promise<string | null> {
  // If prompt has a specific project, use it
  if (prompt.projectPath) {
    return prompt.projectPath;
  }

  // For global prompts, use last active project from settings
  const settings = await getSettings();
  if (settings.lastActiveProjectPath) {
    logger.debug('Using last active project for global prompt', {
      id: prompt.id,
      projectPath: settings.lastActiveProjectPath,
    });
    return settings.lastActiveProjectPath;
  }

  // No project available
  return null;
}

/**
 * Execute a scheduled prompt
 *
 * This is called when a cron job fires. It spawns a new Claude session
 * with the prompt in the specified project directory.
 *
 * @param prompt - The scheduled prompt to execute
 * @returns Execution result
 */
async function executePrompt(prompt: ScheduledPrompt): Promise<ExecutionResult> {
  const timestamp = new Date().toISOString();

  logger.info('Executing scheduled prompt', {
    id: prompt.id,
    scheduleType: prompt.scheduleType,
    projectPath: prompt.projectPath,
    promptPreview: prompt.prompt.substring(0, 50),
  });

  try {
    // Resolve the project path
    const projectPath = await resolveProjectPath(prompt);

    if (!projectPath) {
      throw new Error(
        'No project path available. Set a specific project for this prompt or send a manual prompt first to set the last active project.'
      );
    }

    // Spawn a new Claude session (fire-and-forget)
    const result = await startNewSession({
      projectPath,
      prompt: prompt.prompt,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to start Claude session');
    }

    logger.info('Claude session spawned for scheduled prompt', {
      id: prompt.id,
      projectPath,
      pid: result.pid,
    });

    // Record successful execution
    const execution: LastExecution = {
      timestamp,
      status: 'success',
    };
    await updateLastExecution(prompt.id, execution);

    // Update next run time
    const nextRunAt = calculateNextRunAt(prompt);
    await updateNextRunAt(prompt.id, nextRunAt);

    const execResult: ExecutionResult = {
      success: true,
      promptId: prompt.id,
      timestamp,
    };

    // Notify callback if registered
    if (onExecuteCallback) {
      onExecuteCallback(prompt.id, execResult);
    }

    logger.info('Scheduled prompt executed successfully', {
      id: prompt.id,
      nextRunAt,
    });

    return execResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to execute scheduled prompt', {
      id: prompt.id,
      error: errorMessage,
    });

    // Record failed execution
    const execution: LastExecution = {
      timestamp,
      status: 'failed',
      error: errorMessage,
    };
    await updateLastExecution(prompt.id, execution);

    // Update next run time even on failure (we'll try again next time)
    const nextRunAt = calculateNextRunAt(prompt);
    await updateNextRunAt(prompt.id, nextRunAt);

    const execResult: ExecutionResult = {
      success: false,
      promptId: prompt.id,
      timestamp,
      error: errorMessage,
    };

    // Notify callback if registered
    if (onExecuteCallback) {
      onExecuteCallback(prompt.id, execResult);
    }

    return execResult;
  }
}

// ============================================================
// Cron Job Management
// ============================================================

/**
 * Register a cron job for a scheduled prompt
 *
 * @param prompt - The scheduled prompt to register
 * @returns True if registered successfully
 */
export function registerCronJob(prompt: ScheduledPrompt): boolean {
  // Don't register if already registered
  if (registeredTasks.has(prompt.id)) {
    logger.debug('Cron job already registered', { id: prompt.id });
    return true;
  }

  // Don't register if disabled
  if (!prompt.enabled) {
    logger.debug('Not registering disabled prompt', { id: prompt.id });
    return false;
  }

  try {
    const cronPattern = toCronPattern(prompt);

    // Validate the pattern
    if (!cron.validate(cronPattern)) {
      logger.error('Invalid cron pattern', {
        id: prompt.id,
        pattern: cronPattern,
      });
      return false;
    }

    // Create the cron task
    const task = cron.schedule(cronPattern, async () => {
      // Re-fetch the prompt to get latest state
      const currentPrompt = await getPromptById(prompt.id);

      if (!currentPrompt) {
        logger.warn('Prompt no longer exists, unregistering', { id: prompt.id });
        unregisterCronJob(prompt.id);
        return;
      }

      if (!currentPrompt.enabled) {
        logger.debug('Prompt is disabled, skipping execution', { id: prompt.id });
        return;
      }

      await executePrompt(currentPrompt);
    });

    // Store the registered task
    registeredTasks.set(prompt.id, {
      task,
      promptId: prompt.id,
      cronPattern,
    });

    logger.info('Registered cron job', {
      id: prompt.id,
      pattern: cronPattern,
      description: getScheduleDescription(prompt),
    });

    return true;
  } catch (error) {
    logger.error('Failed to register cron job', {
      id: prompt.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Unregister a cron job for a scheduled prompt
 *
 * @param promptId - The prompt ID to unregister
 * @returns True if unregistered (or wasn't registered)
 */
export function unregisterCronJob(promptId: string): boolean {
  const registered = registeredTasks.get(promptId);

  if (!registered) {
    logger.debug('No cron job registered for prompt', { id: promptId });
    return true;
  }

  try {
    // Stop the cron task
    registered.task.stop();
    registeredTasks.delete(promptId);

    logger.info('Unregistered cron job', { id: promptId });
    return true;
  } catch (error) {
    logger.error('Failed to unregister cron job', {
      id: promptId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Check if a prompt has a registered cron job
 *
 * @param promptId - The prompt ID to check
 * @returns True if registered
 */
export function isRegistered(promptId: string): boolean {
  return registeredTasks.has(promptId);
}

/**
 * Get count of registered cron jobs
 *
 * @returns Number of registered tasks
 */
export function getRegisteredCount(): number {
  return registeredTasks.size;
}

// ============================================================
// Missed Prompt Detection
// ============================================================

/** Info about a missed scheduled prompt */
export interface MissedPromptInfo {
  id: string;
  prompt: string;
  scheduledFor: string;
  projectPath: string | null;
  missedBy: string; // Human readable duration
}

/**
 * Check for prompts that should have run but didn't
 * (i.e., their nextRunAt is in the past)
 *
 * @param prompts - Array of scheduled prompts to check
 * @returns Array of missed prompt info
 */
function detectMissedPrompts(prompts: ScheduledPrompt[]): MissedPromptInfo[] {
  const now = new Date();
  const missed: MissedPromptInfo[] = [];

  for (const prompt of prompts) {
    if (!prompt.enabled || !prompt.nextRunAt) continue;

    const nextRun = new Date(prompt.nextRunAt);
    if (nextRun < now) {
      // Calculate how long ago it should have run
      const diffMs = now.getTime() - nextRun.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const missedBy = diffHours > 0 ? `${diffHours}h ${diffMins % 60}m ago` : `${diffMins}m ago`;

      missed.push({
        id: prompt.id,
        prompt: prompt.prompt.substring(0, 100) + (prompt.prompt.length > 100 ? '...' : ''),
        scheduledFor: prompt.nextRunAt,
        projectPath: prompt.projectPath,
        missedBy,
      });
    }
  }

  return missed;
}

// ============================================================
// Scheduler Lifecycle
// ============================================================

/**
 * Start the scheduler service
 *
 * Loads all enabled scheduled prompts and registers their cron jobs.
 * Should be called on server startup.
 */
export async function startScheduler(): Promise<void> {
  if (isRunning) {
    logger.warn('Scheduler already running');
    return;
  }

  logger.info('Starting scheduler service');

  try {
    // Load all prompts
    const prompts = await getAllPrompts();
    const enabledPrompts = prompts.filter((p) => p.enabled);

    logger.info('Loading scheduled prompts', {
      total: prompts.length,
      enabled: enabledPrompts.length,
    });

    // Check for missed prompts
    const missedPrompts = detectMissedPrompts(enabledPrompts);
    if (missedPrompts.length > 0) {
      logger.warn('Detected missed scheduled prompts', {
        count: missedPrompts.length,
        prompts: missedPrompts.map((p) => ({
          id: p.id,
          scheduledFor: p.scheduledFor,
          missedBy: p.missedBy,
        })),
      });

      // Log each missed prompt with details
      for (const missed of missedPrompts) {
        logger.warn('Missed scheduled prompt', {
          id: missed.id,
          promptPreview: missed.prompt,
          scheduledFor: missed.scheduledFor,
          missedBy: missed.missedBy,
          projectPath: missed.projectPath,
          hint: 'Use POST /api/scheduled-prompts/:id/run to execute manually',
        });
      }
    }

    // Register cron jobs for enabled prompts
    let registered = 0;
    for (const prompt of enabledPrompts) {
      if (registerCronJob(prompt)) {
        registered++;

        // Update next run time (this will skip past any missed times)
        const nextRunAt = calculateNextRunAt(prompt);
        await updateNextRunAt(prompt.id, nextRunAt);
      }
    }

    isRunning = true;

    logger.info('Scheduler service started', {
      registeredJobs: registered,
      missedPrompts: missedPrompts.length,
    });
  } catch (error) {
    logger.error('Failed to start scheduler service', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Stop the scheduler service
 *
 * Unregisters all cron jobs. Should be called on server shutdown.
 */
export function stopScheduler(): void {
  if (!isRunning) {
    logger.warn('Scheduler not running');
    return;
  }

  logger.info('Stopping scheduler service', {
    registeredJobs: registeredTasks.size,
  });

  // Stop all cron tasks
  for (const [promptId, registered] of registeredTasks) {
    try {
      registered.task.stop();
      logger.debug('Stopped cron job', { id: promptId });
    } catch (error) {
      logger.error('Error stopping cron job', {
        id: promptId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Clear the map
  registeredTasks.clear();
  isRunning = false;

  logger.info('Scheduler service stopped');
}

/**
 * Check if the scheduler is running
 *
 * @returns True if running
 */
export function isSchedulerRunning(): boolean {
  return isRunning;
}

/**
 * Set callback for execution events
 *
 * Used to notify clients when a scheduled prompt executes.
 *
 * @param callback - Callback function or null to clear
 */
export function setOnExecuteCallback(callback: OnExecuteCallback | null): void {
  onExecuteCallback = callback;
}

// ============================================================
// Convenience Methods (for API layer)
// ============================================================

/**
 * Handle prompt enabled state change
 *
 * Registers or unregisters the cron job based on enabled state.
 *
 * @param prompt - The updated prompt
 */
export async function handlePromptToggle(prompt: ScheduledPrompt): Promise<void> {
  if (prompt.enabled) {
    registerCronJob(prompt);
    // Update next run time
    const nextRunAt = calculateNextRunAt(prompt);
    await updateNextRunAt(prompt.id, nextRunAt);
  } else {
    unregisterCronJob(prompt.id);
  }
}

/**
 * Handle prompt creation
 *
 * Registers cron job if prompt is enabled.
 *
 * @param prompt - The new prompt
 */
export async function handlePromptCreated(prompt: ScheduledPrompt): Promise<void> {
  if (prompt.enabled) {
    registerCronJob(prompt);
    // Update next run time
    const nextRunAt = calculateNextRunAt(prompt);
    await updateNextRunAt(prompt.id, nextRunAt);
  }
}

/**
 * Handle prompt update
 *
 * Re-registers cron job if schedule changed.
 *
 * @param prompt - The updated prompt
 */
export async function handlePromptUpdated(prompt: ScheduledPrompt): Promise<void> {
  // Unregister old job
  unregisterCronJob(prompt.id);

  // Register new job if enabled
  if (prompt.enabled) {
    registerCronJob(prompt);
    // Update next run time
    const nextRunAt = calculateNextRunAt(prompt);
    await updateNextRunAt(prompt.id, nextRunAt);
  }
}

/**
 * Handle prompt deletion
 *
 * Unregisters the cron job.
 *
 * @param promptId - The deleted prompt ID
 */
export function handlePromptDeleted(promptId: string): void {
  unregisterCronJob(promptId);
}

/**
 * Manually run a scheduled prompt now
 *
 * Useful for testing or catching up on missed prompts.
 *
 * @param promptId - The prompt ID to run
 * @returns Execution result, or null if prompt not found
 */
export async function runPromptNow(promptId: string): Promise<ExecutionResult | null> {
  const prompt = await getPromptById(promptId);

  if (!prompt) {
    logger.warn('Cannot run prompt - not found', { id: promptId });
    return null;
  }

  logger.info('Manually running scheduled prompt', {
    id: promptId,
    scheduleType: prompt.scheduleType,
  });

  return executePrompt(prompt);
}

/**
 * Get list of missed scheduled prompts
 *
 * Returns prompts whose nextRunAt time has passed.
 * Useful for UI to show missed prompts.
 *
 * @returns Array of missed prompt info
 */
export async function getMissedPrompts(): Promise<MissedPromptInfo[]> {
  const prompts = await getAllPrompts();
  const enabledPrompts = prompts.filter((p) => p.enabled);
  return detectMissedPrompts(enabledPrompts);
}
