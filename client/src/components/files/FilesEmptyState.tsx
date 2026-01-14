/**
 * FilesEmptyState - Empty state for files changed view
 *
 * Shows a friendly message when there are no file changes to display.
 */

import { cn } from '@/lib/cn';

interface FilesEmptyStateProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Folder with checkmark icon
 */
function FolderCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      {/* Folder shape */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
      {/* Checkmark inside */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
    </svg>
  );
}

/**
 * FilesEmptyState component - displays when no files have been changed
 *
 * @example
 * ```tsx
 * <FilesEmptyState />
 * ```
 */
export function FilesEmptyState({ className }: FilesEmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}
    >
      {/* Empty state icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <FolderCheckIcon className="text-success" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-1">No files changed</h3>

      {/* Message */}
      <p className="text-sm text-text-secondary max-w-xs">Claude has not modified any files yet</p>
    </div>
  );
}
