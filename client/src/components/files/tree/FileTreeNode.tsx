/**
 * FileTreeNode - Recursive tree node component for file browser
 *
 * Displays a file or directory with expand/collapse functionality for directories.
 * Touch-friendly with 48px minimum height for mobile use.
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { FileIcon } from './FileIcon';
import type { FileTreeEntry } from '@shared/types';

/** Indentation per tree level in pixels */
const INDENT_PX = 16;

interface FileTreeNodeProps {
  /** The tree entry to display */
  entry: FileTreeEntry;
  /** Nesting depth (0 = root level) */
  depth?: number;
  /** Callback when a file is selected */
  onSelectFile?: (path: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Chevron icon for expand/collapse
 */
function ChevronIcon({ isExpanded, className }: { isExpanded: boolean; className?: string }) {
  return (
    <svg
      className={cn(
        'h-4 w-4 transition-transform duration-150',
        isExpanded && 'rotate-90',
        className
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/**
 * FileTreeNode component - displays a single tree entry with recursive children
 *
 * @example
 * ```tsx
 * <FileTreeNode
 *   entry={{ name: 'src', path: 'src', type: 'directory', extension: null, children: [...] }}
 *   depth={0}
 *   onSelectFile={(path) => console.log('Selected:', path)}
 * />
 * ```
 */
export function FileTreeNode({ entry, depth = 0, onSelectFile, className }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDirectory = entry.type === 'directory';
  const hasChildren = isDirectory && entry.children && entry.children.length > 0;

  const handleClick = useCallback(() => {
    if (isDirectory) {
      setIsExpanded((prev) => !prev);
    } else {
      onSelectFile?.(entry.path);
    }
  }, [isDirectory, entry.path, onSelectFile]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
      // Arrow keys for tree navigation
      if (isDirectory) {
        if (e.key === 'ArrowRight' && !isExpanded) {
          e.preventDefault();
          setIsExpanded(true);
        } else if (e.key === 'ArrowLeft' && isExpanded) {
          e.preventDefault();
          setIsExpanded(false);
        }
      }
    },
    [handleClick, isDirectory, isExpanded]
  );

  return (
    <div className={className} role="treeitem" aria-expanded={isDirectory ? isExpanded : undefined}>
      {/* Node row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles - 48px min height for touch target
          'w-full flex items-center gap-2 min-h-[48px] px-3 py-2',
          'cursor-pointer select-none',
          // Interactive states
          'transition-colors duration-150',
          'hover:bg-text-primary/5 active:bg-text-primary/10',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset'
        )}
        style={{ paddingLeft: `${12 + depth * INDENT_PX}px` }}
        aria-label={`${isDirectory ? 'Folder' : 'File'}: ${entry.name}`}
      >
        {/* Expand/collapse chevron (directories only) */}
        <div className="flex-shrink-0 w-4 flex items-center justify-center">
          {isDirectory ? (
            <ChevronIcon isExpanded={isExpanded} className="text-text-muted" />
          ) : (
            <span className="w-4" aria-hidden="true" />
          )}
        </div>

        {/* File/folder icon */}
        <FileIcon
          name={entry.name}
          type={entry.type}
          isExpanded={isExpanded}
          className="flex-shrink-0"
        />

        {/* File/folder name */}
        <span className="flex-1 min-w-0 truncate text-text-primary text-sm">{entry.name}</span>
      </div>

      {/* Children (expanded directories only) */}
      {isDirectory && isExpanded && hasChildren && (
        <div role="group" aria-label={`Contents of ${entry.name}`}>
          {entry.children!.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
