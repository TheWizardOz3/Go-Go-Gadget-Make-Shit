/**
 * PromptInput - Text input for sending prompts to Claude
 *
 * Mobile-optimized input with auto-expanding textarea, voice input, and send button.
 * Positioned at the bottom of the conversation view.
 * Shows stop button when Claude is working.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { StopButton } from './StopButton';
import { VoiceButton } from './VoiceButton';
import { Waveform } from './Waveform';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useSharedPrompt } from '@/contexts/SharedPromptContext';
import type { SessionStatus } from '@shared/types';

interface PromptInputProps {
  /** Callback when user sends a prompt */
  onSend: (prompt: string) => void;
  /** Whether a prompt is currently being sent */
  isSending?: boolean;
  /** External disable (e.g., when Claude is working) */
  disabled?: boolean;
  /** Current session status - shows stop button when 'working' */
  status?: SessionStatus;
  /** Callback when stop button is clicked */
  onStop?: () => void;
  /** Whether the stop operation is in progress */
  isStopping?: boolean;
  /** Text to insert at cursor position (e.g., from template selection) */
  insertText?: string;
  /** Callback when value changes - useful for parent state sync */
  onValueChange?: (value: string) => void;
  /** Callback after text has been inserted (to clear insertText) */
  onInsertComplete?: () => void;
  /** Callback when voice input encounters an error */
  onVoiceError?: (error: Error) => void;
  /** Additional CSS classes */
  className?: string;
}

/** Maximum height for the textarea before scrolling (in pixels) */
const MAX_HEIGHT = 150;

/** Minimum height for single line (matching touch target) */
const MIN_HEIGHT = 44;

/** localStorage key for persisting input draft */
const STORAGE_KEY = 'gogogadget-prompt-draft';

/**
 * Auto-expanding text input with send button for prompts
 *
 * @example
 * ```tsx
 * <PromptInput
 *   onSend={(prompt) => sendToServer(prompt)}
 *   isSending={isLoading}
 *   status={status}
 *   onStop={handleStop}
 *   isStopping={isStopping}
 * />
 * ```
 */
