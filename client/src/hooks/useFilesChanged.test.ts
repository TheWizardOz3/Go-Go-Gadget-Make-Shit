/**
 * Tests for useFilesChanged hook
 *
 * Tests the API integration, caching behavior, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';
import { useFilesChanged } from './useFilesChanged';
import { api } from '@/lib/api';
import type { FileChange } from '@shared/types';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

// Mock files data
const mockFiles: FileChange[] = [
  { path: 'src/index.ts', status: 'modified', additions: 10, deletions: 5 },
  { path: 'src/new-file.ts', status: 'added', additions: 20, deletions: 0 },
  { path: 'src/removed.ts', status: 'deleted', additions: 0, deletions: 15 },
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

describe('useFilesChanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with loading state when encodedPath is provided', async () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useFilesChanged('test-project'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.files).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.count).toBe(0);
    });

    it('should not fetch when encodedPath is null', async () => {
      const { result } = renderHook(() => useFilesChanged(null), {
        wrapper: createWrapper(),
      });

      // Should not be loading since no fetch was initiated
      expect(result.current.isLoading).toBe(false);
      expect(result.current.files).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.count).toBe(0);

      // API should not have been called
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('successful fetch', () => {
    it('should return files after successful fetch', async () => {
      mockApi.get.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFilesChanged('test-project'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.files).toEqual(mockFiles);
      expect(result.current.error).toBeUndefined();
      expect(result.current.count).toBe(3);
      expect(mockApi.get).toHaveBeenCalledWith('/projects/test-project/files');
    });

    it('should return empty array and count 0 when no files changed', async () => {
      mockApi.get.mockResolvedValue([]);

      const { result } = renderHook(() => useFilesChanged('test-project'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.files).toEqual([]);
      expect(result.current.count).toBe(0);
    });

    it('should use correct API path with encoded project path', async () => {
      mockApi.get.mockResolvedValue([]);

      renderHook(() => useFilesChanged('encoded%2Fpath%2Fto%2Fproject'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalled();
      });

      expect(mockApi.get).toHaveBeenCalledWith('/projects/encoded%2Fpath%2Fto%2Fproject/files');
    });
  });

  describe('error handling', () => {
    it('should return error state when fetch fails', async () => {
      const error = new Error('Network error');
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useFilesChanged('test-project'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.files).toBeUndefined();
      expect(result.current.count).toBe(0);
    });
  });

  describe('refresh function', () => {
    it('should refetch data when refresh is called', async () => {
      mockApi.get.mockResolvedValueOnce(mockFiles);

      const { result } = renderHook(() => useFilesChanged('test-project'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.files).toEqual(mockFiles);
      });

      // Update mock for second call
      const updatedFiles = [
        ...mockFiles,
        { path: 'new.ts', status: 'added', additions: 5, deletions: 0 },
      ];
      mockApi.get.mockResolvedValueOnce(updatedFiles);

      // Trigger refresh
      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.files).toEqual(updatedFiles);
      });

      expect(result.current.count).toBe(4);
    });
  });

  describe('return value structure', () => {
    it('should return correct shape', async () => {
      mockApi.get.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFilesChanged('test-project'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the structure
      expect(result.current).toHaveProperty('files');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refresh');
      expect(result.current).toHaveProperty('count');

      // Verify refresh is a function
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('encodedPath changes', () => {
    it('should refetch when encodedPath changes', async () => {
      mockApi.get.mockResolvedValue(mockFiles);

      const { result, rerender } = renderHook(
        ({ path }: { path: string | null }) => useFilesChanged(path),
        {
          wrapper: createWrapper(),
          initialProps: { path: 'project-1' },
        }
      );

      await waitFor(() => {
        expect(result.current.files).toEqual(mockFiles);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/projects/project-1/files');

      // Change to different project
      const newFiles: FileChange[] = [
        { path: 'other.ts', status: 'modified', additions: 1, deletions: 1 },
      ];
      mockApi.get.mockResolvedValue(newFiles);

      rerender({ path: 'project-2' });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/projects/project-2/files');
      });
    });

    it('should stop fetching when encodedPath becomes null', async () => {
      mockApi.get.mockResolvedValue(mockFiles);

      const { result, rerender } = renderHook(
        ({ path }: { path: string | null }) => useFilesChanged(path),
        {
          wrapper: createWrapper(),
          initialProps: { path: 'project-1' as string | null },
        }
      );

      await waitFor(() => {
        expect(result.current.files).toEqual(mockFiles);
      });

      // Clear the mock call count
      mockApi.get.mockClear();

      // Change to null
      rerender({ path: null });

      // Wait a bit to ensure no new calls are made
      await new Promise((resolve) => setTimeout(resolve, 50));

      // No new API calls should have been made
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });
});
