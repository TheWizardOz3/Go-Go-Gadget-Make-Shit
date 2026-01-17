/**
 * Notification Types and Interfaces
 *
 * Defines the common interface for notification channels and related types.
 * All notification channels (iMessage, ntfy, Slack, etc.) implement the
 * NotificationChannel interface.
 */

// ============================================================
// Notification Payload Types
// ============================================================

/** Type of notification being sent */
export type NotificationType = 'task-complete' | 'test';

/** Base notification payload */
export interface NotificationPayload {
  /** Type of notification */
  type: NotificationType;
  /** Project name (for task-complete) */
  projectName?: string;
  /** Custom message (for test) */
  message?: string;
  /** App URL to include in notification */
  appUrl: string;
}

// ============================================================
// Notification Result Types
// ============================================================

/** Result of sending a notification */
export interface NotificationResult {
  /** Whether the notification was sent successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Whether it was skipped (rate limited, disabled, etc.) */
  skipped?: boolean;
  /** Reason for skipping */
  skipReason?: string;
}

// ============================================================
// Rate Limiting Types
// ============================================================

/** Rate limit status for a channel */
export interface RateLimitStatus {
  /** Whether the channel is currently rate limited */
  isLimited: boolean;
  /** Timestamp of last notification sent (ms since epoch) */
  lastNotificationTime: number | null;
  /** Seconds until rate limit resets */
  secondsUntilReset: number | null;
}

/** Default rate limit window in milliseconds (60 seconds) */
export const DEFAULT_RATE_LIMIT_MS = 60 * 1000;

// ============================================================
// Channel Identifier Types
// ============================================================

/** Channel identifier (used in settings) */
export type NotificationChannelId = 'imessage' | 'ntfy' | 'slack' | 'telegram' | 'email';

/** Array of all valid channel IDs (for iteration/validation) */
export const NOTIFICATION_CHANNEL_IDS: NotificationChannelId[] = [
  'imessage',
  'ntfy',
  'slack',
  'telegram',
  'email',
];

/**
 * Type guard to check if a string is a valid NotificationChannelId
 */
export function isNotificationChannelId(value: string): value is NotificationChannelId {
  return NOTIFICATION_CHANNEL_IDS.includes(value as NotificationChannelId);
}

// ============================================================
// Channel Settings Types
// ============================================================

/** Base channel-specific settings (each channel defines its own) */
export type ChannelSettings = Record<string, unknown>;

/** Settings for iMessage channel */
export interface IMessageChannelSettings {
  enabled: boolean;
  phoneNumber?: string;
}

/** Settings for ntfy channel (V1 Order 3) */
export interface NtfyChannelSettings {
  enabled: boolean;
  /** Server URL, e.g., "https://ntfy.sh" or self-hosted */
  serverUrl?: string;
  /** The topic name to publish to */
  topic?: string;
  /** Optional auth token for private servers */
  authToken?: string;
}

/** Settings for Slack channel (V1.2) */
export interface SlackChannelSettings {
  enabled: boolean;
  /** Slack webhook URL */
  webhookUrl?: string;
}

/** Settings for Telegram channel (V1.2) */
export interface TelegramChannelSettings {
  enabled: boolean;
  /** Telegram bot token */
  botToken?: string;
  /** Chat ID to send messages to */
  chatId?: string;
}

/** Settings for Email channel (V2) */
export interface EmailChannelSettings {
  enabled: boolean;
  /** SMTP host */
  smtpHost?: string;
  /** SMTP port */
  smtpPort?: number;
  /** SMTP username */
  smtpUser?: string;
  /** SMTP password */
  smtpPass?: string;
  /** Email recipient */
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

// ============================================================
// Notification Channel Interface
// ============================================================

/**
 * Interface that all notification channels must implement.
 *
 * Each channel is responsible for:
 * - Checking platform availability (e.g., iMessage only on macOS)
 * - Validating configuration
 * - Sending notifications
 * - Managing its own rate limiting
 */
export interface NotificationChannel {
  /** Unique channel identifier */
  readonly id: NotificationChannelId;

  /** Human-readable channel name (for UI) */
  readonly displayName: string;

  /** Channel description for settings UI */
  readonly description: string;

  /**
   * Check if this channel is available on the current platform.
   * For example, iMessage is only available on macOS.
   */
  isAvailable(): boolean | Promise<boolean>;

  /**
   * Check if the channel is properly configured.
   * Returns true if all required settings are present.
   */
  isConfigured(settings: ChannelSettings): boolean;

  /**
   * Send a notification.
   * Implementations should handle rate limiting internally.
   */
  send(payload: NotificationPayload, settings: ChannelSettings): Promise<NotificationResult>;

  /**
   * Send a test notification.
   * Should bypass rate limiting to allow testing.
   */
  sendTest(settings: ChannelSettings, appUrl: string): Promise<NotificationResult>;

  /** Get the current rate limit status for this channel */
  getRateLimitStatus(): RateLimitStatus;

  /** Reset rate limiting (for testing) */
  resetRateLimit(): void;
}

// ============================================================
// Channel Info Types (for UI)
// ============================================================

/** Channel information for settings UI */
export interface ChannelInfo {
  id: NotificationChannelId;
  displayName: string;
  description: string;
  isAvailable: boolean;
  isConfigured: boolean;
}
