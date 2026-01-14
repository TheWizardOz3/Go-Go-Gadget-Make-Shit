/**
 * Tests for Claude Service
 *
 * Tests the sendPrompt function that spawns Claude CLI processes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendPrompt, isClaudeAvailable } from './claudeService.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
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
      // Mock successful spawn
      const mockSubprocess = {
        pid: 12345,
        unref: vi.fn(),
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

      // Verify result
      expect(result.success).toBe(true);
      expect(result.pid).toBe(12345);
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

    it('should pass the exact prompt text', async () => {
      const mockSubprocess = {
        pid: 1,
        unref: vi.fn(),
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
});
