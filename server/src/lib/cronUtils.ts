/**
 * Cron Pattern Utilities
 *
 * Converts ScheduledPrompt configurations to cron patterns for node-cron.
 * Also provides utilities for calculating next run times.
 */

import type { ScheduledPrompt } from '../../../shared/types/index.js';

// ============================================================
// Cron Pattern Generation
// ============================================================

/**
 * Convert a ScheduledPrompt to a cron pattern string
 *
 * Cron format: `minute hour dayOfMonth month dayOfWeek`
 *
 * Examples:
 * - Daily at 9:00 AM: `0 9 * * *`
 * - Weekly Monday at 9:00 AM: `0 9 * * 1`
 * - Monthly 1st at 9:00 AM: `0 9 1 * *`
 * - Yearly Jan 1st at 9:00 AM: `0 9 1 1 *`
 *
 * @param prompt - The scheduled prompt configuration
 * @returns Cron pattern string
 */
export function toCronPattern(prompt: ScheduledPrompt): string {
  const [hour, minute] = prompt.timeOfDay.split(':').map(Number);

  switch (prompt.scheduleType) {
    case 'daily':
      // Every day at specified time
      return `${minute} ${hour} * * *`;

    case 'weekly':
      // Specific day of week at specified time
      // dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      return `${minute} ${hour} * * ${prompt.dayOfWeek}`;

    case 'monthly':
      // Specific day of month at specified time
      return `${minute} ${hour} ${prompt.dayOfMonth} * *`;

    case 'yearly':
      // January 1st at specified time (for yearly, we use Jan 1st)
      // If we want to support custom dates, we'd need month in the data model
      return `${minute} ${hour} 1 1 *`;

    default:
      throw new Error(`Unknown schedule type: ${prompt.scheduleType}`);
  }
}

// ============================================================
// Next Run Time Calculation
// ============================================================

/**
 * Calculate the next run time for a scheduled prompt
 *
 * @param prompt - The scheduled prompt configuration
 * @param fromDate - Calculate from this date (defaults to now)
 * @returns ISO timestamp of next run
 */
export function calculateNextRunAt(prompt: ScheduledPrompt, fromDate: Date = new Date()): string {
  const [hour, minute] = prompt.timeOfDay.split(':').map(Number);

  // Start with today at the scheduled time
  const next = new Date(fromDate);
  next.setHours(hour, minute, 0, 0);

  switch (prompt.scheduleType) {
    case 'daily':
      // If time has passed today, move to tomorrow
      if (next <= fromDate) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'weekly': {
      const targetDay = prompt.dayOfWeek!;
      const currentDay = next.getDay();

      // Calculate days until target day
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) {
        daysUntil += 7;
      }

      // If it's the target day but time has passed, move to next week
      if (daysUntil === 0 && next <= fromDate) {
        daysUntil = 7;
      }

      next.setDate(next.getDate() + daysUntil);
      break;
    }

    case 'monthly': {
      const targetDayOfMonth = prompt.dayOfMonth!;
      next.setDate(targetDayOfMonth);

      // If date has passed this month, move to next month
      if (next <= fromDate) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDayOfMonth);
      }
      break;
    }

    case 'yearly':
      // January 1st
      next.setMonth(0); // January
      next.setDate(1);

      // If date has passed this year, move to next year
      if (next <= fromDate) {
        next.setFullYear(next.getFullYear() + 1);
      }
      break;
  }

  return next.toISOString();
}

// ============================================================
// Human-Readable Schedule Description
// ============================================================

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format time for display (e.g., "9:00 AM")
 */
function formatTime(timeOfDay: string): string {
  const [hour, minute] = timeOfDay.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get a human-readable description of a schedule
 *
 * Examples:
 * - "Daily at 9:00 AM"
 * - "Every Monday at 9:00 AM"
 * - "Monthly on the 1st at 9:00 AM"
 * - "Yearly on January 1st at 9:00 AM"
 *
 * @param prompt - The scheduled prompt configuration
 * @returns Human-readable description
 */
export function getScheduleDescription(prompt: ScheduledPrompt): string {
  const time = formatTime(prompt.timeOfDay);

  switch (prompt.scheduleType) {
    case 'daily':
      return `Daily at ${time}`;

    case 'weekly':
      return `Every ${DAYS_OF_WEEK[prompt.dayOfWeek!]} at ${time}`;

    case 'monthly':
      return `Monthly on the ${getOrdinal(prompt.dayOfMonth!)} at ${time}`;

    case 'yearly':
      return `Yearly on January 1st at ${time}`;

    default:
      return `Unknown schedule`;
  }
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate a cron pattern string
 *
 * @param pattern - Cron pattern to validate
 * @returns True if valid, false otherwise
 */
export function isValidCronPattern(pattern: string): boolean {
  // Basic validation: 5 space-separated fields
  const fields = pattern.split(' ');
  if (fields.length !== 5) {
    return false;
  }

  // Each field should be either a number, '*', or a valid range/list
  const fieldPatterns = [
    /^(\*|[0-5]?\d)$/, // minute (0-59)
    /^(\*|[01]?\d|2[0-3])$/, // hour (0-23)
    /^(\*|[1-9]|[12]\d|3[01])$/, // day of month (1-31)
    /^(\*|[1-9]|1[0-2])$/, // month (1-12)
    /^(\*|[0-6])$/, // day of week (0-6)
  ];

  return fields.every((field, index) => fieldPatterns[index].test(field));
}
