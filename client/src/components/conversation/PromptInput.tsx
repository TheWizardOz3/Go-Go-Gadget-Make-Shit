/**
 * PromptInput - Text input for sending prompts to Claude
 *
 * Mobile-optimized input with auto-expanding textarea and send button.
 * Positioned at the bottom of the conversation view.
 * Shows stop button when Claude is working.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { StopButton } from './StopButton';
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
  /** External value for controlled mode (e.g., from template selection) */
  externalValue?: string;
  /** Callback when value changes - useful for parent state sync */
  onValueChange?: (value: string) => void;
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
  externalValue,
  onValueChange,
  className,
}: PromptInputProps) {
  // Initialize from localStorage to persist draft across app backgrounds
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external value when it changes (e.g., from template selection)
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== value) {
      setValue(externalValue);
      // Persist to localStorage
      try {
        if (externalValue) {
          localStorage.setItem(STORAGE_KEY, externalValue);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [externalValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trim value to check if it's empty (whitespace-only counts as empty)
  const hasContent = value.trim().length > 0;
  const isDisabled = disabled || isSending;
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
   * Persists to localStorage for background app recovery
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

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
  }, [canSend, value, onSend]);

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

  return (
    <div
      className={cn(
        // Container styling
        'flex items-end gap-2',
        'px-4 py-2',
        'bg-surface border-t border-text-primary/10',
        // Safe area for notched devices
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className
      )}
    >
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
      </div>

      {/* Action button: Stop when working, Send otherwise */}
      {status === 'working' && onStop ? (
        <StopButton onStop={onStop} isStopping={isStopping} />
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            // Base styling
            'flex-shrink-0',
            'flex items-center justify-center',
            'w-11 h-11',
            'rounded-xl',
            'transition-colors duration-150',
            // Enabled state
            canSend && 'bg-accent text-white hover:bg-accent/90 active:bg-accent/80',
            // Disabled state
            !canSend && 'bg-text-primary/10 text-text-muted cursor-not-allowed'
          )}
        >
          {isSending ? (
            // Loading spinner
            <svg
              className="w-5 h-5 animate-spin"
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
            // Send arrow icon
            <svg
              className="w-5 h-5"
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
  );
}
