/**
 * FloatingVoiceButton - Persistent voice recording button for Files views
 *
 * A floating action button that enables voice recording while browsing files.
 * Recordings append to the shared prompt text that syncs with PromptInput.
 *
 * Interactions:
 * - Tap: Start/stop recording
 * - Long press (500ms): Send accumulated prompt immediately
 */

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useSharedPrompt } from '@/contexts/SharedPromptContext';

// ============================================================
// Types
// ============================================================

interface FloatingVoiceButtonProps {
  /** Hide the button (e.g., when on Conversation tab) */
  hidden?: boolean;
  /** Called when user long-presses to send (for tab switching, etc.) */
  onSend: () => void;
  /** Called on voice input error */
  onError?: (error: Error) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// Constants
// ============================================================

/** Duration in ms to trigger long-press send */
const LONG_PRESS_DURATION = 500;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Trigger haptic feedback if available
 */
function triggerHapticFeedback(): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  } catch {
    // Silently ignore - haptics are a nice-to-have
  }
}

// ============================================================
// Icon Components
// ============================================================

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================
// Component
// ============================================================

/**
 * Floating voice recording button
 *
 * Visible on Files tab for recording voice prompts while browsing code.
 * Transcriptions append to shared prompt text visible in PromptInput.
 *
 * @example
 * ```tsx
 * <FloatingVoiceButton
 *   hidden={activeTab === 'conversation'}
 *   onSend={() => setActiveTab('conversation')}
 *   onError={(error) => showToast(error.message)}
 * />
 * ```
 */
export function FloatingVoiceButton({
  hidden = false,
  onSend,
  onError,
  className,
}: FloatingVoiceButtonProps) {
  const { hasText, appendText, requestSend } = useSharedPrompt();

  // Long press handling refs
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  // Voice input - appends transcription to shared prompt
  const handleTranscription = useCallback(
    (text: string) => {
      appendText(text);
    },
    [appendText]
  );

  const { isStarting, isRecording, isProcessing, startRecording, stopRecording } = useVoiceInput({
    onTranscription: handleTranscription,
    onError,
  });

  // Don't render when hidden
  if (hidden) return null;

  // Whether the button is in a busy state
  const isBusy = isProcessing || isStarting;

  /**
   * Handle tap (short press) - toggle recording
   */
  const handleClick = () => {
    // If this was a long press, don't handle as click
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (isBusy) return;

    // Trigger haptic feedback
    triggerHapticFeedback();

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /**
   * Handle long press start - begin timer for send action
   */
  const handlePressStart = () => {
    // Only allow long-press send when we have text and not currently recording
    if (!hasText || isRecording || isBusy) return;

    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;

      // Haptic feedback for send
      triggerHapticFeedback();

      // Request send via context (PromptInput will handle actual send)
      requestSend();
      // Switch to conversation tab
      onSend();
    }, LONG_PRESS_DURATION);
  };

  /**
   * Handle long press end - cancel timer if not yet triggered
   */
  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Dynamic aria-label based on state
  const ariaLabel = isRecording
    ? 'Stop recording'
    : isProcessing
      ? 'Transcribing...'
      : isStarting
        ? 'Starting...'
        : hasText
          ? 'Record more (hold to send)'
          : 'Start voice recording';

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      disabled={isBusy}
      aria-label={ariaLabel}
      className={cn(
        // Positioning - fixed bottom right, above tab bar
        'fixed z-50',
        'right-4 bottom-[calc(56px+16px+env(safe-area-inset-bottom))]',

        // Size and shape - circular FAB
        'w-14 h-14 rounded-full',
        'flex items-center justify-center',

        // Shadow for floating effect
        'shadow-lg shadow-black/25',

        // Transition
        'transition-all duration-150',

        // State-based styling
        isRecording && 'bg-error animate-pulse',
        isProcessing && 'bg-accent/80',
        isStarting && 'bg-accent/60',
        !isRecording && !isBusy && 'bg-accent hover:bg-accent/90 active:bg-accent/80',

        // Disabled/busy state
        isBusy && 'cursor-wait',

        className
      )}
    >
      {/* Badge indicator for accumulated text */}
      {hasText && !isRecording && !isBusy && (
        <span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface"
          aria-hidden="true"
        />
      )}

      {/* Icon based on state */}
      {isProcessing || isStarting ? (
        <SpinnerIcon className="w-6 h-6 text-white" />
      ) : isRecording ? (
        <StopIcon className="w-6 h-6 text-white" />
      ) : (
        <MicrophoneIcon className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
