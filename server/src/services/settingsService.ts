/**
 * Settings Service
 *
 * Manages application settings stored in ~/.gogogadgetclaude/settings.json
 * Handles reading, writing, and validation of settings.
 * Includes migration logic for upgrading from legacy notification settings
 * to the new channel-based structure.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { encrypt, decrypt, maskSensitive } from '../lib/encryption.js';

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

// -----------------------------------------------------------------------------
// Notification Channel Settings Types
// -----------------------------------------------------------------------------

/** Settings for iMessage channel */
export interface IMessageChannelSettings {
  enabled: boolean;
  phoneNumber?: string;
}

/** Settings for ntfy channel */
export interface NtfyChannelSettings {
  enabled: boolean;
  serverUrl?: string;
  topic?: string;
  authToken?: string;
}

/** Settings for Slack channel */
export interface SlackChannelSettings {
  enabled: boolean;
  webhookUrl?: string;
}

/** Settings for Telegram channel */
export interface TelegramChannelSettings {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
}

/** Settings for Email channel */
export interface EmailChannelSettings {
  enabled: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  recipient?: string;
}

/** All notification channel settings */
export interface NotificationChannelSettings {
  imessage?: IMessageChannelSettings;
  ntfy?: NtfyChannelSettings;
  slack?: SlackChannelSettings;
  telegram?: TelegramChannelSettings;
  email?: EmailChannelSettings;
}

// -----------------------------------------------------------------------------
// Serverless Settings Type
// -----------------------------------------------------------------------------

/** Serverless execution settings */
export interface ServerlessSettings {
  /** Whether serverless mode is enabled */
  enabled: boolean;
  /** Modal API token (stored encrypted) */
  modalToken?: string;
  /** Claude API key for cloud execution (stored encrypted) */
  claudeApiKey?: string;
  /** Default git repository URL for cloud execution */
  defaultRepoUrl?: string;
  /** User's Tailscale/local laptop URL for connectivity checks */
  laptopUrl?: string;
}

// -----------------------------------------------------------------------------
// App Settings Type
// -----------------------------------------------------------------------------

/** App settings stored in ~/.gogogadgetclaude/settings.json */
export interface AppSettings {
  // === LEGACY (deprecated, migrated to channels) ===
  /** @deprecated Use channels.imessage.enabled instead */
  notificationsEnabled?: boolean;
  /** @deprecated Use channels.imessage.phoneNumber instead */
  notificationPhoneNumber?: string;

  // === NEW: Channel-based notifications ===
  /** Notification channel configurations */
  channels?: NotificationChannelSettings;

  // === SERVERLESS EXECUTION (V1) ===
  /** Serverless execution settings for cloud compute */
  serverless?: ServerlessSettings;

  // === UNCHANGED ===
  /** Server hostname for notification links */
  serverHostname?: string;
  /** User's custom templates */
  defaultTemplates: Template[];
  /** Theme preference */
  theme: ThemePreference;
  /** Allow Claude to make edits without asking for permission */
  allowEdits?: boolean;
  /** Last active project path (used for global scheduled prompts) */
  lastActiveProjectPath?: string;
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

/** iMessage channel settings schema */
const IMessageChannelSettingsSchema = z.object({
  enabled: z.boolean(),
  phoneNumber: z.string().optional(),
});

/** ntfy channel settings schema */
const NtfyChannelSettingsSchema = z.object({
  enabled: z.boolean(),
  serverUrl: z.string().optional(),
  topic: z.string().optional(),
  authToken: z.string().optional(),
});

/** Slack channel settings schema */
const SlackChannelSettingsSchema = z.object({
  enabled: z.boolean(),
  webhookUrl: z.string().optional(),
});

/** Telegram channel settings schema */
const TelegramChannelSettingsSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string().optional(),
  chatId: z.string().optional(),
});

