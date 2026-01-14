/**
 * Tests for Process Manager
 *
 * Tests the in-memory process tracking functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackProcess,
  untrackProcess,
  getActiveProcess,
  hasActiveProcess,
  getAllActiveProcesses,
  getActiveProcessCount,
  clearAllProcesses,
} from './processManager.js';

describe('processManager', () => {
  // Clear all tracked processes before each test
  beforeEach(() => {
    clearAllProcesses();
  });

  describe('trackProcess', () => {
    it('should track a new process', () => {
      trackProcess('session-1', 12345, '/path/to/project');

      const process = getActiveProcess('session-1');
      expect(process).not.toBeNull();
      expect(process?.pid).toBe(12345);
      expect(process?.sessionId).toBe('session-1');
      expect(process?.projectPath).toBe('/path/to/project');
      expect(process?.startedAt).toBeInstanceOf(Date);
    });

    it('should replace existing process for same session', () => {
      trackProcess('session-1', 111, '/path/1');
      trackProcess('session-1', 222, '/path/2');

      const process = getActiveProcess('session-1');
      expect(process?.pid).toBe(222);
      expect(process?.projectPath).toBe('/path/2');
      expect(getActiveProcessCount()).toBe(1);
    });

    it('should track multiple sessions independently', () => {
      trackProcess('session-1', 111, '/path/1');
      trackProcess('session-2', 222, '/path/2');
      trackProcess('session-3', 333, '/path/3');

      expect(getActiveProcessCount()).toBe(3);
      expect(getActiveProcess('session-1')?.pid).toBe(111);
      expect(getActiveProcess('session-2')?.pid).toBe(222);
      expect(getActiveProcess('session-3')?.pid).toBe(333);
    });
  });

  describe('untrackProcess', () => {
    it('should remove tracked process', () => {
      trackProcess('session-1', 12345, '/path');

      const result = untrackProcess('session-1');

      expect(result).toBe(true);
      expect(getActiveProcess('session-1')).toBeNull();
      expect(getActiveProcessCount()).toBe(0);
    });

    it('should return false when session was not tracked', () => {
      const result = untrackProcess('non-existent');

      expect(result).toBe(false);
    });

    it('should not affect other sessions', () => {
      trackProcess('session-1', 111, '/path/1');
      trackProcess('session-2', 222, '/path/2');

      untrackProcess('session-1');

      expect(getActiveProcess('session-1')).toBeNull();
      expect(getActiveProcess('session-2')?.pid).toBe(222);
      expect(getActiveProcessCount()).toBe(1);
    });
  });

  describe('getActiveProcess', () => {
    it('should return process info for tracked session', () => {
      trackProcess('session-1', 12345, '/project');

      const process = getActiveProcess('session-1');

      expect(process).toEqual({
        pid: 12345,
        sessionId: 'session-1',
        projectPath: '/project',
        startedAt: expect.any(Date),
      });
    });

    it('should return null for untracked session', () => {
      const process = getActiveProcess('non-existent');

      expect(process).toBeNull();
    });
  });

  describe('hasActiveProcess', () => {
    it('should return true for tracked session', () => {
      trackProcess('session-1', 12345, '/path');

      expect(hasActiveProcess('session-1')).toBe(true);
    });

    it('should return false for untracked session', () => {
      expect(hasActiveProcess('non-existent')).toBe(false);
    });

    it('should return false after process is untracked', () => {
      trackProcess('session-1', 12345, '/path');
      untrackProcess('session-1');

      expect(hasActiveProcess('session-1')).toBe(false);
    });
  });

  describe('getAllActiveProcesses', () => {
    it('should return empty array when no processes', () => {
      const processes = getAllActiveProcesses();

      expect(processes).toEqual([]);
    });

    it('should return all tracked processes', () => {
      trackProcess('session-1', 111, '/path/1');
      trackProcess('session-2', 222, '/path/2');

      const processes = getAllActiveProcesses();

      expect(processes).toHaveLength(2);
      expect(processes.map((p) => p.pid).sort()).toEqual([111, 222]);
    });
  });

  describe('getActiveProcessCount', () => {
    it('should return 0 when no processes', () => {
      expect(getActiveProcessCount()).toBe(0);
    });

    it('should return correct count', () => {
      trackProcess('session-1', 111, '/path');
      expect(getActiveProcessCount()).toBe(1);

      trackProcess('session-2', 222, '/path');
      expect(getActiveProcessCount()).toBe(2);

      untrackProcess('session-1');
      expect(getActiveProcessCount()).toBe(1);
    });
  });

  describe('clearAllProcesses', () => {
    it('should remove all tracked processes', () => {
      trackProcess('session-1', 111, '/path/1');
      trackProcess('session-2', 222, '/path/2');
      trackProcess('session-3', 333, '/path/3');

      clearAllProcesses();

      expect(getActiveProcessCount()).toBe(0);
      expect(getAllActiveProcesses()).toEqual([]);
    });
  });
});
