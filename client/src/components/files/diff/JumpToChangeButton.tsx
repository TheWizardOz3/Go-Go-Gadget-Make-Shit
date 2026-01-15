/**
 * JumpToChangeButton - Floating button to navigate between changes
 *
 * Helps users quickly jump to the next addition or deletion in the diff.
 * Shows change count and hides when at the last change.
 */

import { cn } from '@/lib/cn';

interface JumpToChangeButtonProps {
  /** Total number of changes (additions + deletions) */
  totalChanges: number;
  /** Current change index (0-based) */
  currentChangeIndex: number;
  /** Callback when button is clicked */
  onJumpToNext: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Chevron Down icon for the button
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * JumpToChangeButton Component
 *
 * Floating action button positioned at the bottom-right corner.
 * Helps users navigate through changes in the diff by scrolling to the next change.
 *
 * The button is hidden when:
 * - There are no changes
 * - User is at the last change
 *
 * @example
 * ```tsx
 * <JumpToChangeButton
 *   totalChanges={5}
 *   currentChangeIndex={2}
 *   onJumpToNext={() => scrollToChange(3)}
 * />
 * ```
 */
export function JumpToChangeButton({
  totalChanges,
  currentChangeIndex,
  onJumpToNext,
  className,
}: JumpToChangeButtonProps) {
  // Hide button if no changes or at last change
  const isAtLastChange = currentChangeIndex >= totalChanges - 1;
  const shouldHide = totalChanges === 0 || isAtLastChange;

  if (shouldHide) {
    return null;
  }

  const remainingChanges = totalChanges - currentChangeIndex - 1;

  return (
    <button
      onClick={onJumpToNext}
      className={cn(
        // Fixed positioning - bottom-right corner
        'fixed bottom-6 right-6',
        // Size - minimum 48x48px touch target
        'h-12 w-auto min-w-[48px]',
        // Flexbox for content alignment
        'flex items-center gap-2 px-4',
        // Styling
        'rounded-full shadow-lg',
        'bg-blue-600 text-white dark:bg-blue-500',
        // Hover/active states
        'hover:bg-blue-700 dark:hover:bg-blue-600',
        'active:scale-95',
        // Transitions
        'transition-all duration-200',
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        // Z-index to float above content
        'z-50',
        className
      )}
      aria-label={`Jump to next change (${remainingChanges} remaining)`}
    >
      {/* Change count */}
      <span className="text-sm font-medium">
        {remainingChanges} {remainingChanges === 1 ? 'change' : 'changes'}
      </span>

      {/* Chevron icon */}
      <ChevronDownIcon />
    </button>
  );
}
