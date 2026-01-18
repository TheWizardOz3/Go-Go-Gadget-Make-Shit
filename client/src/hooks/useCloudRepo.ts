/**
 * Hook for managing cloud repository operations.
 *
 * The cloud execution model uses persistent volumes to store git repos:
 * - Repos persist across container restarts (no re-cloning every prompt)
 * - Changes are committed locally but NOT auto-pushed
 * - User must explicitly push changes when ready
 */

import { useState, useCallback } from 'react';
import { api, getApiMode } from '@/lib/api';
import { debugLog } from '@/lib/debugLog';

interface PendingChanges {
  hasPendingChanges: boolean;
  exists: boolean;
  uncommittedFiles?: string[];
  unpushedCommits?: string[];
  diffSummary?: string;
  commitCount?: number;
  error?: string;
  message?: string;
}

interface PushResult {
  success: boolean;
  message?: string;
  pushedCommits?: string[];
  error?: string;
}

interface UseCloudRepoReturn {
  /** Check for pending changes in the cloud repo */
  checkChanges: (projectName: string) => Promise<PendingChanges>;
  /** Push pending changes to GitHub */
  pushChanges: (projectName: string, repoUrl: string) => Promise<PushResult>;
  /** Current pending changes state */
  pendingChanges: PendingChanges | null;
  /** Loading state for check operation */
  isChecking: boolean;
  /** Loading state for push operation */
  isPushing: boolean;
  /** Last error */
  error: Error | null;
}

export function useCloudRepo(): UseCloudRepoReturn {
  const [pendingChanges, setPendingChanges] = useState<PendingChanges | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkChanges = useCallback(async (projectName: string): Promise<PendingChanges> => {
    // Only works in cloud mode
    if (getApiMode() !== 'cloud') {
      debugLog.info('useCloudRepo.checkChanges: Not in cloud mode, skipping');
      return {
        hasPendingChanges: false,
        exists: false,
        message: 'Not in cloud mode',
      };
    }

    setIsChecking(true);
    setError(null);

    try {
      debugLog.info('useCloudRepo.checkChanges: Checking', { projectName });
      const response = await api.post<PendingChanges>('/cloud/changes', { projectName });
      debugLog.info('useCloudRepo.checkChanges: Response', response);
      setPendingChanges(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check changes');
      debugLog.error('useCloudRepo.checkChanges: Error', { error: error.message });
      setError(error);
      return {
        hasPendingChanges: false,
        exists: false,
        error: error.message,
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const pushChanges = useCallback(
    async (projectName: string, repoUrl: string): Promise<PushResult> => {
      // Only works in cloud mode
      if (getApiMode() !== 'cloud') {
        debugLog.info('useCloudRepo.pushChanges: Not in cloud mode, skipping');
        return {
          success: false,
          error: 'Not in cloud mode',
        };
      }

      setIsPushing(true);
      setError(null);

      try {
        debugLog.info('useCloudRepo.pushChanges: Pushing', { projectName, repoUrl });
        const response = await api.post<PushResult>('/cloud/push', { projectName, repoUrl });
        debugLog.info('useCloudRepo.pushChanges: Response', response);

        // Clear pending changes after successful push
        if (response.success) {
          setPendingChanges(null);
        }

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to push changes');
        debugLog.error('useCloudRepo.pushChanges: Error', { error: error.message });
        setError(error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setIsPushing(false);
      }
    },
    []
  );

  return {
    checkChanges,
    pushChanges,
    pendingChanges,
    isChecking,
    isPushing,
    error,
  };
}
