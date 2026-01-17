# Feature: ntfy Notifications

> **Status**: In Progress  
> **Started**: 2026-01-17  
> **Completed**: —  
> **Milestone**: V1 (Order 3)  
> **Feature Doc Version**: 1.0

---

## Overview

### One-Line Summary

Push notifications via ntfy.sh (or self-hosted ntfy servers) that work across all devices without requiring macOS or carrier-based SMS.

### User Story

> As a developer using GoGoGadgetClaude, I want to receive push notifications via ntfy when Claude finishes a task, so I can get notified on any device (phone, tablet, desktop) without depending on iMessage or SMS.

### Problem Statement

The current iMessage notification channel has limitations:
- **macOS-only:** Requires Messages.app on the server machine
- **Carrier dependency:** iMessage requires an Apple device or phone number
- **Not cross-platform:** Android users or those without iMessage can't receive notifications
- **Single device:** Notifications only go to the configured phone number

ntfy provides a solution:
- **Cross-platform:** Works on iOS, Android, web, and desktop
- **Self-hostable:** Can run on your own server for privacy
- **Multiple devices:** Subscribe to the same topic from any device
- **No carrier needed:** Pure HTTP-based push notifications

### Business Value

- **User Impact:** Users can receive notifications on any device, including Android phones, tablets, or desktop browsers
- **Business Impact:** Expands user base beyond Apple ecosystem; enables notifications for users who can't use iMessage
- **Technical Impact:** First use of the notification abstraction layer for a non-iMessage channel; validates the architecture

---

## Requirements

### Functional Requirements

| ID   | Requirement                                                      | Priority | Notes                                |
|------|------------------------------------------------------------------|----------|--------------------------------------|
| FR-1 | Create `NtfyChannel` class implementing `NotificationChannel`    | MUST     | Follow IMessageChannel pattern       |
| FR-2 | Support ntfy.sh public server                                    | MUST     | Default server URL                   |
| FR-3 | Support self-hosted ntfy servers                                 | MUST     | Configurable server URL              |
| FR-4 | Support authenticated topics (auth token)                        | SHOULD   | For private servers/topics           |
| FR-5 | Format notifications with emoji and app URL                      | MUST     | Consistent with iMessage format      |
| FR-6 | Settings UI for ntfy channel configuration                       | MUST     | Server URL, topic, auth token fields |
| FR-7 | Test notification button in settings                             | MUST     | Verify setup before enabling         |
| FR-8 | ntfy channel available on all platforms                          | MUST     | Not platform-specific like iMessage  |

### Non-Functional Requirements

| Requirement   | Target                                        | Measurement       |
|---------------|-----------------------------------------------|-------------------|
| Performance   | Notification sent < 2s after task completion  | Manual testing    |
| Reliability   | 99% success rate when server is reachable     | Error rate logs   |
| Timeout       | HTTP request times out after 10 seconds       | Code review       |
| Cross-platform| Works on macOS, Linux, Windows servers        | Manual testing    |

### Acceptance Criteria

- [ ] **Given** ntfy is enabled with server URL and topic, **when** Claude completes a task, **then** a push notification appears on subscribed devices
- [ ] **Given** ntfy uses a private topic with auth token, **when** sending a notification, **then** the auth token is included in the request header
- [ ] **Given** the ntfy server is unreachable, **when** sending a notification, **then** an error is logged and other channels continue to work
- [ ] **Given** I open settings, **when** viewing the ntfy section, **then** I see fields for server URL, topic, and optional auth token
- [ ] **Given** I configure ntfy and tap "Test", **when** the request succeeds, **then** a test notification appears on my subscribed devices

### Out of Scope

- ntfy topic management/creation (users set up topics manually)
- Message priority configuration
- Click actions/URLs in notifications (uses default behavior)
- Notification icons/images
- Scheduled/delayed notifications
- Multiple topics per configuration

---

## Technical Design

### Architecture Fit

**Affected Areas:**

| Area             | Impact | Description                                      |
|------------------|--------|--------------------------------------------------|
| Frontend         | MODIFY | Add ntfy section to SettingsModal                |
| Backend          | NEW    | Create NtfyChannel class                         |
| Backend          | MODIFY | Register NtfyChannel in NotificationManager      |
| Database         | NONE   | Uses existing settings structure                 |
| External Services| NEW    | HTTP POST to ntfy.sh or self-hosted server       |

**Alignment with Existing Patterns:**

