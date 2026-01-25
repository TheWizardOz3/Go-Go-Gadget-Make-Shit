/**
 * ThinkingIndicator - Shows Claude is actively processing
 *
 * Displays an animated indicator when Claude is working on a response.
 * Includes elapsed time and a pulsing animation for clear visual feedback.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface ThinkingIndicatorProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show elapsed time */
  showElapsedTime?: boolean;
  /** Custom message to display */
  message?: string;
}

/**
 * Animated typing dots
 */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span
        className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
        style={{ animationDelay: '0ms', animationDuration: '600ms' }}
      />
      <span
        className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
        style={{ animationDelay: '150ms', animationDuration: '600ms' }}
      />
      <span
        className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
        style={{ animationDelay: '300ms', animationDuration: '600ms' }}
      />
    </span>
  );
}

/**
 * Pulsing brain/thinking icon
 */
function ThinkingIcon() {
  return (
    <div className="relative w-5 h-5 mr-2">
      {/* Outer pulse ring */}
      <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
      {/* Inner static ring */}
      <div className="absolute inset-0.5 rounded-full bg-accent/30" />
      {/* Brain icon */}
      <svg
        className="absolute inset-0 w-5 h-5 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>
    </div>
  );
}

export function ThinkingIndicator({
  className,
  showElapsedTime = true,
  message = 'Claude is thinking',
}: ThinkingIndicatorProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className={cn('px-3 py-3 bg-transparent', className)}>
      {/* Mimic MessageHeader layout */}
      <div className="flex items-center gap-2 mb-1">
        <ThinkingIcon />
        <span className="text-xs font-medium text-accent">{message}</span>
        <TypingDots />
        {showElapsedTime && elapsedSeconds > 2 && (
          <span className="text-xs text-text-muted ml-auto">{formatTime(elapsedSeconds)}</span>
        )}
      </div>

      {/* Subtle progress bar animation */}
      <div className="pl-7 mt-2">
        <div className="h-0.5 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-transparent via-accent to-transparent animate-shimmer"
            style={{
              width: '50%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function ThinkingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
        'bg-accent/10 text-accent text-xs font-medium',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      Thinking
    </span>
  );
}
