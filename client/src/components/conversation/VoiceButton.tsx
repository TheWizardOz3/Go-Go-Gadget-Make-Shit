/**
 * VoiceButton - Voice input toggle button
 *
 * Tap-to-record button for voice input. Toggles between:
 * - Idle: Microphone icon, ready to record
 * - Recording: Stop icon, red with pulse animation
 * - Processing: Spinner, transcription in progress
 */

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';

// ============================================================
// Types
// ============================================================

interface VoiceButtonProps {
  /** Whether currently recording audio */
  isRecording: boolean;
  /** Whether currently processing/transcribing audio */
  isProcessing: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Callback to start recording */
  onStart: () => void;
  /** Callback to stop recording */
  onStop: () => void;
  /** Button size in pixels - 44px or 56px (default: 56) */
  size?: 44 | 56;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Trigger haptic feedback if available
 *
 * Uses the Vibration API for tactile feedback on mobile devices.
 * Fails silently if not supported.
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

function MicrophoneIcon() {
  return (
    <svg
      className="w-full h-full"
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

function StopIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-full h-full animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
 * Voice input button component
 *
 * Toggles between recording states with appropriate visual feedback.
 * Tap once to start, tap again to stop and transcribe.
 *
 * @example
 * ```tsx
 * <VoiceButton
 *   isRecording={isRecording}
 *   isProcessing={isProcessing}
 *   onStart={startRecording}
 *   onStop={stopRecording}
 *   disabled={isSending}
 *   size={56}
 * />
 * ```
 */
export function VoiceButton({
  isRecording,
  isProcessing,
  disabled = false,
  onStart,
  onStop,
  size = 56,
  className,
}: VoiceButtonProps) {
  const isDisabled = disabled || isProcessing;
  const lastClickTimeRef = useRef<number>(0);

  /**
   * Handle button click - toggle recording state
   * Includes debouncing to prevent rapid clicks (300ms)
   */
  const handleClick = useCallback(() => {
    if (isDisabled) return;

    // Debounce: prevent rapid clicks (300ms minimum between clicks)
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      return;
    }
    lastClickTimeRef.current = now;

    // Trigger haptic feedback
    triggerHapticFeedback();

    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  }, [isDisabled, isRecording, onStart, onStop]);

  // Dynamic aria-label based on state
  const ariaLabel = isRecording
    ? 'Stop recording'
    : isProcessing
      ? 'Processing audio'
      : 'Start voice input';

  // Size-dependent classes
  const sizeClass = size === 56 ? 'w-14 h-14' : 'w-11 h-11';
  const iconSize = size === 56 ? 'w-6 h-6' : 'w-5 h-5';
  const borderRadius = size === 56 ? 'rounded-[14px]' : 'rounded-xl';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      className={cn(
        // Base styling
        'flex-shrink-0',
        'flex items-center justify-center',
        sizeClass,
        borderRadius,
        'transition-colors duration-150',

        // Recording state - red with pulse animation
        isRecording && 'bg-error text-white animate-pulse',

        // Processing state - accent color
        isProcessing && 'bg-accent text-white',

        // Idle state - subtle background
        !isRecording && !isProcessing && !isDisabled && 'bg-text-primary/5 text-text-secondary',

        // Hover/active states for idle
        !isRecording &&
          !isProcessing &&
          !isDisabled &&
          'hover:bg-text-primary/10 active:bg-text-primary/20',

        // Disabled state
        isDisabled && !isProcessing && 'opacity-50 cursor-not-allowed',

        className
      )}
    >
      <div className={iconSize}>
        {isProcessing ? <SpinnerIcon /> : isRecording ? <StopIcon /> : <MicrophoneIcon />}
      </div>
    </button>
  );
}
