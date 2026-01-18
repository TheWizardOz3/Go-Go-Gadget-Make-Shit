/**
 * Hook for sending prompts to Claude Code
 *
 * Handles the API call, loading state, and error management.
 * Supports both local execution and cloud (Modal) dispatch.
 *
 * Mode selection:
 * - Local mode: Sends prompt to existing session on laptop
 * - Cloud mode: Dispatches job to Modal for async execution
 */

import { useState, useCallback } from 'react';
import { api, ApiError, getApiMode } from '@/lib/api';
import { debugLog } from '@/lib/debugLog';
import type { ApiEndpointMode, CloudJobStatus } from '@shared/types';

// ============================================================
// Types
// ============================================================

/**
 * Response from the local send prompt API
 */
interface LocalSendPromptResponse {
  success: boolean;
  sessionId: string;
  pid?: number;
}

/**
 * Response from the cloud dispatch API
 */
interface CloudDispatchResponse {
  jobId: string;
  status: CloudJobStatus;
  message?: string;
}

/**
 * Options for cloud execution
 */
export interface CloudExecutionOptions {
  /** Git repository URL to clone in the cloud */
  repoUrl: string;
  /** Project name (used for JSONL file organization) */
  projectName: string;
  /** Existing session ID to continue (if resuming a conversation) */
  sessionId?: string;
  /** Allowed tools for Claude (e.g., ["Task", "Bash", "Read", "Write"]) */
  allowedTools?: string[];
  /** Webhook URL for completion notification */
  notificationWebhook?: string;
  /** ntfy topic for push notifications */
  ntfyTopic?: string;
}

/**
 * Result from sending a prompt
 */
export interface SendPromptResult {
  /** Whether the send was successful */
  success: boolean;
  /** Which mode was used to send */
  mode: ApiEndpointMode;
  /** Job ID if sent to cloud (for status polling) */
  jobId?: string;
  /** Session ID if sent locally */
  sessionId?: string;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Return type for useSendPrompt hook
 */
export interface UseSendPromptReturn {
  /**
   * Send a prompt to the current session (local mode)
   * @param prompt - The prompt text to send
   * @returns True if sent successfully, false otherwise
   */
  sendPrompt: (prompt: string) => Promise<boolean>;

  /**
   * Send a prompt with full control over mode and options
   * Returns detailed result including mode used and job ID
   * @param prompt - The prompt text to send
   * @param options - Cloud execution options (required for cloud mode)
   * @returns Detailed send result
   */
  sendPromptAdvanced: (
    prompt: string,
    options?: CloudExecutionOptions
  ) => Promise<SendPromptResult>;

  /**
   * Dispatch a prompt directly to cloud execution
   * @param prompt - The prompt text to send
   * @param options - Cloud execution options
   * @returns Job ID if successful, null otherwise
   */
  dispatchCloudJob: (prompt: string, options: CloudExecutionOptions) => Promise<string | null>;

