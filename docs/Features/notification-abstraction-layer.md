# Feature: Notification Abstraction Layer

> **Status**: Pending  
> **Started**: —  
> **Completed**: —  
> **Milestone**: V1  
> **Feature Doc Version**: 1.0

---

## Overview

The Notification Abstraction Layer extracts the current iMessage-specific notification logic into a pluggable channel architecture. This creates a common interface that all notification channels implement, enabling future channels (ntfy, Slack, Telegram) to be added with minimal effort.

**Design Philosophy**: The abstraction should feel invisible to the existing iMessage functionality—users won't notice any change except new options in settings. Each channel is independent and can be enabled/disabled separately.

## User Story

> As a developer who uses GoGoGadgetClaude, I want to receive task completion notifications through different channels (iMessage now, ntfy/Slack/Telegram later), so I can choose the notification method that works best for my setup.

## Problem Statement

The current `notificationService.ts` is tightly coupled to iMessage/AppleScript:
- Hard-coded AppleScript execution for macOS Messages.app
- Settings are iMessage-specific (`notificationPhoneNumber`)
- No way to add alternative notification channels without duplicating code
- Rate limiting is global, not per-channel

This blocks the addition of ntfy notifications (V1 Order 3) and future channels (Slack, Telegram, Email).

## Business Value

- **User Impact:** Users can choose notification channels that work for their setup (e.g., ntfy for non-macOS or cross-platform needs)
- **Business Impact:** Foundation for V1 ntfy feature and V1.2 Slack/Telegram features
- **Technical Impact:** Clean separation of concerns; easier to test and maintain; enables parallel development of channels

---

## Requirements

### Functional Requirements

| ID   | Requirement                                                  | Priority | Notes                           |
|------|--------------------------------------------------------------|----------|---------------------------------|
| FR-1 | Create `NotificationChannel` interface for all channels      | MUST     | Common contract                 |
| FR-2 | Create `IMessageChannel` implementing the interface          | MUST     | Extract from existing code      |
| FR-3 | Create `NotificationManager` to orchestrate channels         | MUST     | Replaces current service        |
| FR-4 | Support multiple enabled channels simultaneously             | MUST     | User may want iMessage + Slack  |
| FR-5 | Per-channel rate limiting                                    | SHOULD   | Each channel has own rate limit |
| FR-6 | Channel-specific settings structure                          | MUST     | Each channel has own config     |
| FR-7 | Migrate existing settings to new structure                   | MUST     | Backward compatible             |
| FR-8 | Settings UI shows available channels with per-channel config | MUST     | Enable/configure each channel   |

### Non-Functional Requirements

| Requirement            | Target                                     | Measurement    |
|------------------------|--------------------------------------------|----------------|
| Backward Compatibility | 100% - existing iMessage works unchanged   | Manual testing |
| Performance            | No regression (< 10s notification latency) | Manual testing |
| Extensibility          | New channel addable in < 2 hours           | Code review    |

### Acceptance Criteria

- [x] **Given** I have existing iMessage notifications configured, **when** I upgrade to this version, **then** my notifications continue working without reconfiguration
- [x] **Given** notifications are enabled, **when** Claude completes a task, **then** all enabled channels receive the notification
- [x] **Given** one channel fails, **when** Claude completes a task, **then** other enabled channels still receive notifications
- [x] **Given** I open settings, **when** viewing notifications section, **then** I see each available channel with its own enable/config options

### Out of Scope

