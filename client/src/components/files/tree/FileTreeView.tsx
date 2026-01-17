/**
 * FileTreeView - Main container for browsing project files
 *
 * Displays a tree view of committed project files and allows viewing
 * file contents with syntax highlighting. Supports GitHub links.
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useFileTree } from '@/hooks/useFileTree';
import { useFileContent } from '@/hooks/useFileContent';
import { ErrorState } from '@/components/ui/ErrorState';
import { FileTreeNode } from './FileTreeNode';
import { FileContentView } from './FileContentView';
import type { FileTreeEntry } from '@shared/types';

interface FileTreeViewProps {
  /** Encoded project path to fetch files for */
  encodedPath: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading spinner
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Folder icon for empty state
 */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-12 w-12', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

/**
 * External link icon for GitHub
 */
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

/**
 * Empty state when no project is selected
 */
function NoProjectState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <FolderIcon className="text-text-muted mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">No Project Selected</h3>
      <p className="text-sm text-text-muted">Select a project to browse its files.</p>
    </div>
  );
}

/**
 * Empty state when tree has no files
 */
function EmptyTreeState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <FolderIcon className="text-text-muted mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">No Files Found</h3>
      <p className="text-sm text-text-muted">This project has no committed files.</p>
    </div>
  );
}

/**
 * Loading state skeleton
 */
function TreeLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <LoadingSpinner className="text-accent mb-4" />
      <p className="text-sm text-text-muted">Loading files...</p>
    </div>
  );
}

/**
 * Count total files in tree
 */
function countFiles(entries: FileTreeEntry[]): number {
  return entries.reduce((count, entry) => {
    if (entry.type === 'file') return count + 1;
    if (entry.children) return count + countFiles(entry.children);
    return count;
  }, 0);
}

/**
 * FileTreeView component - main container for file browsing
 *
 * @example
 * ```tsx
 * <FileTreeView encodedPath={project.encodedPath} />
 * ```
 */
export function FileTreeView({ encodedPath, className }: FileTreeViewProps) {
  // Selected file path (null = show tree, string = show content)
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Fetch tree data
  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError,
    refresh: refreshTree,
  } = useFileTree(encodedPath);

  // Fetch file content (only when a file is selected)
  const {
    data: fileContent,
    isLoading: contentLoading,
    error: contentError,
  } = useFileContent(encodedPath, selectedFile);

  // Handle file selection
  const handleSelectFile = useCallback((path: string) => {
    setSelectedFile(path);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // No project selected
  if (!encodedPath) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <NoProjectState />
      </div>
    );
  }

  // Show file content view when a file is selected
  if (selectedFile) {
    return (
      <div className={cn('flex flex-col flex-1 overflow-hidden', className)}>
        <FileContentView
          file={
            fileContent ?? {
              path: selectedFile,
              name: selectedFile.split('/').pop() ?? selectedFile,
              extension: null,
              language: 'text',
              content: '',
              lineCount: 0,
              githubUrl: null,
            }
          }
          onBack={handleBack}
          isLoading={contentLoading}
          error={contentError?.message}
        />
      </div>
    );
  }

  // Loading state
  if (treeLoading) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <TreeLoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (treeError) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <div className="flex-1 flex items-center justify-center">
          <ErrorState
            title="Failed to load files"
            message={treeError.message || 'Unable to fetch project files. Please try again.'}
            onRetry={() => refreshTree()}
          />
        </div>
      </div>
    );
  }

  // Empty state
  if (!treeData || treeData.entries.length === 0) {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <EmptyTreeState />
      </div>
    );
  }

  const fileCount = countFiles(treeData.entries);

  return (
    <div className={cn('flex flex-col flex-1 overflow-hidden', className)}>
      {/* Header with file count and GitHub link */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-text-secondary">
          {fileCount} {fileCount === 1 ? 'file' : 'files'}
        </h2>

        {treeData.githubUrl && (
          <a
            href={treeData.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1.5 text-xs text-text-muted',
              'hover:text-accent transition-colors'
            )}
          >
            <ExternalLinkIcon />
            <span>View on GitHub</span>
          </a>
        )}
      </div>

      {/* Scrollable file tree */}
      <div className="flex-1 overflow-y-auto" role="tree" aria-label="Project files">
        {treeData.entries.map((entry) => (
          <FileTreeNode key={entry.path} entry={entry} depth={0} onSelectFile={handleSelectFile} />
        ))}
      </div>
    </div>
  );
}