/** Email channel settings schema */
const EmailChannelSettingsSchema = z.object({
  enabled: z.boolean(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  recipient: z.string().optional(),
});

/** Notification channel settings schema */
const NotificationChannelSettingsSchema = z.object({
  imessage: IMessageChannelSettingsSchema.optional(),
  ntfy: NtfyChannelSettingsSchema.optional(),
  slack: SlackChannelSettingsSchema.optional(),
  telegram: TelegramChannelSettingsSchema.optional(),
  email: EmailChannelSettingsSchema.optional(),
});

/** Serverless settings schema */
const ServerlessSettingsSchema = z.object({
  enabled: z.boolean(),
  modalToken: z.string().optional(),
  claudeApiKey: z.string().optional(),
  defaultRepoUrl: z.string().optional(),
  laptopUrl: z.string().optional(),
});

/** App settings schema (supports both legacy and new format) */
const AppSettingsSchema = z.object({
  // Legacy fields (optional for backward compatibility)
  notificationsEnabled: z.boolean().optional(),
  notificationPhoneNumber: z.string().optional(),
  // New channel-based settings
  channels: NotificationChannelSettingsSchema.optional(),
  // Serverless execution settings
  serverless: ServerlessSettingsSchema.optional(),
  // Unchanged fields
  serverHostname: z.string().optional(),
  defaultTemplates: z.array(TemplateSchema),
  theme: z.enum(['light', 'dark', 'system']),
  allowEdits: z.boolean().optional(),
  lastActiveProjectPath: z.string().optional(),
});

/** Partial settings schema for updates */
const PartialSettingsSchema = AppSettingsSchema.partial();

// ============================================================
// Default Values
// ============================================================

/** Default templates (empty - user can define their own) */
const DEFAULT_TEMPLATES: Template[] = [];

/** Default settings (new format with channels) */
const DEFAULT_SETTINGS: AppSettings = {
  channels: {
    imessage: {
      enabled: false,
      phoneNumber: undefined,
    },
  },
  defaultTemplates: DEFAULT_TEMPLATES,
  theme: 'system' as ThemePreference,
};

// ============================================================
// Migration Logic
// ============================================================

/**
 * Check if settings need migration from legacy format.
 * Returns true if settings have legacy notification fields but no channels.
 */
function needsMigration(settings: Partial<AppSettings>): boolean {
  // Has channels already? No migration needed
  if (settings.channels) {
    return false;
  }

  // Has legacy notification fields? Migration needed
  return (
    settings.notificationsEnabled !== undefined || settings.notificationPhoneNumber !== undefined
  );
}

/**
 * Migrate settings from legacy format to new channel-based format.
 *
 * Converts:
 *   { notificationsEnabled: true, notificationPhoneNumber: "+1234567890" }
 * To:
 *   { channels: { imessage: { enabled: true, phoneNumber: "+1234567890" } } }
 *
 * The legacy fields are removed after migration.
 */
function migrateSettings(settings: Partial<AppSettings>): AppSettings {
  // If already has channels, just merge with defaults
  if (settings.channels) {
    return mergeWithDefaults(settings);
  }

  logger.info('Migrating settings from legacy format to channel-based format');

  // Create the migrated settings
  const migrated: AppSettings = {
    // Copy all non-notification fields
    serverHostname: settings.serverHostname,
    defaultTemplates: settings.defaultTemplates ?? DEFAULT_TEMPLATES,
    theme: settings.theme ?? DEFAULT_SETTINGS.theme,
    allowEdits: settings.allowEdits,
    lastActiveProjectPath: settings.lastActiveProjectPath,
    // Create channels from legacy fields
    channels: {
      imessage: {
        enabled: settings.notificationsEnabled ?? false,
        phoneNumber: settings.notificationPhoneNumber,
      },
    },
  };

  logger.debug('Settings migrated', {
    wasEnabled: settings.notificationsEnabled,
    hadPhoneNumber: !!settings.notificationPhoneNumber,
  });

  return migrated;
}

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
 * Encrypts sensitive fields before writing.
 */
async function writeSettingsFile(settings: AppSettings): Promise<void> {
  await ensureSettingsDir();
  const processed = processSettingsBeforeWrite(settings);
  const content = JSON.stringify(processed, null, 2);
  await writeFile(SETTINGS_FILE, content, 'utf-8');
}

/**
 * Merge settings with defaults, ensuring all required fields exist.
 * Assumes settings are already in the new channel-based format.
 */
function mergeWithDefaults(settings: Partial<AppSettings>): AppSettings {
  return {
    // Merge channels with defaults
    channels: {
      imessage: {
        enabled:
          settings.channels?.imessage?.enabled ??
          DEFAULT_SETTINGS.channels?.imessage?.enabled ??
          false,
        phoneNumber: settings.channels?.imessage?.phoneNumber,
      },
      // Preserve any other channel settings (ntfy, slack, etc.)
      ...(settings.channels?.ntfy && { ntfy: settings.channels.ntfy }),
      ...(settings.channels?.slack && { slack: settings.channels.slack }),
      ...(settings.channels?.telegram && { telegram: settings.channels.telegram }),
      ...(settings.channels?.email && { email: settings.channels.email }),
    },
    // Preserve serverless settings if present
    ...(settings.serverless && { serverless: settings.serverless }),
    serverHostname: settings.serverHostname,
    defaultTemplates: settings.defaultTemplates ?? DEFAULT_SETTINGS.defaultTemplates,
    theme: settings.theme ?? DEFAULT_SETTINGS.theme,
    allowEdits: settings.allowEdits,
    lastActiveProjectPath: settings.lastActiveProjectPath,
  };
}

// ============================================================
// Encryption Helpers
// ============================================================

/** Fields that should be encrypted in serverless settings */
const ENCRYPTED_SERVERLESS_FIELDS: (keyof ServerlessSettings)[] = ['modalToken', 'claudeApiKey'];

/**
 * Encrypt sensitive fields in serverless settings before saving.
 */
function encryptServerlessSettings(settings: ServerlessSettings): ServerlessSettings {
  const encrypted = { ...settings };

  for (const field of ENCRYPTED_SERVERLESS_FIELDS) {
    const value = encrypted[field];
    if (typeof value === 'string' && value) {
      (encrypted as Record<string, unknown>)[field] = encrypt(value);
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in serverless settings after reading.
 */
function decryptServerlessSettings(settings: ServerlessSettings): ServerlessSettings {
  const decrypted = { ...settings };

  for (const field of ENCRYPTED_SERVERLESS_FIELDS) {
    const value = decrypted[field];
    if (typeof value === 'string' && value) {
      (decrypted as Record<string, unknown>)[field] = decrypt(value);
    }
  }

  return decrypted;
}

/**
 * Process settings after reading from disk.
 * Decrypts sensitive fields.
 */
function processSettingsAfterRead(settings: AppSettings): AppSettings {
  if (settings.serverless) {
    return {
      ...settings,
      serverless: decryptServerlessSettings(settings.serverless),
    };
  }
  return settings;
}

/**
 * Process settings before writing to disk.
 * Encrypts sensitive fields.
 */
function processSettingsBeforeWrite(settings: AppSettings): AppSettings {
  if (settings.serverless) {
    return {
      ...settings,
      serverless: encryptServerlessSettings(settings.serverless),
    };
  }
  return settings;
}

// ============================================================
// Public API
// ============================================================

/**
 * Get current settings
 *
 * Reads settings from file, creating default settings if file doesn't exist.
 * Automatically migrates legacy notification settings to the new channel-based format.
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

    // Validate the raw settings
    const parseResult = PartialSettingsSchema.safeParse(rawSettings);

    if (!parseResult.success) {
      logger.warn('Invalid settings file, using defaults', {
        path: SETTINGS_FILE,
        errors: parseResult.error.issues,
      });
      return DEFAULT_SETTINGS;
    }

    const parsedSettings = parseResult.data;

    // Check if migration is needed (legacy format detected)
    if (needsMigration(parsedSettings)) {
      const migratedSettings = migrateSettings(parsedSettings);

      // Save the migrated settings to persist the migration
      try {
        await writeSettingsFile(migratedSettings);
        logger.info('Migrated settings saved to disk', { path: SETTINGS_FILE });
      } catch (writeErr) {
        logger.warn('Failed to persist migrated settings', {
          error: writeErr instanceof Error ? writeErr.message : 'Unknown error',
        });
      }

      return migratedSettings;
    }

    // Already in new format, just merge with defaults
    const merged = mergeWithDefaults(parsedSettings);
    // Decrypt sensitive fields
    return processSettingsAfterRead(merged);
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

// ============================================================
// Backward Compatibility Helpers
// ============================================================

/**
 * Check if iMessage notifications are enabled.
 *
 * Helper for backward compatibility - checks the new channel-based settings.
 *
 * @param settings - App settings
 * @returns true if iMessage notifications are enabled
 */
export function isIMessageEnabled(settings: AppSettings): boolean {
  return settings.channels?.imessage?.enabled ?? false;
}

/**
 * Get the iMessage phone number.
 *
 * Helper for backward compatibility - gets from the new channel-based settings.
 *
 * @param settings - App settings
 * @returns Phone number or undefined
 */
export function getIMessagePhoneNumber(settings: AppSettings): string | undefined {
  return settings.channels?.imessage?.phoneNumber;
}

// ============================================================
// Serverless Settings Helpers
// ============================================================

/**
 * Check if serverless execution is enabled.
 *
 * @param settings - App settings
 * @returns true if serverless mode is enabled
 */
export function isServerlessEnabled(settings: AppSettings): boolean {
  return settings.serverless?.enabled ?? false;
}

/**
 * Get the serverless settings.
 *
 * @param settings - App settings
 * @returns Serverless settings or undefined
 */
export function getServerlessSettings(settings: AppSettings): ServerlessSettings | undefined {
  return settings.serverless;
}

/**
 * Get the Modal API token (decrypted).
 *
 * @param settings - App settings
 * @returns Modal token or undefined
 */
export function getModalToken(settings: AppSettings): string | undefined {
  return settings.serverless?.modalToken;
}

/**
 * Get the Claude API key for cloud execution (decrypted).
 *
 * @param settings - App settings
 * @returns Claude API key or undefined
 */
export function getClaudeApiKey(settings: AppSettings): string | undefined {
  return settings.serverless?.claudeApiKey;
}

/**
 * Get the default repository URL for cloud execution.
 *
 * @param settings - App settings
 * @returns Default repo URL or undefined
 */
export function getDefaultRepoUrl(settings: AppSettings): string | undefined {
  return settings.serverless?.defaultRepoUrl;
}

/**
 * Get the laptop URL for connectivity checks.
 *
 * @param settings - App settings
 * @returns Laptop URL or undefined
 */
export function getLaptopUrl(settings: AppSettings): string | undefined {
  return settings.serverless?.laptopUrl;
}

/**
 * Update serverless settings.
 * Handles encryption of sensitive fields automatically.
 *
 * @param serverlessUpdate - Partial serverless settings to update
 * @returns Updated app settings
 */
export async function updateServerlessSettings(
  serverlessUpdate: Partial<ServerlessSettings>
): Promise<AppSettings> {
  const current = await getSettings();
  const currentServerless = current.serverless ?? { enabled: false };

  const updatedServerless: ServerlessSettings = {
    ...currentServerless,
    ...serverlessUpdate,
  };

  return updateSettings({ serverless: updatedServerless });
}

/**
 * Get serverless settings with masked sensitive values (for logging/display).
 *
 * @param settings - App settings
 * @returns Serverless settings with masked tokens
 */
export function getServerlessSettingsMasked(
  settings: AppSettings
): Record<string, unknown> | undefined {
  if (!settings.serverless) {
    return undefined;
  }

  return {
    enabled: settings.serverless.enabled,
    modalToken: maskSensitive(settings.serverless.modalToken),
    claudeApiKey: maskSensitive(settings.serverless.claudeApiKey),
    defaultRepoUrl: settings.serverless.defaultRepoUrl,
    laptopUrl: settings.serverless.laptopUrl,
  };
}
