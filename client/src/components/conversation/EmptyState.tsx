/**
 * EmptyState - Empty conversation state display
 *
 * Shows a friendly message when there's no content to display.
 */

import { cn } from '@/lib/cn';

interface EmptyStateProps {
  /** Title text */
  title: string;
  /** Description/help text */
  message: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState component for conversations
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No messages yet"
 *   message="Start a conversation with Claude to see it here."
 * />
 * ```
 */
export function EmptyState({ title, message, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}
    >
      {/* Empty state icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-text-primary/5">
        <svg
          className="h-8 w-8 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>

      {/* Message */}
      <p className="text-sm text-text-secondary max-w-xs">{message}</p>
    </div>
  );
}
