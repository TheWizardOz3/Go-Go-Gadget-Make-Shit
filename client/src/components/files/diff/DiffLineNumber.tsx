/**
 * DiffLineNumber - Line number gutter for diff view
 *
 * Displays line numbers with +/- indicators for added/deleted lines.
 * Uses a fixed width (6 characters) for consistent alignment.
 */

import { cn } from '@/lib/cn';
import type { DiffLineType } from '@shared/types';

interface DiffLineNumberProps {
  /** Line number to display */
  lineNumber: number | null;
  /** Type of line (context, add, delete) */
  type: DiffLineType;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format line number with proper width and indicator
 * - Context lines: "  1  "
 * - Added lines: "  3+ "
 * - Deleted lines: "  5- "
 */
function formatLineNumber(lineNumber: number | null, type: DiffLineType): string {
  if (lineNumber === null) {
    return '     '; // Empty space for lines without numbers (e.g., deleted lines in new file view)
  }

  // Convert number to string and pad to 3 characters (max 999 lines visible at once)
  const numStr = lineNumber.toString().padStart(3, ' ');

  // Add indicator based on type
  const indicator = type === 'add' ? '+' : type === 'delete' ? '-' : ' ';

  return `${numStr}${indicator}`;
}

/**
 * DiffLineNumber Component
 *
 * Renders the line number gutter for a single line in the diff view.
 * Provides visual indicators for added (+) and deleted (-) lines.
 */
export function DiffLineNumber({ lineNumber, type, className }: DiffLineNumberProps) {
  const formattedNumber = formatLineNumber(lineNumber, type);

  return (
    <div
      className={cn(
        // Base styles
        'flex-shrink-0 select-none px-2 text-right font-mono text-xs leading-[1.5]',
        // Background color - subtle separation from code
        'bg-gray-50 dark:bg-zinc-900',
        // Text color based on line type
        type === 'add' && 'text-green-600 dark:text-green-400',
        type === 'delete' && 'text-red-600 dark:text-red-400',
        type === 'context' && 'text-gray-500 dark:text-gray-600',
        // Border separator
        'border-r border-gray-200 dark:border-zinc-800',
        className
      )}
      aria-label={
        type === 'add'
          ? `Line ${lineNumber}, added`
          : type === 'delete'
            ? `Line ${lineNumber}, deleted`
            : `Line ${lineNumber}`
      }
    >
      <span className="inline-block w-[4ch]">{formattedNumber}</span>
    </div>
  );
}
