/**
 * DiffContent - Container for diff lines
 *
 * Renders all hunks and lines in a diff with proper line number tracking.
 * Supports vertical scrolling for viewing large files.
 * Shows warning for very large files with option to load anyway.
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { FileDiff } from '@shared/types';
import { DiffLine } from './DiffLine';

interface DiffContentProps {
  /** The file diff data */
  diff: FileDiff;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Warning icon
 */
function WarningIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

/**
 * DiffContent Component
 *
 * Main container that renders all diff hunks and lines.
 * Iterates through hunks, tracks line numbers, and renders each line with DiffLine component.
 *
 * Performance features:
 * - Shows warning for files with 5000+ lines
 * - Requires user confirmation to render very large files
 * - Can be enhanced with virtualization (react-window) for better performance
 *
 * @example
 * ```tsx
 * <DiffContent diff={fileDiff} />
 * ```
 */
export function DiffContent({ diff, className }: DiffContentProps) {
  const { hunks, isBinary, isTooBig } = diff;
  const [confirmedLoad, setConfirmedLoad] = useState(false);

  // Count total lines for display
  const totalLines = hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0);

  // Don't render content for binary files
  if (isBinary) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-gray-500', className)}>
        <p>Binary file - content cannot be displayed</p>
      </div>
    );
  }

  // No hunks means no changes (edge case)
  if (hunks.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-gray-500', className)}>
        <p>No changes to display</p>
      </div>
    );
  }

  // Large file warning (files with 5000+ lines or marked as too big)
  const isLargeFile = isTooBig || totalLines > 5000;

  if (isLargeFile && !confirmedLoad) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          'bg-white dark:bg-zinc-950',
          className
        )}
      >
        {/* Warning icon */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-950/30">
          <WarningIcon className="text-yellow-600 dark:text-yellow-500" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Large File</h3>

        {/* Message */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 max-w-md">
          This file has <strong>{totalLines.toLocaleString()} lines</strong> of changes.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          Rendering may be slow on mobile devices.
        </p>

        {/* Load button */}
        <button
          onClick={() => setConfirmedLoad(true)}
          className={cn(
            'px-6 py-2',
            'rounded-lg',
            'bg-blue-600 text-white dark:bg-blue-500',
            'hover:bg-blue-700 dark:hover:bg-blue-600',
            'active:scale-98',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-all duration-150'
          )}
          aria-label={`Load file with ${totalLines} lines`}
        >
          Load anyway
        </button>

        {/* Performance tip */}
        <p className="text-xs text-gray-500 dark:text-gray-600 mt-4 max-w-md">
          Tip: Use pinch-to-zoom to read small text
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Container with vertical scroll
        'overflow-y-auto overflow-x-hidden',
        // Full height available
        'h-full w-full',
        // Background
        'bg-white dark:bg-zinc-950',
        className
      )}
    >
      {/* Performance warning for large files that were confirmed */}
      {isLargeFile && (
        <div className="sticky top-0 z-10 bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-900 px-4 py-2">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm">
            <WarningIcon className="h-5 w-5 flex-shrink-0" />
            <p>Large file ({totalLines.toLocaleString()} lines). Scrolling may be slow.</p>
          </div>
        </div>
      )}

      {/* Render all hunks */}
      {hunks.map((hunk, hunkIndex) => (
        <div key={`hunk-${hunkIndex}`} className="border-b border-gray-200 dark:border-zinc-800">
          {/* Hunk header - optional, can be hidden for cleaner look */}
          {/* 
          <div className="bg-gray-100 dark:bg-zinc-900 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 font-mono">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>
          */}

          {/* Render all lines in this hunk */}
          {hunk.lines.map((line, lineIndex) => (
            <DiffLine key={`hunk-${hunkIndex}-line-${lineIndex}`} line={line} />
          ))}
        </div>
      ))}
    </div>
  );
}