  /** Whether a prompt is currently being sent */
  isSending: boolean;
  /** Error from the last send attempt (null if successful) */
  error: Error | null;
  /** Clear the current error */
  clearError: () => void;
  /** Last send result (for checking mode used, job ID, etc.) */
  lastResult: SendPromptResult | null;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Hook for sending prompts to a Claude Code session
 *
 * Automatically routes to cloud execution when laptop is unavailable.
 *
 * @param sessionId - The session ID to send prompts to, or null to disable local sends
 * @param defaultCloudOptions - Default options for cloud execution
 * @returns Object containing sendPrompt function, loading state, and error state
 *
 * @example
 * ```tsx
 * // Basic usage (local mode)
 * const { sendPrompt, isSending, error } = useSendPrompt(sessionId);
 * await sendPrompt("Fix the bug in auth.ts");
 *
 * // With cloud options (for when laptop is offline)
 * const { sendPromptAdvanced } = useSendPrompt(sessionId, {
 *   repoUrl: "https://github.com/user/repo.git",
 *   projectName: "my-project",
 * });
 *
 * const result = await sendPromptAdvanced("Implement feature X", {
 *   repoUrl: "https://github.com/user/repo.git",
 *   projectName: "my-project",
 * });
 *
 * if (result.mode === 'cloud') {
 *   console.log("Job dispatched:", result.jobId);
 * }
 * ```
 */
export function useSendPrompt(
  sessionId: string | null,
  defaultCloudOptions?: Partial<CloudExecutionOptions>
): UseSendPromptReturn {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<SendPromptResult | null>(null);

  /**
   * Dispatch a job to cloud execution
   */
  const dispatchCloudJob = useCallback(
    async (prompt: string, options: CloudExecutionOptions): Promise<string | null> => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        setError(new Error('Prompt cannot be empty'));
        return null;
      }

      if (!options.repoUrl) {
        setError(new Error('Repository URL is required for cloud execution'));
        return null;
      }

      if (!options.projectName) {
        setError(new Error('Project name is required for cloud execution'));
        return null;
      }

      setIsSending(true);
      setError(null);

      try {
        debugLog.info('Dispatching cloud job', {
          repoUrl: options.repoUrl,
          projectName: options.projectName,
        });

        const response = await api.post<CloudDispatchResponse>('/cloud/jobs', {
          prompt: trimmedPrompt,
          repoUrl: options.repoUrl,
          projectName: options.projectName,
          sessionId: options.sessionId,
          allowedTools: options.allowedTools,
          notificationWebhook: options.notificationWebhook,
          ntfyTopic: options.ntfyTopic,
        });

        debugLog.info('Cloud job dispatched successfully', {
          jobId: response.jobId,
          status: response.status,
        });

        const result: SendPromptResult = {
          success: true,
          mode: 'cloud',
          jobId: response.jobId,
        };
        setLastResult(result);

        return response.jobId;
      } catch (err) {
        let errorMessage = 'Failed to dispatch cloud job';

        if (err instanceof ApiError) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(new Error(errorMessage));
        setLastResult({
          success: false,
          mode: 'cloud',
          errorMessage,
        });
        return null;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  /**
   * Send a prompt locally to the current session
   */
  const sendPromptLocal = useCallback(
    async (prompt: string): Promise<SendPromptResult> => {
      if (!sessionId) {
        const result: SendPromptResult = {
          success: false,
          mode: 'local',
          errorMessage: 'No session selected',
        };
        setError(new Error(result.errorMessage));
        setLastResult(result);
        return result;
      }

      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        const result: SendPromptResult = {
          success: false,
          mode: 'local',
          errorMessage: 'Prompt cannot be empty',
        };
        setError(new Error(result.errorMessage));
        setLastResult(result);
        return result;
      }

      setIsSending(true);
      setError(null);

      try {
        const response = await api.post<LocalSendPromptResponse>(`/sessions/${sessionId}/send`, {
          prompt: trimmedPrompt,
        });

        const result: SendPromptResult = {
          success: true,
          mode: 'local',
          sessionId: response.sessionId,
        };
        setLastResult(result);
        return result;
      } catch (err) {
        let errorMessage = 'Failed to send prompt';

        if (err instanceof ApiError) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        const result: SendPromptResult = {
          success: false,
          mode: 'local',
          errorMessage,
        };
        setError(new Error(errorMessage));
        setLastResult(result);
        return result;
      } finally {
        setIsSending(false);
      }
    },
    [sessionId]
  );

  /**
   * Send a prompt with automatic mode detection
   * Falls back to cloud if local fails due to network issues
   */
  const sendPromptAdvanced = useCallback(
    async (prompt: string, options?: CloudExecutionOptions): Promise<SendPromptResult> => {
      // Don't allow concurrent sends
      if (isSending) {
        return {
          success: false,
          mode: 'local',
          errorMessage: 'A prompt is already being sent',
        };
      }

      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        const result: SendPromptResult = {
          success: false,
          mode: 'local',
          errorMessage: 'Prompt cannot be empty',
        };
        setError(new Error(result.errorMessage));
        setLastResult(result);
        return result;
      }

      // Get current API mode from the global api module
      const currentMode = getApiMode();

      // Merge options with defaults
      const cloudOptions: CloudExecutionOptions | undefined = options
        ? ({
            ...defaultCloudOptions,
            ...options,
          } as CloudExecutionOptions)
        : defaultCloudOptions
          ? (defaultCloudOptions as CloudExecutionOptions)
          : undefined;

      // If in cloud mode, dispatch to cloud
      if (currentMode === 'cloud') {
        if (!cloudOptions?.repoUrl || !cloudOptions?.projectName) {
          const result: SendPromptResult = {
            success: false,
            mode: 'cloud',
            errorMessage:
              'Cloud mode requires git repository info. Connect to laptop once to refresh project cache.',
          };
          setError(new Error(result.errorMessage));
          setLastResult(result);
          return result;
        }

        setIsSending(true);
        setError(null);

        const jobId = await dispatchCloudJob(trimmedPrompt, cloudOptions);
        // dispatchCloudJob already sets state, just need to return result
        const result: SendPromptResult = jobId
          ? { success: true, mode: 'cloud', jobId }
          : { success: false, mode: 'cloud', errorMessage: error?.message || 'Failed to dispatch' };

        return result;
      }

      // Local mode - send to session
      return sendPromptLocal(trimmedPrompt);
    },
    [isSending, defaultCloudOptions, dispatchCloudJob, sendPromptLocal, error]
  );