- ntfy channel implementation (V1 Order 3)
- Slack channel implementation (V1.2)
- Telegram channel implementation (V1.2)
- Email channel implementation (V2)
- Per-project notification settings
- Notification message customization

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  server/src/services/notifications/                                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  NotificationManager                                                  │  │
│  │  - Loads enabled channels from settings                               │  │
│  │  - Broadcasts to all enabled channels                                 │  │
│  │  - Handles errors gracefully (one failure doesn't block others)       │  │
│  └───────────────────┬───────────────────────────────────────────────────┘  │
│                      │                                                      │
│         ┌───────────────────────────────────────────┐                       │
│         │                    │                      │                       │
│         ▼                    ▼                      ▼                       │
│  ┌─────────────┐     ┌─────────────┐       ┌─────────────┐                  │
│  │ IMessage    │     │ Ntfy        │       │ Slack       │                  │
│  │ Channel     │     │ Channel     │       │ Channel     │                  │
│  │ (V1)        │     │ (V1 Order 3)│       │ (V1.2)      │                  │
│  └─────────────┘     └─────────────┘       └─────────────┘                  │
│                                                                             │
│  All implement: NotificationChannel interface                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NotificationChannel Interface

```typescript
// server/src/services/notifications/types.ts

/** Base notification payload */
export interface NotificationPayload {
  /** Type of notification */
  type: 'task-complete' | 'test';
  /** Project name (for task-complete) */
  projectName?: string;
  /** Custom message (for test) */
  message?: string;
  /** App URL to include in notification */
  appUrl: string;
}

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

/** Channel identifier (used in settings) */
export type NotificationChannelId = 'imessage' | 'ntfy' | 'slack' | 'telegram' | 'email';

/** Interface all notification channels must implement */
export interface NotificationChannel {
  /** Unique channel identifier */
  readonly id: NotificationChannelId;
  
  /** Human-readable channel name */
  readonly displayName: string;
  
  /** Channel description for settings UI */
  readonly description: string;
  
  /** Whether this channel is available on the current platform */
  isAvailable(): boolean | Promise<boolean>;
  
  /** Check if the channel is properly configured */
  isConfigured(settings: ChannelSettings): boolean;
  
  /** Send a notification */
  send(payload: NotificationPayload, settings: ChannelSettings): Promise<NotificationResult>;
  
  /** Send a test notification (bypasses rate limiting) */
  sendTest(settings: ChannelSettings, appUrl: string): Promise<NotificationResult>;
  
  /** Get the current rate limit status for this channel */
  getRateLimitStatus(): RateLimitStatus;
  
  /** Reset rate limiting (for testing) */
  resetRateLimit(): void;
}

/** Rate limit status */
export interface RateLimitStatus {
  isLimited: boolean;
  lastNotificationTime: number | null;
  secondsUntilReset: number | null;
}

/** Channel-specific settings (each channel defines its own) */
export type ChannelSettings = Record<string, unknown>;
```

### Updated Settings Structure

```typescript
// Evolve AppSettings to support multiple channels

/** Settings for iMessage channel */
export interface IMessageChannelSettings {
  enabled: boolean;
  phoneNumber?: string;
}

/** Settings for ntfy channel (V1 Order 3) */
export interface NtfyChannelSettings {
  enabled: boolean;
  serverUrl?: string;  // e.g., "https://ntfy.sh" or self-hosted
  topic?: string;      // The topic name to publish to
  authToken?: string;  // Optional auth token for private servers
}

/** All notification channel settings */
export interface NotificationChannelSettings {
  imessage: IMessageChannelSettings;
  ntfy?: NtfyChannelSettings;      // Added in V1 Order 3
  slack?: SlackChannelSettings;     // Added in V1.2
  telegram?: TelegramChannelSettings; // Added in V1.2
  email?: EmailChannelSettings;     // Added in V2
}

/** Updated AppSettings (backward compatible) */
export interface AppSettings {
  // === LEGACY (deprecated, migrated to channels) ===
  notificationsEnabled?: boolean;        // DEPRECATED: Use channels.imessage.enabled
  notificationPhoneNumber?: string;      // DEPRECATED: Use channels.imessage.phoneNumber
  
  // === NEW ===
  /** Notification channel configurations */
  channels?: NotificationChannelSettings;
  
  // === UNCHANGED ===
  serverHostname?: string;
  defaultTemplates: Template[];
  theme: ThemePreference;
  allowEdits?: boolean;
  lastActiveProjectPath?: string;
}
```

### Settings Migration Strategy

On first read after upgrade, migrate old settings to new structure:

```typescript
// In settingsService.ts - migrateSettings()

function migrateSettings(settings: AppSettings): AppSettings {
  // Already migrated?
  if (settings.channels) {
    return settings;
  }
  
  // Migrate legacy iMessage settings
  const migrated: AppSettings = {
    ...settings,
    channels: {
      imessage: {
        enabled: settings.notificationsEnabled ?? false,
        phoneNumber: settings.notificationPhoneNumber,
      },
    },
  };
  
  // Clear deprecated fields
  delete migrated.notificationsEnabled;
  delete migrated.notificationPhoneNumber;
  
  return migrated;
}
```

### New Files to Create

| File                                                            | Purpose                         | Est. Lines |
|-----------------------------------------------------------------|---------------------------------|------------|
| `server/src/services/notifications/types.ts`                    | Shared types and interfaces     | ~80        |
| `server/src/services/notifications/NotificationManager.ts`      | Orchestrates all channels       | ~150       |
| `server/src/services/notifications/channels/BaseChannel.ts`     | Abstract base with common logic | ~100       |
| `server/src/services/notifications/channels/IMessageChannel.ts` | iMessage implementation         | ~120       |
| `server/src/services/notifications/index.ts`                    | Barrel exports                  | ~15        |

### Files to Modify

| File                                               | Changes                            | Est. Impact |
|----------------------------------------------------|------------------------------------|-------------|
| `server/src/services/settingsService.ts`           | Add migration logic, update schema | ~50 lines   |
| `server/src/services/notificationService.ts`       | Re-export from new module (facade) | ~10 lines   |
| `server/src/api/hooks.ts`                          | Use NotificationManager            | ~5 lines    |
| `shared/types/index.ts`                            | Add channel settings types         | ~40 lines   |
| `client/src/components/settings/SettingsModal.tsx` | Channel-based UI                   | ~80 lines   |

### IMessageChannel Implementation

```typescript
// server/src/services/notifications/channels/IMessageChannel.ts

import { BaseChannel } from './BaseChannel';
import type { 
  NotificationChannel, 
  NotificationPayload, 
  NotificationResult,
  ChannelSettings 
} from '../types';
import { execa } from 'execa';

interface IMessageSettings extends ChannelSettings {
  enabled: boolean;
  phoneNumber?: string;
}

export class IMessageChannel extends BaseChannel implements NotificationChannel {
  readonly id = 'imessage' as const;
  readonly displayName = 'iMessage';
  readonly description = 'Send notifications via iMessage (macOS only)';

  async isAvailable(): Promise<boolean> {
    // Only available on macOS
    return process.platform === 'darwin';
  }

  isConfigured(settings: IMessageSettings): boolean {
    return settings.enabled && !!settings.phoneNumber;
  }

  async send(payload: NotificationPayload, settings: IMessageSettings): Promise<NotificationResult> {
    if (!settings.enabled) {
      return { success: false, skipped: true, skipReason: 'Channel disabled' };
    }

    if (!settings.phoneNumber) {
      return { success: false, error: 'Phone number not configured' };
    }

    if (this.isRateLimited()) {
      return { 
        success: false, 
        skipped: true, 
        skipReason: `Rate limited (${this.getSecondsUntilReset()}s remaining)` 
      };
    }

    const message = this.formatMessage(payload);
    
    try {
      await this.executeAppleScript(settings.phoneNumber, message);
      this.recordNotification();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }

  async sendTest(settings: IMessageSettings, appUrl: string): Promise<NotificationResult> {
    if (!settings.phoneNumber) {
      return { success: false, error: 'Phone number not configured' };
    }

    const message = `🤖 GoGoGadgetClaude: Test notification!\nYour notifications are set up correctly.\n${appUrl}`;
    
    try {
      await this.executeAppleScript(settings.phoneNumber, message);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }

  private formatMessage(payload: NotificationPayload): string {
    if (payload.type === 'task-complete') {
      return `🤖 GoGoGadgetClaude: Task complete in ${payload.projectName}.\n${payload.appUrl}`;
    }
    return payload.message ?? 'GoGoGadgetClaude notification';
  }

  private async executeAppleScript(phoneNumber: string, message: string): Promise<void> {
    const escapedMessage = message
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');

    const script = `
      tell application "Messages"
        set targetService to 1st account whose service type = iMessage
        set targetBuddy to participant "${phoneNumber}" of targetService
        send "${escapedMessage}" to targetBuddy
      end tell
    `;

    await execa('osascript', ['-e', script], {
      timeout: 10000,
      reject: true,
    });
  }
}
```

### NotificationManager Implementation

```typescript
// server/src/services/notifications/NotificationManager.ts

import { logger } from '../../lib/logger';
import { getSettings } from '../settingsService';
import { config } from '../../lib/config';
import type { 
  NotificationChannel, 
  NotificationPayload, 
  NotificationResult,
  NotificationChannelId 
} from './types';
import { IMessageChannel } from './channels/IMessageChannel';

export class NotificationManager {
  private channels: Map<NotificationChannelId, NotificationChannel> = new Map();
  private static instance: NotificationManager;

  private constructor() {
    // Register available channels
    this.registerChannel(new IMessageChannel());
    // Future: this.registerChannel(new NtfyChannel());
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    logger.debug(`Registered notification channel: ${channel.id}`);
  }

  /** Get all registered channels */
  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  /** Get available channels for the current platform */
  async getAvailableChannels(): Promise<NotificationChannel[]> {
    const available: NotificationChannel[] = [];
    for (const channel of this.channels.values()) {
      if (await channel.isAvailable()) {
        available.push(channel);
      }
    }
    return available;
  }

  /** Send notification to all enabled and configured channels */
  async sendTaskComplete(projectName: string): Promise<Map<NotificationChannelId, NotificationResult>> {
    const results = new Map<NotificationChannelId, NotificationResult>();
    const settings = await getSettings();
    
    if (!settings.channels) {
      logger.debug('No notification channels configured');
      return results;
    }

    const appUrl = this.getAppUrl(settings.serverHostname);
    const payload: NotificationPayload = {
      type: 'task-complete',
      projectName,
      appUrl,
    };

    for (const channel of this.channels.values()) {
      const channelSettings = settings.channels[channel.id];
      
      if (!channelSettings) {
        results.set(channel.id, { success: false, skipped: true, skipReason: 'Not configured' });
        continue;
      }

      if (!await channel.isAvailable()) {
        results.set(channel.id, { success: false, skipped: true, skipReason: 'Not available on this platform' });
        continue;
      }

      try {
        const result = await channel.send(payload, channelSettings);
        results.set(channel.id, result);
        
        if (result.success) {
          logger.info(`Notification sent via ${channel.id}`, { projectName });
        } else if (result.skipped) {
          logger.debug(`Notification skipped for ${channel.id}`, { reason: result.skipReason });
        } else {
          logger.warn(`Notification failed for ${channel.id}`, { error: result.error });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        results.set(channel.id, { success: false, error });
        logger.error(`Notification error for ${channel.id}`, { error });
      }
    }

    return results;
  }

  /** Send test notification to a specific channel */
  async sendTest(
    channelId: NotificationChannelId, 
    settings: unknown
  ): Promise<NotificationResult> {
    const channel = this.channels.get(channelId);
    
    if (!channel) {
      return { success: false, error: `Unknown channel: ${channelId}` };
    }

    if (!await channel.isAvailable()) {
      return { success: false, error: 'Channel not available on this platform' };
    }

    const appSettings = await getSettings();
    const appUrl = this.getAppUrl(appSettings.serverHostname);
    
    return channel.sendTest(settings as Record<string, unknown>, appUrl);
  }

  private getAppUrl(serverHostname?: string): string {
    const hostnameOrUrl = serverHostname || config.tailscaleHostname;
    const port = config.port;

    if (hostnameOrUrl.startsWith('http://') || hostnameOrUrl.startsWith('https://')) {
      if (hostnameOrUrl.includes(':' + port) || hostnameOrUrl.match(/:\d+$/)) {
        return hostnameOrUrl;
      }
      return `${hostnameOrUrl}:${port}`;
    }

    const protocol = config.httpsEnabled ? 'https' : 'http';
    return `${protocol}://${hostnameOrUrl}:${port}`;
  }
}

