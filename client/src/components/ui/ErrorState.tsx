/**
 * ErrorState - Error message with retry action
 *
 * Used to display errors with a clear path to recovery.
 */

import { cn } from '@/lib/cn';

interface ErrorStateProps {
  /** Error title (default: "Something went wrong") */
  title?: string;
  /** Error message/description */
  message: string;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Custom retry button text (default: "Try again") */
  retryText?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Make it compact (less padding) */
  compact?: boolean;
}

/**
 * Error state component with optional retry action
 *
 * @example
 * ```tsx
 * // Basic error with retry
 * <ErrorState
 *   message="Failed to load messages"
 *   onRetry={() => refetch()}
 * />
 *
 * // Custom title and retry text
 * <ErrorState
 *   title="Connection Lost"
 *   message="Unable to reach the server. Check your connection."
 *   onRetry={reconnect}
 *   retryText="Reconnect"
 * />
 *
 * // Without retry (informational only)
 * <ErrorState
 *   title="Session Ended"
 *   message="This session is no longer available."
 * />
 * ```
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try again',
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-6' : 'px-6 py-12',
        className
      )}
      role="alert"
    >
      {/* Error icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
        <svg
          className="h-6 w-6 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>

      {/* Message */}
      <p className="text-sm text-text-secondary max-w-sm mb-6">{message}</p>

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'px-4 py-2 min-h-touch',
            'bg-accent text-white font-medium',
            'rounded-lg',
            'transition-colors duration-150',
            'hover:bg-accent/90 active:bg-accent/80',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background'
          )}
        >
          {/* Refresh icon */}
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {retryText}
        </button>
      )}
    </div>
  );
}

/**
 * Inline error message (smaller, for use within other components)
 */
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 text-error text-sm',
        className
      )}
      role="alert"
    >
      <svg
        className="h-4 w-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="font-medium hover:underline focus:outline-none focus:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
