/**
 * JumpToLatest - Floating button to scroll to latest messages
 *
 * Appears when user has scrolled up in the conversation.
 */

import { cn } from '@/lib/cn';

interface JumpToLatestProps {
  /** Whether the button should be visible */
  visible: boolean;
  /** Callback when button is clicked */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * JumpToLatest floating button
 *
 * @example
 * ```tsx
 * <JumpToLatest
 *   visible={isScrolledUp}
 *   onClick={scrollToBottom}
 * />
 * ```
 */
export function JumpToLatest({ visible, onClick, className }: JumpToLatestProps) {
  if (!visible) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        // Positioning
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-20',
        // Appearance
        'flex items-center gap-2 px-4 py-2',
        'bg-surface border border-text-primary/20',
        'rounded-full shadow-lg',
        // Text
        'text-sm font-medium text-text-primary',
        // Animation
        'animate-in fade-in slide-in-from-bottom-4 duration-200',
        // Interaction
        'hover:bg-text-primary/5 active:scale-95',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
        className
      )}
      aria-label="Jump to latest messages"
    >
      {/* Down arrow icon */}
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      Jump to latest
    </button>
  );
}