export function PromptInput({
  onSend,
  isSending = false,
  disabled = false,
  status,
  onStop,
  isStopping = false,
  insertText,
  onValueChange,
  onInsertComplete,
  onVoiceError,
  className,
}: PromptInputProps) {
  // Shared prompt context for sync with FloatingVoiceButton
  const { promptText, setPromptText, shouldSend, clearSendRequest } = useSharedPrompt();

  // Initialize from context if available, otherwise localStorage
  const [value, setValue] = useState(() => {
    // Context takes priority if it has content
    if (promptText) return promptText;
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track if we've initialized from localStorage (to avoid overwriting on first render)
  const hasInitializedRef = useRef(false);

  // Sync FROM context when it changes (e.g., FloatingVoiceButton adds transcription)
  useEffect(() => {
    // Skip the first render - we want to preserve localStorage value on initial mount
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // On first render, sync local value TO context if we have content from localStorage
      if (value && !promptText) {
        setPromptText(value);
      }
      return;
    }

    // After initialization, sync from context to local state
    if (promptText !== value) {
      setValue(promptText);
      // Also update localStorage to keep in sync
      try {
        if (promptText) {
          localStorage.setItem(STORAGE_KEY, promptText);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    // Intentionally excluding 'value' - we only want to react to context changes
  }, [promptText, setPromptText]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Insert text at cursor position (or append if no selection)
   * Used by both voice transcription and template insertion
   */
  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        // Fallback: append to end
        const newValue = value.trim() ? `${value} ${text}` : text;
        setValue(newValue);
        setPromptText(newValue); // Sync to shared context
        onValueChange?.(newValue);
        try {
          localStorage.setItem(STORAGE_KEY, newValue);
        } catch {
          // Ignore localStorage errors
        }
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert text at cursor position, replacing any selection
      const before = value.substring(0, start);
      const after = value.substring(end);

      // Add space before if needed (not at start, no space before cursor)
      const needsSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
      // Add space after if needed (not at end, no space after cursor)
      const needsSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');

      const insertedText = (needsSpaceBefore ? ' ' : '') + text + (needsSpaceAfter ? ' ' : '');
      const newValue = before + insertedText + after;

      setValue(newValue);
      setPromptText(newValue); // Sync to shared context
      onValueChange?.(newValue);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, newValue);
      } catch {
        // Ignore localStorage errors
      }

      // Move cursor to end of inserted text
      const newCursorPos = start + insertedText.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [value, onValueChange, setPromptText]
  );

  /**
   * Handle transcription result from voice input
   * Inserts at cursor position
   */
  const handleTranscription = useCallback(
    (text: string) => {
      insertAtCursor(text);
    },
    [insertAtCursor]
  );

  // Voice input hook
  const { audioStream, isStarting, isRecording, isProcessing, startRecording, stopRecording } =
    useVoiceInput({
      onTranscription: handleTranscription,
      onError: onVoiceError,
    });

  // Disable voice input when Claude is working or when sending
  const isVoiceDisabled = disabled || isSending || status === 'working';

  // Handle insertText prop - insert at cursor when it changes
  useEffect(() => {
    if (insertText !== undefined && insertText.length > 0) {
      insertAtCursor(insertText);
      // Notify parent that insertion is complete
      onInsertComplete?.();
    }
  }, [insertText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trim value to check if it's empty (whitespace-only counts as empty)
  const hasContent = value.trim().length > 0;
  const isDisabled = disabled || isSending || isStarting || isRecording || isProcessing;
  const canSend = hasContent && !isDisabled;

  /**
   * Auto-resize textarea based on content
   */
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height, capped at MAX_HEIGHT
    const newHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;

    // Enable/disable scrolling based on content height
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  /**
   * Handle textarea value change
   * Persists to localStorage and syncs to shared context
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Sync to shared context for FloatingVoiceButton coordination
    setPromptText(newValue);

    // Notify parent of value change
    onValueChange?.(newValue);

    // Persist to localStorage (debouncing not needed - this is fast)
    try {
      if (newValue) {
        localStorage.setItem(STORAGE_KEY, newValue);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage might be unavailable or full - ignore
    }
  };

  /**
   * Handle send action
   */
  const handleSend = useCallback(() => {
    if (!canSend) return;

    const trimmedValue = value.trim();
    onSend(trimmedValue);
    setValue('');
    setPromptText(''); // Clear shared context

    // Clear localStorage draft
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }

    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`;
    }
  }, [canSend, value, onSend, setPromptText]);

  // Handle send request from FloatingVoiceButton (long-press to send)
  useEffect(() => {
    if (shouldSend && hasContent) {
      // Clear the request flag first to prevent re-triggering
      clearSendRequest();

      // Send the prompt
      const trimmedValue = value.trim();
      onSend(trimmedValue);
      setValue('');
      setPromptText('');

      // Clear localStorage draft
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore localStorage errors
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      }
    } else if (shouldSend) {
      // No content to send, just clear the flag
      clearSendRequest();
    }
  }, [shouldSend, hasContent, value, onSend, setPromptText, clearSendRequest]);

  /**
   * Handle keyboard events for submit
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without shift sends the message (desktop pattern)
    // On mobile, Enter will just add a newline (handled by default)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      // Check if this looks like a desktop environment (has hover capability)
      const isDesktop = window.matchMedia('(hover: hover)').matches;

      if (isDesktop) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  // Adjust height whenever value changes
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  /**
   * Clear all text from the input
   */
  const handleClear = useCallback(() => {
    setValue('');
    setPromptText(''); // Clear shared context
    onValueChange?.('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      textareaRef.current.focus();
    }
  }, [onValueChange, setPromptText]);

  return (
    <div
      className={cn(
        // Container styling - vertical layout for waveform
        'flex flex-col gap-2',
        'px-4 py-2',
        'bg-surface border-t border-text-primary/10',
        // Safe area for notched devices
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className
      )}
    >
      {/* Waveform visualization - only shown when recording */}
      {isRecording && <Waveform audioStream={audioStream} />}

      {/* Input row with larger buttons and increased gap */}
      <div className="flex items-end gap-3">
        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isDisabled}
            aria-label="Message input"
            rows={1}
            className={cn(
              // Base styling
              'w-full resize-none',
              'px-4 py-3',
              // Add right padding for clear button
              hasContent && 'pr-10',
              'bg-background rounded-xl',
              'border border-text-primary/10',
              // Typography (16px prevents iOS zoom)
              'text-base text-text-primary',
              'placeholder:text-text-muted',
              // Focus state
              'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
              // Disabled state
              'disabled:opacity-50 disabled:cursor-not-allowed',
              // Scrollbar styling
              'scrollbar-hide'
            )}
            style={{
              minHeight: `${MIN_HEIGHT}px`,
              maxHeight: `${MAX_HEIGHT}px`,
            }}
          />

          {/* Clear button - appears when there's content */}
          {hasContent && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2',
                'p-1.5 rounded-full',
                'text-text-muted hover:text-text-primary',
                'hover:bg-text-primary/10 active:bg-text-primary/20',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
              )}
              aria-label="Clear input"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Voice input button - larger size */}
        <VoiceButton
          isStarting={isStarting}
          isRecording={isRecording}
          isProcessing={isProcessing}
          disabled={isVoiceDisabled}
          onStart={startRecording}
          onStop={stopRecording}
          size={56}
        />

        {/* Action button: Stop when working, Send otherwise - larger size */}
        {status === 'working' && onStop ? (
          <StopButton
            onStop={onStop}
            isStopping={isStopping}
            className="w-14 h-14 rounded-[14px]"
          />
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              // Base styling - larger size
              'flex-shrink-0',
              'flex items-center justify-center',
              'w-14 h-14',
              'rounded-[14px]',
              'transition-colors duration-150',
              // Enabled state
              canSend && 'bg-accent text-white hover:bg-accent/90 active:bg-accent/80',
              // Disabled state
              !canSend && 'bg-text-primary/10 text-text-muted cursor-not-allowed'
            )}
          >
            {isSending ? (
              // Loading spinner - larger
              <svg
                className="w-6 h-6 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              // Send arrow icon - larger
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
