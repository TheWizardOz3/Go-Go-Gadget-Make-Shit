/**
 * Tests for formatting utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatTime, truncateText } from './formatters';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Mock Date.now() to a fixed time for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-14T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(formatRelativeTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('');
  });

  it('returns empty string for invalid date string', () => {
    expect(formatRelativeTime('not-a-date')).toBe('');
  });

  it('returns empty string for invalid number', () => {
    expect(formatRelativeTime(NaN)).toBe('');
  });

  it('returns "just now" for dates within the last minute', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');

    const thirtySecondsAgo = new Date(Date.now() - 30_000);
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
  });

  it('formats minutes correctly', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1m ago');
  });

  it('formats hours correctly', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');

    const oneHourAgo = new Date(Date.now() - 60 * 60_000);
    expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
  });

  it('formats days correctly', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('accepts ISO string input', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('accepts timestamp number input', () => {
    const fiveMinutesAgo = Date.now() - 5 * 60_000;
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('accepts Date object input', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });
});

describe('formatTime', () => {
  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTime(undefined)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatTime('not-a-date')).toBe('');
  });

  it('formats time correctly from Date object', () => {
    const date = new Date('2026-01-14T10:30:00');
    const result = formatTime(date);
    // Result will vary by locale, but should contain hour and minutes
    expect(result).toMatch(/10:30/);
  });

  it('formats time correctly from ISO string', () => {
    const result = formatTime('2026-01-14T14:45:00');
    expect(result).toMatch(/[12]?[0-9]:[0-9]{2}/);
  });

  it('formats time correctly from timestamp', () => {
    const timestamp = new Date('2026-01-14T09:15:00').getTime();
    const result = formatTime(timestamp);
    expect(result).toMatch(/9:15/);
  });
});

describe('truncateText', () => {
  it('returns original text if shorter than maxLength', () => {
    const text = 'Hello, world!';
    expect(truncateText(text, 50)).toBe(text);
  });

  it('returns original text if equal to maxLength', () => {
    const text = 'Hello';
    expect(truncateText(text, 5)).toBe(text);
  });

  it('truncates at word boundary when possible', () => {
    const text = 'Hello world this is a test';
    const result = truncateText(text, 15);
    expect(result).toBe('Hello world…');
    expect(result.length).toBeLessThanOrEqual(16); // maxLength + ellipsis
  });

  it('uses default maxLength of 500', () => {
    const shortText = 'Short text';
    expect(truncateText(shortText)).toBe(shortText);
  });

  it('handles text with no spaces', () => {
    const text = 'ThisIsAVeryLongWordWithNoSpaces';
    const result = truncateText(text, 10);
    // No word boundary found, so truncates at maxLength
    expect(result).toBe('ThisIsAVe…');
  });

  it('handles empty string', () => {
    expect(truncateText('')).toBe('');
  });

  it('preserves word boundaries near the end', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = truncateText(text, 20);
    // Should cut at "fox" (word boundary near position 20)
    expect(result).toMatch(/…$/);
    expect(result.length).toBeLessThanOrEqual(21);
  });
});
