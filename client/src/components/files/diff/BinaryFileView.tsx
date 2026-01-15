/**
 * BinaryFileView - Display message for binary files
 *
 * Shows a friendly message when trying to view a binary file diff,
 * along with an icon and the ability to go back.
 */

import { cn } from '@/lib/cn';

interface BinaryFileViewProps {
  /** File path */
  filePath: string;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * File icon for binary files
 */
function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-16 w-16', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-6.75 0v1.5a1.125 1.125 0 01-2.25 0v-1.5a5.625 5.625 0 0111.25 0v.225M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * BinaryFileView Component
 *
 * Displayed when the file is binary and cannot show a text diff.
 * Provides clear messaging and navigation back to the file list.
 *
 * @example
 * ```tsx
 * <BinaryFileView
 *   filePath="assets/logo.png"
 *   onBack={() => navigate(-1)}
 * />
 * ```
 */
export function BinaryFileView({ filePath, onBack, className }: BinaryFileViewProps) {
  return (
    <div
      className={cn(
        // Center content
        'flex flex-col items-center justify-center',
        // Full height
        'min-h-[400px] p-8',
        // Background
        'bg-white dark:bg-zinc-950',
        className
      )}
    >
      {/* File type icon */}
      <div className="mb-6">
        <FileIcon className="text-gray-400 dark:text-gray-600" />
      </div>

      {/* Message */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Binary File</h2>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
        Cannot display diff for binary files
      </p>

      {/* File path */}
      <p className="text-sm font-mono text-gray-700 dark:text-gray-300 mb-6 break-all max-w-md text-center">
        {filePath}
      </p>

      {/* Back button */}
      <button
        onClick={onBack}
        className={cn(
          // Size
          'px-6 py-2',
          // Styling
          'rounded-lg',
          'bg-gray-100 dark:bg-zinc-800',
          'text-gray-900 dark:text-gray-100',
          'border border-gray-300 dark:border-zinc-700',
          // Hover/active states
          'hover:bg-gray-200 dark:hover:bg-zinc-700',
          'active:scale-98',
          // Focus
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          // Transition
          'transition-all duration-150'
        )}
        aria-label="Go back to file list"
      >
        Back to files
      </button>
    </div>
  );
}
