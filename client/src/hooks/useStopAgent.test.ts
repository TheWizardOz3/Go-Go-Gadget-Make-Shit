/**
 * Tests for useStopAgent hook
 *
 * Tests the API integration, loading states, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStopAgent } from './useStopAgent';
import { api, ApiError } from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number
    ) {
      super(message);
    }
  },
}));

// Mock SWR's mutate
vi.mock('swr', () => ({
  mutate: vi.fn(),
}));

const mockApi = vi.mocked(api);

describe('useStopAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useStopAgent('session-123'));

      expect(result.current.isStopping).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.stopAgent).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('stopAgent', () => {
    it('should stop agent successfully and return true', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        sessionId: 'session-123',
        processKilled: true,
        signal: 'SIGINT',
      });

      const { result } = renderHook(() => useStopAgent('session-123'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.stopAgent();
      });

      expect(success).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/sessions/session-123/stop');
      expect(result.current.error).toBeNull();
    });

    it('should set isStopping to true during request', async () => {
      // Create a promise we can control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.post.mockReturnValue(pendingPromise as Promise<unknown>);

      const { result } = renderHook(() => useStopAgent('session-123'));

      // Start the stop request
      let stopPromise: Promise<boolean>;
      act(() => {
        stopPromise = result.current.stopAgent();
      });

      // isStopping should be true while waiting
      expect(result.current.isStopping).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ success: true });
        await stopPromise;
      });

      // isStopping should be false after completion
      expect(result.current.isStopping).toBe(false);
    });

    it('should return false when no session is selected', async () => {
      const { result } = renderHook(() => useStopAgent(null));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.stopAgent();
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toBe('No session selected');
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should handle API error and set error state', async () => {
      mockApi.post.mockRejectedValue(new ApiError('Server error', 'INTERNAL_ERROR', 500));

      const { result } = renderHook(() => useStopAgent('session-123'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.stopAgent();
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toBe('Server error');
      expect(result.current.isStopping).toBe(false);
    });

    it('should handle generic error', async () => {
      mockApi.post.mockRejectedValue(new Error('Network failed'));

      const { result } = renderHook(() => useStopAgent('session-123'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.stopAgent();
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toBe('Network failed');
    });

    it('should not allow concurrent stop attempts', async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.post.mockReturnValue(pendingPromise as Promise<unknown>);

      const { result } = renderHook(() => useStopAgent('session-123'));

      // Start first stop
      let firstPromise: Promise<boolean>;
      act(() => {
        firstPromise = result.current.stopAgent();
      });

      // Try to start second stop (should return false immediately)
      let secondResult: boolean | undefined;
      await act(async () => {
        secondResult = await result.current.stopAgent();
      });

      expect(secondResult).toBe(false);
      expect(mockApi.post).toHaveBeenCalledTimes(1);

      // Clean up by resolving the first promise
      await act(async () => {
        resolvePromise!({ success: true });
        await firstPromise;
      });
    });
  });

  describe('clearError', () => {
    it('should clear the error state', async () => {
      mockApi.post.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useStopAgent('session-123'));

      // Create an error
      await act(async () => {
        await result.current.stopAgent();
      });

      expect(result.current.error).not.toBeNull();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
