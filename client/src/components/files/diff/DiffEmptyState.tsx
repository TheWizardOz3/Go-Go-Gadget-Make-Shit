/**
 * DiffEmptyState - Empty/error state for diff view
 *
 * Handles various states: errors, file not found, no changes, etc.
 * Shows appropriate message and action buttons.
 */

import { cn } from '@/lib/cn';

interface DiffEmptyStateProps {
  /** Type of empty state to display */
  variant: 'error' | 'not-found' | 'no-changes';
  /** Error message (for error variant) */
  message?: string;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Alert circle icon for errors
 */
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

/**
 * File question mark icon for not found
 */
function FileQuestionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
      />
    </svg>
  );
}

/**
 * Checkmark icon for no changes
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * Get content for each variant
 */
function getVariantContent(variant: DiffEmptyStateProps['variant'], message?: string) {
  switch (variant) {
    case 'error':
      return {
        icon: <AlertIcon className="text-red-600 dark:text-red-400" />,
        iconBg: 'bg-red-50 dark:bg-red-950/30',
        title: 'Unable to load diff',
        message: message || 'An error occurred while loading the file diff',
      };
    case 'not-found':
      return {
        icon: <FileQuestionIcon className="text-gray-600 dark:text-gray-400" />,
        iconBg: 'bg-gray-100 dark:bg-zinc-800',
        title: 'File not found',
        message: 'The file may have been deleted or moved',
      };
    case 'no-changes':
      return {
        icon: <CheckIcon className="text-green-600 dark:text-green-400" />,
        iconBg: 'bg-green-50 dark:bg-green-950/30',
        title: 'No changes',
        message: 'This file has no changes to display',
      };
  }
}

/**
 * DiffEmptyState Component
 *
 * Displays appropriate empty state based on the situation.
 * Shows helpful messages and action buttons.
 *
 * @example
 * ```tsx
 * <DiffEmptyState
 *   variant="error"
 *   message="Failed to load diff"
 *   onRetry={() => mutate()}
 * />
 * ```
 */
export function DiffEmptyState({
  variant,
  message,
  onRetry,
  onBack,
  className,
}: DiffEmptyStateProps) {
  const content = getVariantContent(variant, message);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12 min-h-[400px]',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
          content.iconBg
        )}
      >
        {content.icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {content.title}
      </h3>

      {/* Message */}
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">{content.message}</p>

      {/* Actions */}
      <div className="flex gap-3">
        {/* Retry button (for errors) */}
        {variant === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'px-4 py-2',
              'rounded-lg',
              'bg-blue-600 text-white dark:bg-blue-500',
              'hover:bg-blue-700 dark:hover:bg-blue-600',
              'active:scale-98',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'transition-all duration-150'
            )}
            aria-label="Retry loading diff"
          >
            Retry
          </button>
        )}

        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className={cn(
              'px-4 py-2',
              'rounded-lg',
              'bg-gray-100 dark:bg-zinc-800',
              'text-gray-900 dark:text-gray-100',
              'border border-gray-300 dark:border-zinc-700',
              'hover:bg-gray-200 dark:hover:bg-zinc-700',
              'active:scale-98',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'transition-all duration-150'
            )}
            aria-label="Go back to file list"
          >
            Back to files
          </button>
        )}
      </div>
    </div>
  );
}