- Follows the `NotificationChannel` interface defined in the Notification Abstraction Layer
- Extends `BaseChannel` for rate limiting and common result methods
- Uses the same settings structure (`NtfyChannelSettings`) already defined
- Mirrors `IMessageChannel` implementation structure

### ntfy API Integration

**ntfy Publishing API:**

```http
POST https://ntfy.sh/{topic}
Content-Type: text/plain
Authorization: Bearer {token}  # Optional, for authenticated topics

🤖 GoGoGadgetClaude: Task complete in my-project.
https://my-macbook.tailnet.ts.net:3456
```

**Key Points:**
- Simple HTTP POST to `{serverUrl}/{topic}`
- Body is the message text (plain text)
- Optional `Authorization` header for private topics
- Response: 200 OK with JSON payload on success

**Reference:** [ntfy Publishing Documentation](https://docs.ntfy.sh/publish/)

### NtfyChannel Implementation

```typescript
// server/src/services/notifications/channels/NtfyChannel.ts

import { BaseChannel } from './BaseChannel.js';
import type {
  NotificationPayload,
  NotificationResult,
  ChannelSettings,
  NtfyChannelSettings,
} from '../types.js';
import { logger } from '../../../lib/logger.js';

/**
 * Helper to safely access ntfy settings
 */
function asNtfySettings(settings: ChannelSettings): NtfyChannelSettings | null {
  if (
    typeof settings === 'object' &&
    settings !== null &&
    'enabled' in settings &&
    typeof settings.enabled === 'boolean'
  ) {
    return settings as unknown as NtfyChannelSettings;
  }
  return null;
}

/**
 * ntfy notification channel.
 *
 * Sends push notifications via ntfy.sh or self-hosted ntfy servers.
 * Available on all platforms (pure HTTP-based).
 */
export class NtfyChannel extends BaseChannel {
  readonly id = 'ntfy' as const;
  readonly displayName = 'ntfy';
  readonly description = 'Push notifications via ntfy.sh';

  /**
   * ntfy is available on all platforms (HTTP-based).
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Check if properly configured.
   * Requires enabled=true, serverUrl, and topic.
   */
  isConfigured(settings: ChannelSettings): boolean {
    const ntfySettings = asNtfySettings(settings);
    if (!ntfySettings) return false;
    return (
      ntfySettings.enabled === true &&
      typeof ntfySettings.serverUrl === 'string' &&
      ntfySettings.serverUrl.length > 0 &&
      typeof ntfySettings.topic === 'string' &&
      ntfySettings.topic.length > 0
    );
  }

  async send(
    payload: NotificationPayload,
    settings: ChannelSettings
  ): Promise<NotificationResult> {
    const ntfySettings = asNtfySettings(settings);
    if (!ntfySettings) {
      return { success: false, error: 'Invalid ntfy settings' };
    }

    if (!ntfySettings.enabled) {
      return this.createDisabledResult();
    }

    if (!ntfySettings.serverUrl || !ntfySettings.topic) {
      return { success: false, error: 'Server URL and topic are required' };
    }

    if (this.isRateLimited()) {
      return this.createRateLimitedResult();
    }

    const message = this.formatMessage(payload);

    try {
      await this.publishToNtfy(ntfySettings, message);
      this.recordNotification();
      return this.createSuccessResult();
    } catch (err) {
      return this.createErrorResult(err);
    }
  }

  async sendTest(
    settings: ChannelSettings,
    appUrl: string
  ): Promise<NotificationResult> {
    const ntfySettings = asNtfySettings(settings);
    if (!ntfySettings) {
      return { success: false, error: 'Invalid ntfy settings' };
    }

    if (!ntfySettings.serverUrl || !ntfySettings.topic) {
      return { success: false, error: 'Server URL and topic are required' };
    }

    const message = this.formatTestMessage(appUrl);

    try {
      await this.publishToNtfy(ntfySettings, message);
      return this.createSuccessResult();
    } catch (err) {
      return this.createErrorResult(err);
    }
  }

  private formatMessage(payload: NotificationPayload): string {
    switch (payload.type) {
      case 'task-complete':
        return `🤖 GoGoGadgetClaude: Task complete in ${payload.projectName}.\n${payload.appUrl}`;
      case 'test':
        return payload.message ?? `🤖 GoGoGadgetClaude notification\n${payload.appUrl}`;
      default:
        return `🤖 GoGoGadgetClaude notification\n${payload.appUrl}`;
    }
  }

  private formatTestMessage(appUrl: string): string {
    return `🤖 GoGoGadgetClaude: Test notification!\nYour ntfy setup is working correctly.\n${appUrl}`;
  }

  private async publishToNtfy(
    settings: NtfyChannelSettings,
    message: string
  ): Promise<void> {
    const url = this.buildPublishUrl(settings.serverUrl!, settings.topic!);
    
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };

    if (settings.authToken) {
      headers['Authorization'] = `Bearer ${settings.authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: message,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ntfy API error (${response.status}): ${errorText}`);
    }
  }

  private buildPublishUrl(serverUrl: string, topic: string): string {
    // Ensure server URL doesn't have trailing slash
    const baseUrl = serverUrl.replace(/\/+$/, '');
    // Ensure topic doesn't have leading slash
    const cleanTopic = topic.replace(/^\/+/, '');
    return `${baseUrl}/${cleanTopic}`;
  }
}
```

### Settings UI Design

The ntfy section in SettingsModal will look like:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ntfy                                                      [toggle] │
│  Push notifications via ntfy.sh                                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Server URL                         [https://ntfy.sh     ]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Topic                              [my-claude-alerts    ]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Auth Token (optional)              [••••••••••••••••    ]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      [ Test ntfy ]                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Subscribe to this topic in the ntfy app to receive notifications.  │
│  https://ntfy.sh/docs/subscribe/                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

| # | Task                                               | Est. Time | Dependencies | Status  | Notes                                         |
|---|----------------------------------------------------|-----------|--------------|---------|-----------------------------------------------|
| 1 | Create `NtfyChannel` class                         | 45 min    | —            | ✅ Done | Implement NotificationChannel interface       |
| 2 | Register NtfyChannel in NotificationManager        | 15 min    | Task 1       | ✅ Done | Import and add to channel registry            |
| 3 | Update SettingsModal with ntfy configuration UI    | 45 min    | Task 2       | Pending | Server URL, topic, auth token, test button    |

**Total Estimated Time**: ~1.75 hours

---

## Test Plan

### Unit Tests

**NtfyChannel.test.ts** (~12 tests):
- `isAvailable()` returns true on all platforms
- `isConfigured()` returns true when enabled + serverUrl + topic
- `isConfigured()` returns false when disabled
- `isConfigured()` returns false when serverUrl missing
- `isConfigured()` returns false when topic missing
- `send()` returns skipped when disabled
- `send()` returns error when serverUrl missing
- `send()` returns error when topic missing
- `send()` returns skipped when rate limited
- `send()` includes auth header when authToken provided
- `sendTest()` bypasses rate limiting
- `buildPublishUrl()` correctly combines serverUrl and topic

### Integration Tests

- NotificationManager broadcasts to ntfy when enabled
- API test endpoint `/api/notifications/test` works for ntfy channel
- Settings save and load ntfy configuration correctly

### Manual Testing Checklist

- [ ] Create topic on ntfy.sh
- [ ] Subscribe to topic in ntfy app (iOS/Android)
- [ ] Configure ntfy in GoGoGadgetClaude settings
- [ ] Test notification arrives on subscribed device
- [ ] Test with self-hosted ntfy server (if available)
- [ ] Test with auth token for private topic
- [ ] Verify rate limiting works (max 1 per minute)
- [ ] Verify error handling when server unreachable
- [ ] Verify iMessage still works when ntfy also enabled

---

## Dependencies

| Dependency                 | Type | Status     | Notes                                |
|----------------------------|------|------------|--------------------------------------|
| Notification Abstraction   | Code | ✅ Complete | NotificationManager, BaseChannel     |
| NtfyChannelSettings type   | Type | ✅ Complete | Already defined in shared/types      |
| Settings infrastructure    | Code | ✅ Complete | Channel-based settings structure     |

---

## Related Documents

- [Notification Abstraction Layer](./notification-abstraction-layer.md) - Foundation for this feature
- [iMessage Notifications](./imessage-notifications.md) - Reference implementation
- [Architecture - External Integrations](../architecture.md#6-external-integrations)
- [Product Spec - Notifications](../product_spec.md#feature-imessage-notifications)
- [Project Status - V1 Build Order](../project_status.md#v1-build-order)

---

## External References

- [ntfy Documentation](https://docs.ntfy.sh/)
- [ntfy Publishing API](https://docs.ntfy.sh/publish/)
- [ntfy Subscribe Documentation](https://docs.ntfy.sh/subscribe/)
- [ntfy Authentication](https://docs.ntfy.sh/publish/#authentication)

---

*Created: 2026-01-17*

