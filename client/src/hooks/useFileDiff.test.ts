/**
 * Tests for useFileDiff hook
 *
 * Tests the API integration, caching behavior, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';
import { useFileDiff } from './useFileDiff';
import { api } from '@/lib/api';
import type { FileDiff } from '@shared/types';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

// Mock diff data
const mockDiff: FileDiff = {
  path: 'src/App.tsx',
  status: 'modified',
  hunks: [
    {
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      lines: [
        {
          type: 'context',
          content: 'import React from "react";',
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        { type: 'add', content: 'import { useState } from "react";', newLineNumber: 2 },
        { type: 'context', content: '', oldLineNumber: 2, newLineNumber: 3 },
        { type: 'context', content: 'function App() {', oldLineNumber: 3, newLineNumber: 4 },
      ],
    },
  ],
  isBinary: false,
  isTooBig: false,
  language: 'tsx',
};

const mockBinaryDiff: FileDiff = {
  path: 'image.png',
  status: 'modified',
  hunks: [],
  isBinary: true,
  isTooBig: false,
  language: 'text',
};

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

describe('useFileDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Data Fetching', () => {
    it('should fetch and return file diff data', async () => {
      mockApi.get.mockResolvedValueOnce(mockDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx'), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.diff).toBeUndefined();
      expect(result.current.error).toBeUndefined();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.diff).toEqual(mockDiff);
      expect(result.current.error).toBeUndefined();
      expect(mockApi.get).toHaveBeenCalledWith('/projects/encoded-path/files/src/App.tsx');
    });

    it('should handle binary files correctly', async () => {
      mockApi.get.mockResolvedValueOnce(mockBinaryDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'image.png'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.diff).toEqual(mockBinaryDiff);
      expect(result.current.diff?.isBinary).toBe(true);
      expect(result.current.diff?.hunks).toEqual([]);
    });

    it('should pass context parameter if provided', async () => {
      mockApi.get.mockResolvedValueOnce(mockDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx', 3), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/encoded-path/files/src/App.tsx?context=3'
      );
    });

    it('should not pass context parameter if undefined', async () => {
      mockApi.get.mockResolvedValueOnce(mockDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx', undefined), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/projects/encoded-path/files/src/App.tsx');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      mockApi.get.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.diff).toBeUndefined();
    });

    it('should handle 404 errors for non-existent files', async () => {
      const notFoundError = new Error('File not found');
      mockApi.get.mockRejectedValueOnce(notFoundError);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'non-existent.ts'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.diff).toBeUndefined();
    });
  });

  describe('Disabled State', () => {
    it('should not fetch when encodedPath is null', () => {
      const { result } = renderHook(() => useFileDiff(null, 'src/App.tsx'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.diff).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should not fetch when filePath is null', () => {
      const { result } = renderHook(() => useFileDiff('encoded-path', null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.diff).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should not fetch when both are null', () => {
      const { result } = renderHook(() => useFileDiff(null, null), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.diff).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should provide refresh function', async () => {
      mockApi.get.mockResolvedValueOnce(mockDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refresh).toBeInstanceOf(Function);
    });

    it('should refetch data when refresh is called', async () => {
      const updatedDiff = { ...mockDiff, hunks: [] };
      mockApi.get.mockResolvedValueOnce(mockDiff).mockResolvedValueOnce(updatedDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.diff).toEqual(mockDiff);

      // Call refresh
      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.diff).toEqual(updatedDiff);
      });

      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('SWR Configuration', () => {
    it('should not revalidate on focus', async () => {
      mockApi.get.mockResolvedValueOnce(mockDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate focus event
      window.dispatchEvent(new Event('focus'));

      // Should not trigger another fetch
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('should not revalidate on reconnect', async () => {
      mockApi.get.mockResolvedValueOnce(mockDiff);

      const { result } = renderHook(() => useFileDiff('encoded-path', 'src/App.tsx'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      // Should not trigger another fetch
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Files', () => {
    it('should handle fetching different files independently', async () => {
      const diff1 = { ...mockDiff, path: 'file1.ts' };
      const diff2 = { ...mockDiff, path: 'file2.ts' };

      mockApi.get.mockResolvedValueOnce(diff1).mockResolvedValueOnce(diff2);

      const { result: result1 } = renderHook(() => useFileDiff('encoded-path', 'file1.ts'), {
        wrapper: createWrapper(),
      });

      const { result: result2 } = renderHook(() => useFileDiff('encoded-path', 'file2.ts'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      expect(result1.current.diff?.path).toBe('file1.ts');
      expect(result2.current.diff?.path).toBe('file2.ts');
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });
  });
});
