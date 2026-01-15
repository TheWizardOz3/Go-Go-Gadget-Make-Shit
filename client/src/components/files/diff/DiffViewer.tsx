/**
 * DiffViewer - Main container for diff view
 *
 * Orchestrates all diff view states and renders appropriate components.
 * Fetches diff data and handles loading, error, binary, and success states.
 */

import { useState } from 'react';
import { useFileDiff } from '@/hooks/useFileDiff';
import { DiffHeader } from './DiffHeader';
import { DiffContent } from './DiffContent';
import { DiffLoadingSkeleton } from './DiffLoadingSkeleton';
import { DiffEmptyState } from './DiffEmptyState';
import { BinaryFileView } from './BinaryFileView';
import { JumpToChangeButton } from './JumpToChangeButton';

interface DiffViewerProps {
  /** Encoded project path */
  encodedPath: string;
  /** File path relative to project root */
  filePath: string;
  /** Callback when back button is clicked */
  onBack: () => void;
}

/**
 * DiffViewer Component
 *
 * Main container that fetches and displays file diffs.
 * Handles all states: loading, error, binary files, and successful diff display.
 *
 * @example
 * ```tsx
 * <DiffViewer
 *   encodedPath="Users-me-projects-myapp"
 *   filePath="src/App.tsx"
 *   onBack={() => navigate(-1)}
 * />
 * ```
 */
export function DiffViewer({ encodedPath, filePath, onBack }: DiffViewerProps) {
  const { diff, isLoading, error, refresh } = useFileDiff(encodedPath, filePath);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <DiffHeader filePath={filePath} onBack={onBack} />
        <DiffLoadingSkeleton lines={15} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen flex-col">
        <DiffHeader filePath={filePath} onBack={onBack} />
        <DiffEmptyState variant="error" message={error.message} onRetry={refresh} onBack={onBack} />
      </div>
    );
  }

  // No diff data (shouldn't normally happen, but handle gracefully)
  if (!diff) {
    return (
      <div className="flex h-screen flex-col">
        <DiffHeader filePath={filePath} onBack={onBack} />
        <DiffEmptyState variant="not-found" onBack={onBack} />
      </div>
    );
  }

  // Binary file
  if (diff.isBinary) {
    return (
      <div className="flex h-screen flex-col">
        <DiffHeader filePath={filePath} onBack={onBack} />
        <BinaryFileView filePath={filePath} onBack={onBack} />
      </div>
    );
  }

  // No changes (edge case)
  if (diff.hunks.length === 0) {
    return (
      <div className="flex h-screen flex-col">
        <DiffHeader filePath={filePath} onBack={onBack} />
        <DiffEmptyState variant="no-changes" onBack={onBack} />
      </div>
    );
  }

  // Count total changes (additions + deletions)
  const totalChanges = diff.hunks.reduce((total, hunk) => {
    return (
      total + hunk.lines.filter((line) => line.type === 'add' || line.type === 'delete').length
    );
  }, 0);

  // Handle jump to next change
  const handleJumpToNext = () => {
    // In a full implementation, this would scroll to the next change
    // For now, just increment the index
    if (currentChangeIndex < totalChanges - 1) {
      setCurrentChangeIndex(currentChangeIndex + 1);
      // TODO: Implement actual scrolling to the next change
      // This would require refs to each DiffLine and scrollIntoView
    }
  };

  // Success state - show the diff
  return (
    <div className="flex h-screen flex-col">
      {/* Sticky header */}
      <DiffHeader filePath={filePath} onBack={onBack} />

      {/* Diff content - scrollable */}
      <div className="flex-1 overflow-hidden">
        <DiffContent diff={diff} />
      </div>

      {/* Jump to next change button - floating */}
      <JumpToChangeButton
        totalChanges={totalChanges}
        currentChangeIndex={currentChangeIndex}
        onJumpToNext={handleJumpToNext}
      />
    </div>
  );
}
