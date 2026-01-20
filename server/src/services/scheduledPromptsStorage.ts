/**
 * Scheduled Prompts Storage Service
 *
 * Manages persistence of scheduled prompts in ~/.gogogadgetclaude/scheduled-prompts.json
 * Handles reading, writing, and validation of scheduled prompt data.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.js';
import type {
  ScheduledPrompt,
  ScheduledPromptInput,
  ScheduledPromptsFile,
  LastExecution,
  ScheduleType,
  ExecutionStatus,
} from '../../../shared/types/index.js';

// Re-export types for convenience
export type {
  ScheduledPrompt,
  ScheduledPromptInput,
  ScheduledPromptsFile,
  LastExecution,
  ScheduleType,
  ExecutionStatus,
};

// ============================================================
// Cloud Sync (Lazy Import to Avoid Circular Dependencies)
// ============================================================

/** Flag to enable/disable cloud sync */
let cloudSyncEnabled = true;

/**
 * Trigger cloud sync after a change
 * Uses dynamic import to avoid circular dependencies
 */
async function triggerCloudSync(): Promise<void> {
  if (!cloudSyncEnabled) return;

  try {
    // Dynamic import to avoid circular dependency
    const { syncPromptsToModal } = await import('./scheduledPromptsSyncService.js');

    // Sync in background (don't block the local operation)
    syncPromptsToModal().catch((err) => {
      logger.warn('Background cloud sync failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } catch (err) {
    logger.warn('Failed to import cloud sync service', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Enable or disable cloud sync
 * Useful for testing or when Modal is unavailable
 */
export function setCloudSyncEnabled(enabled: boolean): void {
  cloudSyncEnabled = enabled;
  logger.info('Cloud sync for scheduled prompts', { enabled });
}

// ============================================================
// Constants
// ============================================================

/** Settings directory path */
const SETTINGS_DIR = join(homedir(), '.gogogadgetclaude');

/** Scheduled prompts file path */
const SCHEDULED_PROMPTS_FILE = join(SETTINGS_DIR, 'scheduled-prompts.json');

// ============================================================
// Zod Schemas
// ============================================================

/** Last execution schema */
const LastExecutionSchema = z.object({
  timestamp: z.string(),
  status: z.enum(['success', 'failed']),
  error: z.string().optional(),
});

/** Scheduled prompt schema */
const ScheduledPromptSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().min(1),
  scheduleType: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  projectPath: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  lastExecution: LastExecutionSchema.optional(),
  nextRunAt: z.string().optional(),
});

/** Scheduled prompts file schema */
const ScheduledPromptsFileSchema = z.object({
  prompts: z.array(ScheduledPromptSchema),
});

/** Input schema for creating/updating */
const ScheduledPromptInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt text is required'),
  scheduleType: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  projectPath: z.string().nullable(),
});

// ============================================================
// Default Values
// ============================================================

/** Default empty file */
const DEFAULT_FILE: ScheduledPromptsFile = {
  prompts: [],
};

// ============================================================
// Internal Functions
// ============================================================

/**
 * Ensure the settings directory exists
 */
async function ensureSettingsDir(): Promise<void> {
  try {
    await mkdir(SETTINGS_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist, which is fine
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * Read raw data from file
 * @returns Parsed data or null if file doesn't exist
 */
async function readPromptsFile(): Promise<unknown | null> {
  try {
    const content = await readFile(SCHEDULED_PROMPTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Write prompts to file
 */
async function writePromptsFile(data: ScheduledPromptsFile): Promise<void> {
  await ensureSettingsDir();
  const content = JSON.stringify(data, null, 2);
  await writeFile(SCHEDULED_PROMPTS_FILE, content, 'utf-8');
}

/**
 * Validate input and check schedule-specific requirements
 */
function validateInput(input: ScheduledPromptInput): void {
  // Basic schema validation
  const parseResult = ScheduledPromptInputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Invalid input: ${parseResult.error.issues.map((i) => i.message).join(', ')}`);
  }

  // Schedule-specific validation
  if (input.scheduleType === 'weekly' && input.dayOfWeek === undefined) {
    throw new Error('dayOfWeek is required for weekly schedules');
  }
  if (input.scheduleType === 'monthly' && input.dayOfMonth === undefined) {
    throw new Error('dayOfMonth is required for monthly schedules');
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Get all scheduled prompts
 *
 * Reads prompts from file, creating empty file if it doesn't exist.
 *
 * @returns Array of scheduled prompts
 */
export async function getAllPrompts(): Promise<ScheduledPrompt[]> {
  try {
    const rawData = await readPromptsFile();

    // File doesn't exist - create with empty array
    if (rawData === null) {
      logger.info('Scheduled prompts file not found, creating empty file', {
        path: SCHEDULED_PROMPTS_FILE,
      });
      await writePromptsFile(DEFAULT_FILE);
      return [];
    }

    // Validate structure
    const parseResult = ScheduledPromptsFileSchema.safeParse(rawData);

    if (!parseResult.success) {
      logger.warn('Invalid scheduled prompts file, using empty array', {
        path: SCHEDULED_PROMPTS_FILE,
        errors: parseResult.error.issues,
      });
      return [];
    }

    return parseResult.data.prompts;
  } catch (err) {
    logger.error('Failed to read scheduled prompts', {
      path: SCHEDULED_PROMPTS_FILE,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Get a single scheduled prompt by ID
 *
 * @param id - Prompt ID
 * @returns The prompt or null if not found
 */
export async function getPromptById(id: string): Promise<ScheduledPrompt | null> {
  const prompts = await getAllPrompts();
  return prompts.find((p) => p.id === id) ?? null;
}

/**
 * Create a new scheduled prompt
 *
 * @param input - Prompt configuration
 * @returns The created prompt
 */
export async function createPrompt(input: ScheduledPromptInput): Promise<ScheduledPrompt> {
  validateInput(input);

  const prompts = await getAllPrompts();

  const newPrompt: ScheduledPrompt = {
    id: randomUUID(),
    prompt: input.prompt,
    scheduleType: input.scheduleType,
    timeOfDay: input.timeOfDay,
    dayOfWeek: input.dayOfWeek,
    dayOfMonth: input.dayOfMonth,
    projectPath: input.projectPath,
    enabled: true,
    createdAt: new Date().toISOString(),
    // nextRunAt will be calculated by the scheduler service
  };

  prompts.push(newPrompt);
  await writePromptsFile({ prompts });

  logger.info('Created scheduled prompt', {
    id: newPrompt.id,
    scheduleType: newPrompt.scheduleType,
    timeOfDay: newPrompt.timeOfDay,
  });

  // Sync to cloud
  triggerCloudSync();

  return newPrompt;
}

/**
 * Update an existing scheduled prompt
 *
 * @param id - Prompt ID
 * @param input - Partial update data
 * @returns The updated prompt or null if not found
 */
export async function updatePrompt(
  id: string,
  input: Partial<ScheduledPromptInput>
): Promise<ScheduledPrompt | null> {
  const prompts = await getAllPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  const existing = prompts[index];
  const updated: ScheduledPrompt = {
    ...existing,
    ...input,
  };

  // Re-validate the combined result
  const combined: ScheduledPromptInput = {
    prompt: updated.prompt,
    scheduleType: updated.scheduleType,
    timeOfDay: updated.timeOfDay,
    dayOfWeek: updated.dayOfWeek,
    dayOfMonth: updated.dayOfMonth,
    projectPath: updated.projectPath,
  };
  validateInput(combined);

  prompts[index] = updated;
  await writePromptsFile({ prompts });

  logger.info('Updated scheduled prompt', { id });

  // Sync to cloud
  triggerCloudSync();

  return updated;
}

/**
 * Delete a scheduled prompt
 *
 * @param id - Prompt ID
 * @returns True if deleted, false if not found
 */
export async function deletePrompt(id: string): Promise<boolean> {
  const prompts = await getAllPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    return false;
  }

  prompts.splice(index, 1);
  await writePromptsFile({ prompts });

  logger.info('Deleted scheduled prompt', { id });

  // Sync to cloud
  triggerCloudSync();

  return true;
}

/**
 * Toggle a prompt's enabled state
 *
 * @param id - Prompt ID
 * @returns The updated prompt or null if not found
 */
export async function togglePrompt(id: string): Promise<ScheduledPrompt | null> {
  const prompts = await getAllPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  prompts[index].enabled = !prompts[index].enabled;
  await writePromptsFile({ prompts });

  logger.info('Toggled scheduled prompt', {
    id,
    enabled: prompts[index].enabled,
  });

  // Sync to cloud
  triggerCloudSync();

  return prompts[index];
}

/**
 * Update the last execution result for a prompt
 *
 * @param id - Prompt ID
 * @param execution - Execution result
 * @returns The updated prompt or null if not found
 */
export async function updateLastExecution(
  id: string,
  execution: LastExecution
): Promise<ScheduledPrompt | null> {
  const prompts = await getAllPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  prompts[index].lastExecution = execution;
  await writePromptsFile({ prompts });

  logger.info('Updated last execution', {
    id,
    status: execution.status,
  });

  // Sync to cloud (so cloud knows about local execution)
  triggerCloudSync();

  return prompts[index];
}

/**
 * Update the next run time for a prompt
 *
 * @param id - Prompt ID
 * @param nextRunAt - ISO timestamp of next run
 * @returns The updated prompt or null if not found
 */
export async function updateNextRunAt(
  id: string,
  nextRunAt: string
): Promise<ScheduledPrompt | null> {
  const prompts = await getAllPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  prompts[index].nextRunAt = nextRunAt;
  await writePromptsFile({ prompts });

  return prompts[index];
}

/**
 * Get the scheduled prompts file path
 *
 * Useful for debugging and documentation.
 *
 * @returns Path to scheduled prompts file
 */
export function getScheduledPromptsPath(): string {
  return SCHEDULED_PROMPTS_FILE;
}