// Convenience exports for backward compatibility
export const notificationManager = NotificationManager.getInstance();

export async function sendTaskCompleteNotification(projectName: string): Promise<boolean> {
  const results = await notificationManager.sendTaskComplete(projectName);
  // Return true if at least one channel succeeded
  return Array.from(results.values()).some(r => r.success);
}
```

### Updated Settings UI

The settings UI will evolve from:

```
┌──────────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS                                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Enable Notifications                              [toggle] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Phone Number                          [+1 555-123-4567]    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  [ Send Test Notification ]                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

To:

```
┌──────────────────────────────────────────────────────────────────┐
│  NOTIFICATION CHANNELS                                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  iMessage                                          [toggle] │ │
│  │  Send via macOS Messages.app                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │  Phone Number                      [+1 555-123-4567]    ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │  [ Test ]                                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ntfy                                              [toggle] │ │
│  │  Push notifications via ntfy.sh                             │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │  Server URL                     [https://ntfy.sh]       ││ │
│  │  │  Topic                          [my-claude-alerts]      ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │  [ Test ]                                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  (More channels coming soon: Slack, Telegram, Email)             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

| # | Task                                        | Est. Time | Dependencies | Status | Notes                                     |
|---|---------------------------------------------|-----------|--------------|--------|-------------------------------------------|
| 1 | Create notification types and interfaces    | 30 min    | —            | ✅ Done | `types.ts` with all interfaces            |
| 2 | Create `BaseChannel` abstract class         | 30 min    | Task 1       | ✅ Done | Rate limiting, common utilities           |
| 3 | Create `IMessageChannel` class              | 45 min    | Task 2       | ✅ Done | Extract from existing notificationService |
| 4 | Create `NotificationManager`                | 45 min    | Task 3       | ✅ Done | Channel orchestration, error handling     |
| 5 | Update settings schema and migration        | 40 min    | Task 1       | ✅ Done | Backward-compatible migration             |
| 6 | Update hooks API to use NotificationManager | 20 min    | Task 4       | ✅ Done | Replace direct notificationService calls  |
| 7 | Update SettingsModal for channel-based UI   | 60 min    | Task 5       | ✅ Done | Per-channel enable/config sections        |

**Total Estimated Time**: ~4.5 hours  
**Status**: ✅ All tasks complete!

---

## Test Plan

### Unit Tests — ✅ All Implemented

**BaseChannel.test.ts** (16 tests) ✅:
- Rate limiting tracks time correctly
- Rate limiting resets after window (60s)
- Rate limiting can be manually reset
- getSecondsUntilReset returns correct value
- isRateLimited returns false initially
- isRateLimited returns true within window
- recordNotification updates timestamp
- Multiple channels have independent rate limits
- getRateLimitStatus returns correct status
- send behavior respects disabled/enabled state
- sendTest bypasses rate limiting

**IMessageChannel.test.ts** (18 tests) ✅:
- Channel identity (id, displayName, description)
- isAvailable returns true on macOS (darwin)
- isAvailable returns false on Linux/Windows
- isConfigured returns true when enabled + phoneNumber
- isConfigured returns false when disabled
- isConfigured returns false when no phoneNumber
- send returns skipped when disabled
- send returns error when no phoneNumber
- send returns skipped when rate limited
- send notification successfully
- sendTest bypasses rate limiting
- sendTest returns error when no phone configured
- formatMessage formats task-complete correctly
- formatMessage includes app URL

**NotificationManager.test.ts** (17 tests) ✅:
- getInstance returns singleton
- resetInstance creates new singleton
- getChannels returns all registered channels
- getChannel returns channel by id
- getAvailableChannels filters by platform
- getChannelInfo returns info for all channels
- sendTaskComplete sends to all enabled channels
- sendTaskComplete skips disabled channels
- sendTaskComplete skips unconfigured channels
- sendTaskComplete continues after one channel fails
- sendTaskComplete returns results map
- sendTest sends to specific channel
- sendTest returns error for unknown channel
- App URL uses serverHostname from settings
- App URL falls back to config hostname
- Error handling for settings fetch failure

### Integration Tests

- Settings migration preserves existing values
- API endpoint `/api/hooks/task-complete` uses NotificationManager
- API endpoint `/api/notifications/test` routes to correct channel
- Settings update correctly saves channel config

### Manual Testing Checklist

- [ ] Existing iMessage notifications work unchanged
- [ ] Settings migration happens on first load
- [ ] Settings UI shows iMessage channel with config
- [ ] iMessage toggle enables/disables correctly
- [ ] Phone number saves and persists
- [ ] Test notification works via iMessage
- [ ] Rate limiting works per-channel
- [ ] App doesn't crash if Messages.app not running

---

## Migration Notes

### Breaking Changes

None. This is a fully backward-compatible change:

1. Existing `notificationsEnabled` and `notificationPhoneNumber` are migrated automatically
2. Legacy API calls continue to work
3. `notificationService.ts` exports remain unchanged

### Migration Path

1. On first `getSettings()` call after upgrade, settings are migrated
2. Migrated settings are written back to file
3. Legacy fields are removed from settings.json
4. UI shows new channel-based interface

---

## Dependencies

| Dependency                   | Type      | Status     | Notes                        |
|------------------------------|-----------|------------|------------------------------|
| Existing notificationService | Code      | ✅ Complete | Logic extracted, not deleted |
| settingsService              | Code      | ✅ Complete | Extended with migration      |
| SettingsModal                | Component | ✅ Complete | Modified for channels        |

---

## Related Documents

- [iMessage Notifications (MVP)](./imessage-notifications.md) - Original implementation being abstracted
- [Architecture - External Integrations](../architecture.md#6-external-integrations)
- [Product Spec - Notifications](../product_spec.md#feature-imessage-notifications)
- [Project Status - V1 Build Order](../project_status.md#v1-build-order)

---

*Created: 2026-01-17*

