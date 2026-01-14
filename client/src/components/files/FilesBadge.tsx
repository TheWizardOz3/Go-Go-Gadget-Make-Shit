/**
 * FilesBadge - Badge showing count of changed files
 *
 * Small badge for use in navigation tabs to indicate file changes.
 * Hidden when count is 0.
 */

import { cn } from '@/lib/cn';

interface FilesBadgeProps {
  /** Number of changed files */
  count: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FilesBadge component - shows count of changed files
 *
 * @example
 * ```tsx
 * // In a tab button
 * <button>
 *   Files
 *   <FilesBadge count={filesChanged.length} />
 * </button>
 * ```
 */
export function FilesBadge({ count, className }: FilesBadgeProps) {
  // Don't render if no files changed
  if (count === 0) {
    return null;
  }

  // Format count (show 99+ for large numbers)
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[18px] h-[18px] px-1.5',
        'text-xs font-medium',
        'rounded-full',
        'bg-accent text-white',
        className
      )}
      aria-label={`${count} ${count === 1 ? 'file' : 'files'} changed`}
    >
      {displayCount}
    </span>
  );
}
