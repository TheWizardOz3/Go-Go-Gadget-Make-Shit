/**
 * Tests for useSendPrompt hook
 *
 * Tests the API integration, loading states, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSendPrompt } from './useSendPrompt';
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

const mockApi = vi.mocked(api);

describe('useSendPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useSendPrompt('session-123'));

      expect(result.current.isSending).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.sendPrompt).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('sendPrompt', () => {
    it('should send prompt successfully and return true', async () => {
      mockApi.post.mockResolvedValue({ success: true, sessionId: 'session-123', pid: 12345 });

      const { result } = renderHook(() => useSendPrompt('session-123'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.sendPrompt('Hello Claude');
      });

      expect(success).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/sessions/session-123/send', {
        prompt: 'Hello Claude',
      });
      expect(result.current.isSending).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set isSending to true while sending', async () => {
      // Create a promise we can control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.post.mockReturnValue(pendingPromise as never);

      const { result } = renderHook(() => useSendPrompt('session-123'));

      // Start sending (don't await)
      act(() => {
        result.current.sendPrompt('Test');
      });

      // Check loading state
      await waitFor(() => {
        expect(result.current.isSending).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ success: true });
      });

      // Check final state
      expect(result.current.isSending).toBe(false);
    });

    it('should return false and set error when no session', async () => {
      const { result } = renderHook(() => useSendPrompt(null));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.sendPrompt('Hello');
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toBe('No session selected');
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should return false and set error when prompt is empty', async () => {
      const { result } = renderHook(() => useSendPrompt('session-123'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.sendPrompt('   ');
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toBe('Prompt cannot be empty');
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should trim the prompt before sending', async () => {
      mockApi.post.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSendPrompt('session-123'));

      await act(async () => {
        await result.current.sendPrompt('  Hello Claude  ');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/sessions/session-123/send', {
        prompt: 'Hello Claude',
      });
    });

    it('should handle API errors', async () => {
      const apiError = new ApiError('Session not found', 'NOT_FOUND', 404);
      mockApi.post.mockRejectedValue(apiError);

      const { result } = renderHook(() => useSendPrompt('session-123'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.sendPrompt('Hello');
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toBe('Session not found');
      expect(result.current.isSending).toBe(false);
    });

    it('should handle generic errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSendPrompt('session-123'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.sendPrompt('Hello');
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should prevent concurrent sends', async () => {
      let resolveFirst: (value: unknown) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      mockApi.post.mockReturnValueOnce(firstPromise as never);

      const { result } = renderHook(() => useSendPrompt('session-123'));

      // Start first send
      act(() => {
        result.current.sendPrompt('First');
      });

      // Try second send while first is pending
      let secondResult: boolean | undefined;
      await act(async () => {
        secondResult = await result.current.sendPrompt('Second');
      });

      // Second send should be rejected
      expect(secondResult).toBe(false);
      expect(mockApi.post).toHaveBeenCalledTimes(1);

      // Resolve first
      await act(async () => {
        resolveFirst!({ success: true });
      });
    });
  });

  describe('clearError', () => {
    it('should clear the error', async () => {
      const { result } = renderHook(() => useSendPrompt(null));

      // Create an error
      await act(async () => {
        await result.current.sendPrompt('Hello');
      });

      expect(result.current.error).not.toBeNull();

      // Clear it
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
