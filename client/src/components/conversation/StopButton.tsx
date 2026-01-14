/**
 * StopButton - Emergency stop button for Claude Code agent
 *
 * Red stop button (square icon) that kills the running agent.
 * Designed for quick, one-tap emergency stops with haptic feedback.
 */

import { useCallback } from 'react';
import { cn } from '@/lib/cn';

interface StopButtonProps {
  /** Callback when stop is triggered */
  onStop: () => void;
  /** Whether the stop operation is in progress */
  isStopping?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Trigger haptic feedback if available
 *
 * Uses the Vibration API for tactile feedback on mobile devices.
 * Fails silently if not supported.
 */
function triggerHapticFeedback(): void {
  try {
    // Check if vibration is supported
    if ('vibrate' in navigator) {
      // Short vibration (50ms) for button feedback
      navigator.vibrate(50);
    }
  } catch {
    // Silently ignore - haptics are a nice-to-have
  }
}

/**
 * Stop button component for emergency agent termination
 *
 * @example
 * ```tsx
 * <StopButton
 *   onStop={() => stopAgent()}
 *   isStopping={isStopping}
 *   disabled={status !== 'working'}
 * />
 * ```
 */
export function StopButton({
  onStop,
  isStopping = false,
  disabled = false,
  className,
}: StopButtonProps) {
  const isDisabled = disabled || isStopping;

  /**
   * Handle stop button click
   */
  const handleClick = useCallback(() => {
    if (isDisabled) return;

    // Trigger haptic feedback for tactile confirmation
    triggerHapticFeedback();

    // Execute stop callback
    onStop();
  }, [isDisabled, onStop]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label="Stop agent"
      className={cn(
        // Base styling - matches send button size
        'flex-shrink-0',
        'flex items-center justify-center',
        'w-11 h-11',
        'rounded-xl',
        'transition-colors duration-150',
        // Enabled state - red for danger/stop
        !isDisabled && 'bg-error text-white hover:bg-error/90 active:bg-error/80',
        // Disabled state
        isDisabled && 'bg-text-primary/10 text-text-muted cursor-not-allowed',
        className
      )}
    >
      {isStopping ? (
        // Loading spinner while stopping
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
        // Stop icon (filled square)
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      )}
    </button>
  );
}
