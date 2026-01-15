/**
 * DiffHeader - Header for diff view
 *
 * Sticky header with back button, file path, and menu button.
 * File path truncates on small screens but shows full path on tap.
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';

interface DiffHeaderProps {
  /** File path to display */
  filePath: string;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Callback when menu button is clicked (optional, for future use) */
  onMenuClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Back arrow icon
 */
function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-6 w-6', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * Menu icon (three dots)
 */
function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-6 w-6', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
      />
    </svg>
  );
}

/**
 * DiffHeader Component
 *
 * Sticky header for the diff view with navigation and file info.
 * The file path truncates with ellipsis on small screens, tap to see full path in a tooltip.
 *
 * @example
 * ```tsx
 * <DiffHeader
 *   filePath="src/components/App.tsx"
 *   onBack={() => navigate(-1)}
 * />
 * ```
 */
export function DiffHeader({ filePath, onBack, onMenuClick, className }: DiffHeaderProps) {
  const [showFullPath, setShowFullPath] = useState(false);

  return (
    <header
      className={cn(
        // Sticky positioning
        'sticky top-0 z-40',
        // Layout
        'flex items-center gap-3 px-4 py-3',
        // Styling
        'bg-white dark:bg-zinc-900',
        'border-b border-gray-200 dark:border-zinc-800',
        // Shadow for depth
        'shadow-sm',
        className
      )}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className={cn(
          // Size - 44x44px minimum touch target
          'h-11 w-11 flex-shrink-0',
          // Center content
          'flex items-center justify-center',
          // Styling
          'rounded-lg',
          'text-gray-700 dark:text-gray-300',
          // Hover state
          'hover:bg-gray-100 dark:hover:bg-zinc-800',
          // Active state
          'active:scale-95',
          // Focus state
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          // Transition
          'transition-all duration-150'
        )}
        aria-label="Go back"
      >
        <BackIcon />
      </button>

      {/* File path */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => setShowFullPath(!showFullPath)}
          className={cn(
            // Full width
            'w-full',
            // Text alignment
            'text-left',
            // Truncation (when not showing full path)
            !showFullPath && 'truncate',
            // Word break for long paths (when showing full path)
            showFullPath && 'break-all',
            // Styling
            'text-sm font-medium text-gray-900 dark:text-gray-100',
            // Font
            'font-mono',
            // Hover state
            'hover:text-blue-600 dark:hover:text-blue-400',
            // Transition
            'transition-colors duration-150'
          )}
          title={showFullPath ? undefined : filePath}
          aria-label={`File path: ${filePath}. Click to ${showFullPath ? 'collapse' : 'expand'}.`}
        >
          {filePath}
        </button>
      </div>

      {/* Menu button (for future actions) */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className={cn(
            // Size - 44x44px minimum touch target
            'h-11 w-11 flex-shrink-0',
            // Center content
            'flex items-center justify-center',
            // Styling
            'rounded-lg',
            'text-gray-700 dark:text-gray-300',
            // Hover state
            'hover:bg-gray-100 dark:hover:bg-zinc-800',
            // Active state
            'active:scale-95',
            // Focus state
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            // Transition
            'transition-all duration-150'
          )}
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
      )}
    </header>
  );
}
