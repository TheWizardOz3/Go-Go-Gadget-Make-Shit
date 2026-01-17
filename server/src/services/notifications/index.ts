/**
 * Notification System
 *
 * Barrel exports for the notification abstraction layer.
 */

// Types
export * from './types.js';

// Channels
export { BaseChannel } from './channels/BaseChannel.js';
export { IMessageChannel } from './channels/IMessageChannel.js';

// Manager
export {
  NotificationManager,
  notificationManager,
  sendTaskCompleteNotification,
  type NotificationResults,
} from './NotificationManager.js';
