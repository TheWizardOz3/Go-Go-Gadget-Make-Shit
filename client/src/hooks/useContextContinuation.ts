/**
 * Hook for session context continuation across environments
 *
 * Handles fetching context summaries and initiating new sessions
 * with context preambles for cross-environment continuation.
 */

import { useState, useCallback } from 'react';
import { api, getApiMode, getCloudApiUrl } from '@/lib/api';
import type { ContextSummary } from '@shared/types';

// ============================================================
// Types
// ============================================================

export interface ContinuationState {
  /** Whether a continuation is in progress */
  isLoading: boolean;
  /** Error if continuation failed */
  error: string | null;
  /** The fetched context summary (if available) */
  contextSummary: ContextSummary | null;
}

export interface UseContextContinuationReturn extends ContinuationState {
  /** Fetch context summary for a session */
  fetchContextSummary: (
    sessionId: string,
    source: 'local' | 'cloud'
  ) => Promise<ContextSummary | null>;
  /** Initiate continuation to target environment */
  continueInEnvironment: (
    sessionId: string,
    sourceEnvironment: 'local' | 'cloud',
    targetEnvironment: 'local' | 'cloud',
    projectPath: string,
    gitRemoteUrl?: string
  ) => Promise<{ success: boolean; prompt?: string; error?: string }>;
  /** Clear any stored context */
  clearContext: () => void;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Hook for managing session context continuation
 *
 * @example
 * ```tsx
 * const { fetchContextSummary, continueInEnvironment, isLoading, error } = useContextContinuation();
 *
 * const handleContinue = async (sessionId: string) => {
 *   const result = await continueInEnvironment(sessionId, 'cloud', 'local', projectPath);
 *   if (result.success && result.prompt) {
 *     // Use the generated prompt with context preamble
 *     sendPrompt(result.prompt);
 *   }
 * };
 * ```
 */
export function useContextContinuation(): UseContextContinuationReturn {
  const [state, setState] = useState<ContinuationState>({
    isLoading: false,
    error: null,
    contextSummary: null,
  });

  /**
   * Fetch context summary from the appropriate endpoint
   */
  const fetchContextSummary = useCallback(
    async (sessionId: string, source: 'local' | 'cloud'): Promise<ContextSummary | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Determine which endpoint to use based on source
        const currentMode = getApiMode();
        let summary: ContextSummary;

        if (source === 'local') {
          // Fetch from local server
          // If we're in cloud mode, we need to use the laptop URL
          const laptopUrl = import.meta.env.VITE_LAPTOP_API_URL;
          if (currentMode === 'cloud' && laptopUrl) {
            summary = await api.get<ContextSummary>(
              `/sessions/${sessionId}/context-summary?source=local`,
              { baseUrl: laptopUrl }
            );
          } else {
            summary = await api.get<ContextSummary>(
              `/sessions/${sessionId}/context-summary?source=local`
            );
          }
        } else {
          // Fetch from cloud (Modal)
          const cloudUrl = getCloudApiUrl();
          if (!cloudUrl) {
            throw new Error('Cloud API URL not configured');
          }

          // Cloud sessions need to be fetched from Modal
          // The context-summary endpoint would need to be added to Modal
          // For now, we'll construct a summary from messages
          summary = await api.get<ContextSummary>(
            `/sessions/${sessionId}/context-summary?source=cloud`,
            { baseUrl: cloudUrl }
          );
        }

        setState((prev) => ({ ...prev, isLoading: false, contextSummary: summary }));
        return summary;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch context';
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return null;
      }
    },
    []
  );

  /**
   * Initiate continuation to target environment
   */
  const continueInEnvironment = useCallback(
    async (
      sessionId: string,
      sourceEnvironment: 'local' | 'cloud',
      _targetEnvironment: 'local' | 'cloud',
      _projectPath: string,
      _gitRemoteUrl?: string
    ): Promise<{ success: boolean; prompt?: string; error?: string }> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Fetch context summary from source environment
        const summary = await fetchContextSummary(sessionId, sourceEnvironment);
        if (!summary) {
          return { success: false, error: 'Failed to fetch context summary' };
        }

        // Generate the prompt with context preamble
        // The actual sending will be handled by the parent component
        const contextPrompt = summary.summaryText;

        setState((prev) => ({ ...prev, isLoading: false }));

        return {
          success: true,
          prompt: contextPrompt,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Continuation failed';
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },
    [fetchContextSummary]
  );

  /**
   * Clear stored context
   */
  const clearContext = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      contextSummary: null,
    });
  }, []);

  return {
    ...state,
    fetchContextSummary,
    continueInEnvironment,
    clearContext,
  };
}
