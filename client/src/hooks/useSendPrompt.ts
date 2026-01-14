/**
 * Hook for sending prompts to Claude Code
 *
 * Handles the API call, loading state, and error management.
 */

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * Response from the send prompt API
 */
interface SendPromptResponse {
  success: boolean;
  sessionId: string;
  pid?: number;
}

/**
 * Return type for useSendPrompt hook
 */
export interface UseSendPromptReturn {
  /** Function to send a prompt */
  sendPrompt: (prompt: string) => Promise<boolean>;
  /** Whether a prompt is currently being sent */
  isSending: boolean;
  /** Error from the last send attempt (null if successful) */
  error: Error | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Hook for sending prompts to a Claude Code session
 *
 * @param sessionId - The session ID to send prompts to, or null to disable
 * @returns Object containing sendPrompt function, loading state, and error state
 *
 * @example
 * ```tsx
 * const { sendPrompt, isSending, error, clearError } = useSendPrompt(sessionId);
 *
 * const handleSend = async (prompt: string) => {
 *   const success = await sendPrompt(prompt);
 *   if (success) {
 *     // Clear input, scroll to bottom, etc.
 *   }
 * };
 *
 * return (
 *   <PromptInput
 *     onSend={handleSend}
 *     isSending={isSending}
 *     disabled={!sessionId}
 *   />
 * );
 * ```
 */
export function useSendPrompt(sessionId: string | null): UseSendPromptReturn {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Send a prompt to the session
   *
   * @param prompt - The prompt text to send
   * @returns True if sent successfully, false otherwise
   */
  const sendPrompt = useCallback(
    async (prompt: string): Promise<boolean> => {
      // Can't send without a session
      if (!sessionId) {
        setError(new Error('No session selected'));
        return false;
      }

      // Don't allow concurrent sends
      if (isSending) {
        return false;
      }

      // Validate prompt
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        setError(new Error('Prompt cannot be empty'));
        return false;
      }

      setIsSending(true);
      setError(null);

      try {
        await api.post<SendPromptResponse>(`/sessions/${sessionId}/send`, {
          prompt: trimmedPrompt,
        });

        return true;
      } catch (err) {
        // Extract error message
        let errorMessage = 'Failed to send prompt';

        if (err instanceof ApiError) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(new Error(errorMessage));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [sessionId, isSending]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendPrompt,
    isSending,
    error,
    clearError,
  };
}
