/**
 * Settings Service
 *
 * Manages application settings stored in ~/.gogogadgetclaude/settings.json
 * Handles reading, writing, and validation of settings.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
import { logger } from '../lib/logger.js';

// ============================================================
// Types (matches shared/types/index.ts)
// ============================================================

/** Prompt template */
export interface Template {
  /** Display label */
  label: string;
  /** Icon identifier or emoji */
  icon: string;
  /** The prompt text to send */
  prompt: string;
}

/** App theme preference */
export type ThemePreference = 'light' | 'dark' | 'system';

/** App settings stored in ~/.gogogadgetclaude/settings.json */
export interface AppSettings {
  /** Whether notifications are enabled */
  notificationsEnabled: boolean;
  /** Phone number for iMessage notifications */
  notificationPhoneNumber?: string;
  /** Server hostname for notification links (e.g., "dereks-macbook-pro" or "my-mac.tailnet.ts.net") */
  serverHostname?: string;
  /** User's custom templates */
  defaultTemplates: Template[];
  /** Theme preference */
  theme: ThemePreference;
}

// ============================================================
// Constants
// ============================================================

/** Settings directory path */
const SETTINGS_DIR = join(homedir(), '.gogogadgetclaude');

/** Settings file path */
const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json');

// ============================================================
// Zod Schemas
// ============================================================

/** Template schema */
const TemplateSchema = z.object({
  label: z.string(),
  icon: z.string(),
  prompt: z.string(),
});

/** App settings schema */
const AppSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
  notificationPhoneNumber: z.string().optional(),
  serverHostname: z.string().optional(),
  defaultTemplates: z.array(TemplateSchema),
  theme: z.enum(['light', 'dark', 'system']),
});

/** Partial settings schema for updates */
const PartialSettingsSchema = AppSettingsSchema.partial();

// ============================================================
// Default Values
// ============================================================

/** Default templates (empty - user can define their own) */
const DEFAULT_TEMPLATES: Template[] = [];

/** Default settings */
const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: false,
  notificationPhoneNumber: undefined,
  defaultTemplates: DEFAULT_TEMPLATES,
  theme: 'system' as ThemePreference,
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
 * Read raw settings from file
 * @returns Settings object or null if file doesn't exist
 */
async function readSettingsFile(): Promise<unknown | null> {
  try {
    const content = await readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Write settings to file
 */
async function writeSettingsFile(settings: AppSettings): Promise<void> {
  await ensureSettingsDir();
  const content = JSON.stringify(settings, null, 2);
  await writeFile(SETTINGS_FILE, content, 'utf-8');
}

/**
 * Merge settings with defaults, ensuring all required fields exist
 */
function mergeWithDefaults(settings: Partial<AppSettings>): AppSettings {
  return {
    notificationsEnabled: settings.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
    notificationPhoneNumber: settings.notificationPhoneNumber,
    serverHostname: settings.serverHostname,
    defaultTemplates: settings.defaultTemplates ?? DEFAULT_SETTINGS.defaultTemplates,
    theme: settings.theme ?? DEFAULT_SETTINGS.theme,
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Get current settings
 *
 * Reads settings from file, creating default settings if file doesn't exist.
 * Invalid or corrupted settings are replaced with defaults.
 *
 * @returns Current app settings
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const rawSettings = await readSettingsFile();

    // File doesn't exist - create with defaults
    if (rawSettings === null) {
      logger.info('Settings file not found, creating with defaults', {
        path: SETTINGS_FILE,
      });
      await writeSettingsFile(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }

    // Validate and merge with defaults
    const parseResult = PartialSettingsSchema.safeParse(rawSettings);

    if (!parseResult.success) {
      logger.warn('Invalid settings file, using defaults', {
        path: SETTINGS_FILE,
        errors: parseResult.error.issues,
      });
      return DEFAULT_SETTINGS;
    }

    // Merge with defaults to ensure all fields exist
    return mergeWithDefaults(parseResult.data);
  } catch (err) {
    logger.error('Failed to read settings', {
      path: SETTINGS_FILE,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update settings
 *
 * Merges the partial update with existing settings and saves to file.
 *
 * @param partial - Partial settings to update
 * @returns Updated app settings
 * @throws Error if update fails
 */
export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  // Validate the partial update
  const parseResult = PartialSettingsSchema.safeParse(partial);

  if (!parseResult.success) {
    logger.warn('Invalid settings update', {
      errors: parseResult.error.issues,
    });
    throw new Error(
      `Invalid settings: ${parseResult.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  // Get current settings
  const current = await getSettings();

  // Merge with update
  const updated: AppSettings = {
    ...current,
    ...parseResult.data,
  };

  // Write to file
  try {
    await writeSettingsFile(updated);
    logger.info('Settings updated', {
      path: SETTINGS_FILE,
      changes: Object.keys(partial),
    });
    return updated;
  } catch (err) {
    logger.error('Failed to write settings', {
      path: SETTINGS_FILE,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    throw new Error('Failed to save settings');
  }
}

/**
 * Get the settings file path
 *
 * Useful for debugging and documentation.
 *
 * @returns Path to settings file
 */
export function getSettingsPath(): string {
  return SETTINGS_FILE;
}