  /**
   * Simple send function for backward compatibility
   * Just sends the prompt and returns success/failure boolean
   */
  const sendPrompt = useCallback(
    async (prompt: string): Promise<boolean> => {
      // Don't allow concurrent sends
      if (isSending) {
        return false;
      }

      const result = await sendPromptAdvanced(prompt);
      return result.success;
    },
    [isSending, sendPromptAdvanced]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendPrompt,
    sendPromptAdvanced,
    dispatchCloudJob,
    isSending,
    error,
    clearError,
    lastResult,
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check the status of a cloud job
 *
 * @param jobId - The job ID to check
 * @returns Job status or null if not found
 */
export async function getCloudJobStatus(jobId: string): Promise<{
  id: string;
  status: CloudJobStatus;
  sessionId?: string;
  error?: string;
} | null> {
  try {
    const response = await api.get<{
      id: string;
      status: CloudJobStatus;
      sessionId?: string;
      error?: string;
    }>(`/cloud/jobs/${jobId}`);
    return response;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Poll a cloud job until completion
 *
 * @param jobId - The job ID to poll
 * @param options - Polling options
 * @returns Final job status
 */
export async function pollCloudJob(
  jobId: string,
  options: {
    /** Polling interval in ms (default: 2000) */
    interval?: number;
    /** Maximum time to poll in ms (default: 300000 = 5 minutes) */
    timeout?: number;
    /** Callback on each poll */
    onPoll?: (status: CloudJobStatus) => void;
  } = {}
): Promise<{
  success: boolean;
  status: CloudJobStatus;
  sessionId?: string;
  error?: string;
}> {
  const { interval = 2000, timeout = 300000, onPoll } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await getCloudJobStatus(jobId);

    if (!result) {
      return { success: false, status: 'failed', error: 'Job not found' };
    }

    onPoll?.(result.status);

    if (result.status === 'completed') {
      return { success: true, status: 'completed', sessionId: result.sessionId };
    }

    if (result.status === 'failed' || result.status === 'cancelled') {
      return { success: false, status: result.status, error: result.error };
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return { success: false, status: 'running', error: 'Polling timeout' };
}
