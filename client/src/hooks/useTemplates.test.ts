/**
 * Tests for useTemplates hook
 *
 * Tests the API integration, caching behavior, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';
import { useTemplates, type Template } from './useTemplates';
import { api } from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

// Mock templates data
const mockTemplates: Template[] = [
  { label: 'Plan Milestone', icon: '📋', prompt: 'Plan a milestone...' },
  { label: 'Plan Feature', icon: '📝', prompt: 'Plan a feature...' },
  { label: 'Build Task', icon: '🔨', prompt: 'Build a task...' },
];

/**
 * Wrapper that provides a fresh SWR cache for each test
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      {
        value: {
          provider: () => new Map(),
          dedupingInterval: 0,
        },
      },
      children
    );
  };
}

describe('useTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with loading state when encodedPath is provided', async () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useTemplates('-test-project-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.templates).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it('should not fetch when encodedPath is null', async () => {
      const { result } = renderHook(() => useTemplates(null), {
        wrapper: createWrapper(),
      });

      // Wait a tick to ensure no fetch is triggered
      await new Promise((r) => setTimeout(r, 10));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.templates).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('successful fetch', () => {
    it('should fetch templates and return data', async () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates('-test-project-2'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.templates).toEqual(mockTemplates);
      expect(result.current.error).toBeUndefined();
    });

    it('should call correct API endpoint', async () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      renderHook(() => useTemplates('-Users-test-myproject'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/projects/-Users-test-myproject/templates');
      });
    });

    it('should return templates array with all properties', async () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates('-test-project-3'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.templates).toBeDefined();
      });

      expect(result.current.templates).toHaveLength(3);
      expect(result.current.templates![0]).toHaveProperty('label');
      expect(result.current.templates![0]).toHaveProperty('icon');
      expect(result.current.templates![0]).toHaveProperty('prompt');
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const testError = new Error('Network error');
      mockApi.get.mockRejectedValue(testError);

      const { result } = renderHook(() => useTemplates('-test-project-4'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.templates).toBeUndefined();
    });
  });

  describe('refresh function', () => {
    it('should provide refresh function', async () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates('-test-project-5'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe('function');
    });

    it('should refetch data when refresh is called', async () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates('-test-project-6'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.templates).toBeDefined();
      });

      // Clear mock to track new calls
      mockApi.get.mockClear();

      // Call refresh
      const updatedTemplates = [
        ...mockTemplates,
        { label: 'New', icon: '🆕', prompt: 'New prompt' },
      ];
      mockApi.get.mockResolvedValue(updatedTemplates);

      await result.current.refresh();

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalled();
      });
    });
  });

  describe('project switching', () => {
    it('should fetch new templates when encodedPath changes', async () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      const { result, rerender } = renderHook(({ path }) => useTemplates(path), {
        initialProps: { path: '-project-a' as string | null },
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.templates).toBeDefined();
      });

      expect(mockApi.get).toHaveBeenCalledWith('/projects/-project-a/templates');

      // Switch project
      mockApi.get.mockClear();
      rerender({ path: '-project-b' });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/projects/-project-b/templates');
      });
    });

    it('should stop fetching when encodedPath becomes null', async () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      const { result, rerender } = renderHook(({ path }) => useTemplates(path), {
        initialProps: { path: '-project-c' as string | null },
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.templates).toBeDefined();
      });

      mockApi.get.mockClear();
      rerender({ path: null });

      // Wait a tick
      await new Promise((r) => setTimeout(r, 10));

      // Should not have been called again
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('return value structure', () => {
    it('should return correct shape', () => {
      mockApi.get.mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates('-test-project-7'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('templates');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refresh');
    });
  });
});
