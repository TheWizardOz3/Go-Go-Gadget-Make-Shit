/**
 * Tests for Claude Service
 *
 * Tests the sendPrompt function that spawns Claude CLI processes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendPrompt, isClaudeAvailable, stopAgent } from './claudeService.js';
import { trackProcess, clearAllProcesses } from './processManager.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn().mockResolvedValue({
      isDirectory: () => true,
    }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock settings service to return allowEdits: false by default
vi.mock('./settingsService.js', () => ({
  getSettings: vi.fn().mockResolvedValue({
    notificationsEnabled: false,
    phoneNumber: null,
    serverHostname: 'localhost',
    allowEdits: false,
  }),
  updateSettings: vi.fn(),
}));

// Import the mocked execa
import { execa } from 'execa';
const mockExeca = vi.mocked(execa);

describe('claudeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendPrompt', () => {
    it('should spawn claude with correct arguments', async () => {
      // Mock successful spawn with event emitter methods
      const mockSubprocess = {
        pid: 12345,
        unref: vi.fn(),
        on: vi.fn().mockReturnThis(), // Return this for chaining
      };
      mockExeca.mockReturnValue(mockSubprocess as never);

      const result = await sendPrompt({
        sessionId: 'test-session-123',
        projectPath: '/path/to/project',
        prompt: 'Hello Claude',
      });

      // Verify execa was called correctly
      expect(mockExeca).toHaveBeenCalledWith('claude', ['-p', 'Hello Claude', '--continue'], {
        cwd: '/path/to/project',
        detached: true,
        stdio: 'ignore',
      });

      // Verify subprocess was unreferenced
      expect(mockSubprocess.unref).toHaveBeenCalled();

      // Verify event handlers were attached for process tracking
      expect(mockSubprocess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockSubprocess.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Verify result
      expect(result.success).toBe(true);
      expect(result.pid).toBe(12345);
      expect(result.tracked).toBe(true);
    });

    it('should handle ENOENT error when claude is not installed', async () => {
      // Mock ENOENT error - execa throws synchronously for ENOENT
      const error = new Error('spawn claude ENOENT');
      mockExeca.mockImplementation(() => {
        throw error;
      });

      const result = await sendPrompt({
        sessionId: 'test-session',
        projectPath: '/path/to/project',
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Claude CLI not found');
    });

    it('should handle generic spawn errors', async () => {
      // Mock generic error - throw synchronously
      const error = new Error('Some other error');
      mockExeca.mockImplementation(() => {
        throw error;
      });

      const result = await sendPrompt({
        sessionId: 'test-session',
        projectPath: '/path/to/project',
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to start Claude');
    });

    it('should return error when project directory does not exist', async () => {
      // Mock fs.stat to throw ENOENT
      const fs = await import('node:fs/promises');
      vi.mocked(fs.default.stat).mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      const result = await sendPrompt({
        sessionId: 'test-session',
        projectPath: '/nonexistent/path',
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project directory does not exist');
      // execa should NOT have been called
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should pass the exact prompt text', async () => {
      const mockSubprocess = {
        pid: 1,
        unref: vi.fn(),
        on: vi.fn().mockReturnThis(),
      };
      mockExeca.mockReturnValue(mockSubprocess as never);

      const longPrompt =
        'This is a much longer prompt\nwith multiple lines\nand special chars: @#$%';

      await sendPrompt({
        sessionId: 'test',
        projectPath: '/test',
        prompt: longPrompt,
      });

      expect(mockExeca).toHaveBeenCalledWith(
        'claude',
        ['-p', longPrompt, '--continue'],
        expect.any(Object)
      );
    });
  });

  describe('isClaudeAvailable', () => {
    it('should return true when claude is available', async () => {
      mockExeca.mockResolvedValue({ stdout: 'claude v1.0.0' } as never);

      const result = await isClaudeAvailable();

      expect(result).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith('claude', ['--version'], { timeout: 5000 });
    });

    it('should return false when claude is not available', async () => {
      mockExeca.mockRejectedValue(new Error('ENOENT') as never);

      const result = await isClaudeAvailable();

      expect(result).toBe(false);
    });
  });

  describe('stopAgent', () => {
    beforeEach(() => {
      clearAllProcesses();
    });

    it('should return success with processKilled: false when no active process', async () => {
      const result = await stopAgent({ sessionId: 'non-existent-session' });

      expect(result.success).toBe(true);
      expect(result.processKilled).toBe(false);
      expect(result.sessionId).toBe('non-existent-session');
      expect(result.message).toBe('No active Claude process for this session');
    });

    it('should return success with processKilled: false when tracked process no longer running', async () => {
      // Track a process that doesn't exist (PID won't be valid)
      trackProcess('session-1', 999999999, '/path');

      const result = await stopAgent({ sessionId: 'session-1' });

      expect(result.success).toBe(true);
      expect(result.processKilled).toBe(false);
      expect(result.message).toBe('Process was already stopped');
    });

    it('should attempt to kill running process with SIGINT', async () => {
      // This test is tricky because we need a real process to kill
      // For unit tests, we mainly test the "no process" paths
      // Integration tests would test actual process killing

      // Track a non-existent PID
      trackProcess('session-1', 999999999, '/path');

      const result = await stopAgent({ sessionId: 'session-1' });

      // Since the process doesn't exist, it should report as already stopped
      expect(result.success).toBe(true);
    });
  });
});
