/**
 * Tests for cron pattern utilities
 */

import { describe, it, expect } from 'vitest';
import {
  toCronPattern,
  calculateNextRunAt,
  getScheduleDescription,
  isValidCronPattern,
} from './cronUtils.js';
import type { ScheduledPrompt } from '../../../shared/types/index.js';

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

describe('cronUtils', () => {
  describe('toCronPattern', () => {
    it('should generate correct pattern for daily schedule', () => {
      const prompt = createTestPrompt({ scheduleType: 'daily', timeOfDay: '09:00' });
      expect(toCronPattern(prompt)).toBe('0 9 * * *');
    });

    it('should generate correct pattern for daily schedule at different times', () => {
      expect(toCronPattern(createTestPrompt({ timeOfDay: '00:00' }))).toBe('0 0 * * *');
      expect(toCronPattern(createTestPrompt({ timeOfDay: '23:59' }))).toBe('59 23 * * *');
      expect(toCronPattern(createTestPrompt({ timeOfDay: '14:30' }))).toBe('30 14 * * *');
    });

    it('should generate correct pattern for weekly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'weekly',
        timeOfDay: '09:00',
        dayOfWeek: 1, // Monday
      });
      expect(toCronPattern(prompt)).toBe('0 9 * * 1');
    });

    it('should generate correct pattern for different days of week', () => {
      expect(toCronPattern(createTestPrompt({ scheduleType: 'weekly', dayOfWeek: 0 }))).toBe(
        '0 9 * * 0'
      ); // Sunday
      expect(toCronPattern(createTestPrompt({ scheduleType: 'weekly', dayOfWeek: 6 }))).toBe(
        '0 9 * * 6'
      ); // Saturday
    });

    it('should generate correct pattern for monthly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'monthly',
        timeOfDay: '09:00',
        dayOfMonth: 1,
      });
      expect(toCronPattern(prompt)).toBe('0 9 1 * *');
    });

    it('should generate correct pattern for different days of month', () => {
      expect(toCronPattern(createTestPrompt({ scheduleType: 'monthly', dayOfMonth: 15 }))).toBe(
        '0 9 15 * *'
      );
      expect(toCronPattern(createTestPrompt({ scheduleType: 'monthly', dayOfMonth: 28 }))).toBe(
        '0 9 28 * *'
      );
    });

    it('should generate correct pattern for yearly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'yearly',
        timeOfDay: '09:00',
      });
      expect(toCronPattern(prompt)).toBe('0 9 1 1 *');
    });

    it('should use provided dayOfWeek value in weekly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'weekly',
        timeOfDay: '10:00',
        dayOfWeek: 3,
      });
      expect(toCronPattern(prompt)).toBe('0 10 * * 3');
    });

    it('should use provided dayOfMonth value in monthly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'monthly',
        timeOfDay: '10:00',
        dayOfMonth: 20,
      });
      expect(toCronPattern(prompt)).toBe('0 10 20 * *');
    });
  });

  describe('calculateNextRunAt', () => {
    it('should return a future date for daily schedule', () => {
      const prompt = createTestPrompt({ scheduleType: 'daily', timeOfDay: '09:00' });
      const nextRun = calculateNextRunAt(prompt);

      expect(nextRun).toBeDefined();
      expect(new Date(nextRun!).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return a future date for weekly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'weekly',
        timeOfDay: '09:00',
        dayOfWeek: 1,
      });
      const nextRun = calculateNextRunAt(prompt);

      expect(nextRun).toBeDefined();
      expect(new Date(nextRun!).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return a future date for monthly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'monthly',
        timeOfDay: '09:00',
        dayOfMonth: 15,
      });
      const nextRun = calculateNextRunAt(prompt);

      expect(nextRun).toBeDefined();
      expect(new Date(nextRun!).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return a future date for yearly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'yearly',
        timeOfDay: '09:00',
      });
      const nextRun = calculateNextRunAt(prompt);

      expect(nextRun).toBeDefined();
      expect(new Date(nextRun!).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getScheduleDescription', () => {
    it('should describe daily schedule', () => {
      const prompt = createTestPrompt({ scheduleType: 'daily', timeOfDay: '09:00' });
      expect(getScheduleDescription(prompt)).toBe('Daily at 9:00 AM');
    });

    it('should describe daily schedule with PM time', () => {
      const prompt = createTestPrompt({ scheduleType: 'daily', timeOfDay: '14:30' });
      expect(getScheduleDescription(prompt)).toBe('Daily at 2:30 PM');
    });

    it('should describe weekly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'weekly',
        timeOfDay: '09:00',
        dayOfWeek: 1,
      });
      expect(getScheduleDescription(prompt)).toBe('Every Monday at 9:00 AM');
    });

    it('should describe monthly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'monthly',
        timeOfDay: '09:00',
        dayOfMonth: 1,
      });
      expect(getScheduleDescription(prompt)).toBe('Monthly on the 1st at 9:00 AM');
    });

    it('should describe yearly schedule', () => {
      const prompt = createTestPrompt({
        scheduleType: 'yearly',
        timeOfDay: '09:00',
      });
      expect(getScheduleDescription(prompt)).toBe('Yearly on January 1st at 9:00 AM');
    });

    it('should handle different ordinals for monthly', () => {
      expect(
        getScheduleDescription(createTestPrompt({ scheduleType: 'monthly', dayOfMonth: 2 }))
      ).toContain('2nd');
      expect(
        getScheduleDescription(createTestPrompt({ scheduleType: 'monthly', dayOfMonth: 3 }))
      ).toContain('3rd');
      expect(
        getScheduleDescription(createTestPrompt({ scheduleType: 'monthly', dayOfMonth: 4 }))
      ).toContain('4th');
      expect(
        getScheduleDescription(createTestPrompt({ scheduleType: 'monthly', dayOfMonth: 11 }))
      ).toContain('11th');
      expect(
        getScheduleDescription(createTestPrompt({ scheduleType: 'monthly', dayOfMonth: 21 }))
      ).toContain('21st');
    });
  });

  describe('isValidCronPattern', () => {
    it('should return true for valid patterns', () => {
      expect(isValidCronPattern('0 9 * * *')).toBe(true);
      expect(isValidCronPattern('0 9 * * 1')).toBe(true);
      expect(isValidCronPattern('0 9 1 * *')).toBe(true);
      expect(isValidCronPattern('0 9 1 1 *')).toBe(true);
      expect(isValidCronPattern('30 14 15 6 3')).toBe(true);
    });

    it('should return false for invalid patterns', () => {
      expect(isValidCronPattern('')).toBe(false);
      expect(isValidCronPattern('invalid')).toBe(false);
      expect(isValidCronPattern('0 9 *')).toBe(false); // Too few fields
      expect(isValidCronPattern('0 9 * * * *')).toBe(false); // Too many fields
    });
  });
});
