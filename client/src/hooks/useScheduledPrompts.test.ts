/**
 * Tests for useScheduledPrompts hook utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  formatTime,
  getScheduleDescription,
  formatNextRun,
  formatLastExecution,
  type ScheduledPrompt,
} from './useScheduledPrompts';

// Helper to create a test prompt
function createTestPrompt(overrides: Partial<ScheduledPrompt> = {}): ScheduledPrompt {
  return {
    id: 'test-id',
    prompt: 'Test prompt',
    scheduleType: 'daily',
    timeOfDay: '09:00',
    projectPath: null,
    enabled: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('useScheduledPrompts utilities', () => {
  describe('formatTime', () => {
    it('should format morning times correctly', () => {
      expect(formatTime('09:00')).toBe('9:00 AM');
      expect(formatTime('09:30')).toBe('9:30 AM');
      expect(formatTime('00:00')).toBe('12:00 AM');
      expect(formatTime('11:59')).toBe('11:59 AM');
    });

    it('should format afternoon/evening times correctly', () => {
      expect(formatTime('12:00')).toBe('12:00 PM');
      expect(formatTime('13:00')).toBe('1:00 PM');
      expect(formatTime('14:30')).toBe('2:30 PM');
      expect(formatTime('23:59')).toBe('11:59 PM');
    });
  });

  describe('getScheduleDescription', () => {
    it('should describe daily schedule', () => {
      const prompt = createTestPrompt({ scheduleType: 'daily', timeOfDay: '09:00' });
      expect(getScheduleDescription(prompt)).toBe('Daily at 9:00 AM');
    });

    it('should describe weekly schedule with day name', () => {
      const prompt = createTestPrompt({
        scheduleType: 'weekly',
        timeOfDay: '09:00',
        dayOfWeek: 1, // Monday
      });
      expect(getScheduleDescription(prompt)).toBe('Mon at 9:00 AM');
    });

    it('should describe all days of week', () => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach((day, index) => {
        const prompt = createTestPrompt({
          scheduleType: 'weekly',
          timeOfDay: '09:00',
          dayOfWeek: index,
        });
        expect(getScheduleDescription(prompt)).toContain(day);
      });
    });

    it('should describe monthly schedule with ordinal', () => {
      const prompt = createTestPrompt({
        scheduleType: 'monthly',
        timeOfDay: '09:00',
        dayOfMonth: 1,
      });
      expect(getScheduleDescription(prompt)).toContain('1st');
    });

    it('should describe yearly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'yearly',
        timeOfDay: '09:00',
      });
      expect(getScheduleDescription(prompt)).toBe('Jan 1st at 9:00 AM');
    });
  });

  describe('formatNextRun', () => {
    it('should return "Not scheduled" for undefined', () => {
      expect(formatNextRun(undefined)).toBe('Not scheduled');
    });

    it('should return "Missed - tap to run" for past dates', () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      expect(formatNextRun(pastDate)).toBe('Missed - tap to run');
    });

    it('should return "Less than a minute" for very near future', () => {
      const nearFuture = new Date(Date.now() + 30000).toISOString();
      expect(formatNextRun(nearFuture)).toBe('Less than a minute');
    });

    it('should return minutes for times under an hour', () => {
      const inMinutes = new Date(Date.now() + 15 * 60000).toISOString();
      expect(formatNextRun(inMinutes)).toMatch(/In \d+ min/);
    });

    it('should return hours for times under a day', () => {
      const inHours = new Date(Date.now() + 3 * 3600000).toISOString();
      expect(formatNextRun(inHours)).toMatch(/In \d+ hour/);
    });

    it('should return days for times under a week', () => {
      const inDays = new Date(Date.now() + 3 * 86400000).toISOString();
      expect(formatNextRun(inDays)).toMatch(/In \d+ day/);
    });
  });

  describe('formatLastExecution', () => {
    it('should return null for no execution', () => {
      const prompt = createTestPrompt({ lastExecution: undefined });
      expect(formatLastExecution(prompt)).toBeNull();
    });

    it('should format successful execution', () => {
      const prompt = createTestPrompt({
        lastExecution: {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          status: 'success',
        },
      });
      expect(formatLastExecution(prompt)).toContain('✓');
    });

    it('should format failed execution', () => {
      const prompt = createTestPrompt({
        lastExecution: {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          status: 'failed',
          error: 'Test error',
        },
      });
      const result = formatLastExecution(prompt);
      expect(result).toContain('✗');
      expect(result).toContain('Test error');
    });

    it('should show "Just now" for very recent executions', () => {
      const prompt = createTestPrompt({
        lastExecution: {
          timestamp: new Date(Date.now() - 10000).toISOString(),
          status: 'success',
        },
      });
      expect(formatLastExecution(prompt)).toContain('Just now');
    });

    it('should show relative time for recent executions', () => {
      const prompt = createTestPrompt({
        lastExecution: {
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          status: 'success',
        },
      });
      expect(formatLastExecution(prompt)).toMatch(/\d+m ago/);
    });
  });
});
