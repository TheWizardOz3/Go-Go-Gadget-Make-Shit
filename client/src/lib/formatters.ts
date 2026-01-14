/**
 * Formatting utilities for dates and text
 */

import { formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

/**
 * Format a date as relative time (e.g., "2m ago", "1h ago", "3d ago")
 *
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted relative time string, or empty string if invalid
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime("2024-01-15T10:30:00Z") // "5m ago"
 * formatRelativeTime(Date.now() - 3600000) // "1h ago"
 * ```
 */
export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (date === null || date === undefined) {
    return '';
  }

  // Parse the date
  let parsedDate: Date;

  if (typeof date === 'string') {
    parsedDate = parseISO(date);
  } else if (typeof date === 'number') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }

  // Validate the date
  if (!isValid(parsedDate)) {
    return '';
  }

  // Check if it's within the last minute (show "just now")
  const now = Date.now();
  const diffMs = now - parsedDate.getTime();

  if (diffMs < 60_000) {
    return 'just now';
  }

  // Use date-fns for relative formatting
  const relative = formatDistanceToNowStrict(parsedDate, {
    addSuffix: true,
    roundingMethod: 'floor',
  });

  // Shorten common patterns for mobile-friendly display
  return shortenRelativeTime(relative);
}

/**
 * Shorten relative time strings for compact display
 *
 * @param relative - Relative time string from date-fns
 * @returns Shortened version (e.g., "5 minutes ago" → "5m ago")
 */
function shortenRelativeTime(relative: string): string {
  return relative
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
    .replace(/ weeks?/, 'w')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y');
}

/**
 * Format a date as a short timestamp (e.g., "10:30 AM")
 *
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted time string, or empty string if invalid
 */
export function formatTime(date: Date | string | number | null | undefined): string {
  if (date === null || date === undefined) {
    return '';
  }

  let parsedDate: Date;

  if (typeof date === 'string') {
    parsedDate = parseISO(date);
  } else if (typeof date === 'number') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }

  if (!isValid(parsedDate)) {
    return '';
  }

  return parsedDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default 500)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last space before maxLength to avoid cutting words
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength - 50) {
    return truncated.slice(0, lastSpace) + '…';
  }

  return truncated + '…';
}
