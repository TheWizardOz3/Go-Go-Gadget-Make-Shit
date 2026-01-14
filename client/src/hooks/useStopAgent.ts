/**
 * Hook for stopping a Claude Code agent
 *
 * Handles the API call, loading state, and error management.
 */

import { useState, useCallback } from 'react';
import { mutate } from 'swr';
import { api, ApiError } from '@/lib/api';

/**
 * Response from the stop agent API
 */
interface StopAgentResponse {
  success: boolean;
  sessionId: string;
  processKilled: boolean;
  pid?: number;
  signal?: string;
  message?: string;
}

/**
 * Return type for useStopAgent hook
 */
export interface UseStopAgentReturn {
  /** Function to stop the agent */
  stopAgent: () => Promise<boolean>;
  /** Whether the stop operation is in progress */
  isStopping: boolean;
  /** Error from the last stop attempt (null if successful) */
  error: Error | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Hook for stopping a Claude Code agent
 *
 * @param sessionId - The session ID to stop, or null to disable
 * @returns Object containing stopAgent function, loading state, and error state
 *
 * @example
 * ```tsx
 * const { stopAgent, isStopping, error, clearError } = useStopAgent(sessionId);
 *
 * const handleStop = async () => {
 *   const success = await stopAgent();
 *   if (success) {
 *     // Show toast, etc.
 *   }
 * };
 *
 * return (
 *   <StopButton
 *     onStop={handleStop}
 *     isStopping={isStopping}
 *     disabled={!sessionId}
 *   />
 * );
 * ```
 */
export function useStopAgent(sessionId: string | null): UseStopAgentReturn {
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Stop the Claude Code agent
   *
   * @returns True if stopped successfully, false otherwise
   */
  const stopAgent = useCallback(async (): Promise<boolean> => {
    // Can't stop without a session
    if (!sessionId) {
      setError(new Error('No session selected'));
      return false;
    }

    // Don't allow concurrent stop attempts
    if (isStopping) {
      return false;
    }

    setIsStopping(true);
    setError(null);

    try {
      // Optimistic update: immediately set status to 'idle' in the cache
      // This provides instant feedback while the API call completes
      mutate(
        `/sessions/${sessionId}/messages`,
        (current: unknown) => {
          if (current && typeof current === 'object' && 'status' in current) {
            return { ...current, status: 'idle' };
          }
          return current;
        },
        { revalidate: false } // Don't revalidate yet, we'll do it after the API call
      );

      // Call the stop API
      await api.post<StopAgentResponse>(`/sessions/${sessionId}/stop`);

      // Trigger a refresh of the conversation data to get the latest state
      await mutate(`/sessions/${sessionId}/messages`);

      return true;
    } catch (err) {
      // Revalidate to restore correct state after optimistic update failed
      mutate(`/sessions/${sessionId}/messages`);

      // Extract error message
      let errorMessage = 'Failed to stop agent';

      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(new Error(errorMessage));
      return false;
    } finally {
      setIsStopping(false);
    }
  }, [sessionId, isStopping]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    stopAgent,
    isStopping,
    error,
    clearError,
  };
}
