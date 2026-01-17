/**
 * SharedPromptContext - Shared state for prompt text between views
 *
 * Enables the FloatingVoiceButton on Files tab to share prompt text with
 * PromptInput on Conversation tab. Voice recordings from either location
 * append to the same shared text.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ============================================================
// Types
// ============================================================

interface SharedPromptContextValue {
  /** Current prompt text */
  promptText: string;
  /** Whether there's non-empty text to send */
  hasText: boolean;
  /** Whether a send has been requested (e.g., from floating button long-press) */
  shouldSend: boolean;
  /** Set the prompt text (replaces existing) */
  setPromptText: (text: string) => void;
  /** Append text to prompt (with space separator if existing text) */
  appendText: (text: string) => void;
  /** Clear all text */
  clearText: () => void;
  /** Request that the prompt be sent (sets shouldSend = true) */
  requestSend: () => void;
  /** Clear the send request (sets shouldSend = false) */
  clearSendRequest: () => void;
}

// ============================================================
// Context
// ============================================================

const SharedPromptContext = createContext<SharedPromptContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

interface SharedPromptProviderProps {
  children: ReactNode;
}

/**
 * Provider for shared prompt text state
 *
 * Wrap the app in this provider to enable prompt text sharing between
 * FloatingVoiceButton and PromptInput.
 *
 * @example
 * ```tsx
 * <SharedPromptProvider>
 *   <App />
 * </SharedPromptProvider>
 * ```
 */
export function SharedPromptProvider({ children }: SharedPromptProviderProps) {
  const [promptText, setPromptTextState] = useState('');
  const [shouldSend, setShouldSend] = useState(false);

  /**
   * Set the prompt text, replacing any existing text
   */
  const setPromptText = useCallback((text: string) => {
    setPromptTextState(text);
  }, []);

  /**
   * Append text to the existing prompt
   * Adds a space separator if there's existing text
   */
  const appendText = useCallback((text: string) => {
    if (!text.trim()) return;

    setPromptTextState((prev) => {
      const trimmedPrev = prev.trim();
      if (!trimmedPrev) {
        return text;
      }
      return `${trimmedPrev} ${text}`;
    });
  }, []);

  /**
   * Clear all prompt text
   */
  const clearText = useCallback(() => {
    setPromptTextState('');
  }, []);

  /**
   * Request that the prompt be sent
   * Used by FloatingVoiceButton on long-press
   */
  const requestSend = useCallback(() => {
    setShouldSend(true);
  }, []);

  /**
   * Clear the send request after it's been handled
   */
  const clearSendRequest = useCallback(() => {
    setShouldSend(false);
  }, []);

  const value: SharedPromptContextValue = {
    promptText,
    hasText: promptText.trim().length > 0,
    shouldSend,
    setPromptText,
    appendText,
    clearText,
    requestSend,
    clearSendRequest,
  };

  return <SharedPromptContext.Provider value={value}>{children}</SharedPromptContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

/**
 * Hook to access shared prompt text state
 *
 * Must be used within a SharedPromptProvider.
 *
 * @example
 * ```tsx
 * const { promptText, appendText, hasText } = useSharedPrompt();
 *
 * // Append voice transcription
 * appendText('Fix the bug in auth handler');
 *
 * // Check if there's text to send
 * if (hasText) {
 *   console.log('Ready to send:', promptText);
 * }
 * ```
 */
export function useSharedPrompt(): SharedPromptContextValue {
  const context = useContext(SharedPromptContext);

  if (!context) {
    throw new Error('useSharedPrompt must be used within a SharedPromptProvider');
  }

  return context;
}
