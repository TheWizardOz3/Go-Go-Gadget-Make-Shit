/**
 * ScheduledPromptsPanel - Full-screen modal for managing scheduled prompts
 *
 * Displays a list of all scheduled prompts with their status.
 * Slides up from bottom with dark backdrop overlay.
 * Includes add button to create new scheduled prompts.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useScheduledPrompts } from '@/hooks/useScheduledPrompts';
import { ScheduledPromptListItem } from './ScheduledPromptListItem';

interface ScheduledPromptsPanelProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback to open the add form */
  onAddNew: () => void;
  /** Callback to open the edit form with a prompt */
  onEdit: (prompt: import('@/hooks/useScheduledPrompts').ScheduledPrompt) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Close icon (X)
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-6 w-6', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Plus icon for add button
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

/**
 * Calendar/Clock icon for empty state
 */
function CalendarClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-8 w-8', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
      />
    </svg>
  );
}

/**
 * Empty state when no scheduled prompts exist
 */
function EmptyState({ onAddNew }: { onAddNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
        <CalendarClockIcon className="text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">No scheduled prompts</h3>
      <p className="text-sm text-text-secondary max-w-xs mb-6">
        Schedule prompts to run automatically at specific times — daily standup, weekly reviews,
        monthly reports.
      </p>
      <button
        type="button"
        onClick={onAddNew}
        className={cn(
          'inline-flex items-center gap-2',
          'px-4 py-2.5 rounded-lg',
          'bg-accent text-white font-medium',
          'hover:bg-accent/90 active:bg-accent/80',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
        )}
      >
        <PlusIcon />
        <span>Create Your First Schedule</span>
      </button>
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-4 py-3 border-b border-text-primary/5 animate-pulse">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="h-4 bg-text-primary/10 rounded flex-1" />
            <div className="h-6 w-11 bg-text-primary/10 rounded-full" />
          </div>
          <div className="flex gap-2 mb-1.5">
            <div className="h-5 w-24 bg-text-primary/10 rounded-full" />
            <div className="h-5 w-20 bg-text-primary/10 rounded-full" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-text-primary/10 rounded" />
            <div className="h-3 w-16 bg-text-primary/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">Failed to load</h3>
      <p className="text-sm text-text-secondary mb-4">Could not load scheduled prompts.</p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'px-4 py-2 rounded-lg',
          'bg-text-primary/10 text-text-primary font-medium',
          'hover:bg-text-primary/20',
          'transition-colors duration-150'
        )}
      >
        Try Again
      </button>
    </div>
  );
}

export function ScheduledPromptsPanel({
  isOpen,
  onClose,
  onAddNew,
  onEdit,
  className,
}: ScheduledPromptsPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { prompts, isLoading, error, refresh, togglePrompt, deletePrompt, runPrompt } =
    useScheduledPrompts();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle toggle
  const handleToggle = async (id: string) => {
    setActionInProgress(id);
    try {
      await togglePrompt(id);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled prompt?')) return;

    setActionInProgress(id);
    try {
      await deletePrompt(id);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle run now for missed prompts
  const handleRunNow = async (id: string) => {
    setActionInProgress(id);
    try {
      await runPrompt(id);
      // Optionally show a toast notification here
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        // Backdrop
        'fixed inset-0 z-50',
        'bg-black/60 backdrop-blur-sm',
        // Animation
        'animate-fade-in',
        className
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scheduled-prompts-title"
    >
      {/* Modal container */}
      <div
        ref={modalRef}
        className={cn(
          'absolute inset-x-0 bottom-0',
          'max-h-[85vh] min-h-[50vh]',
          'bg-surface rounded-t-2xl',
          'flex flex-col',
          // Animation - slide up
          'animate-slide-up',
          // Safe area for notched phones
          'safe-bottom'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-text-primary/10">
          {/* Drag handle indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-primary/20" />

          <div className="flex items-center gap-2">
            <h2 id="scheduled-prompts-title" className="text-lg font-semibold text-text-primary">
              Scheduled Prompts
            </h2>
            {prompts && prompts.length > 0 && (
              <span className="text-sm text-text-muted">({prompts.length})</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2.5 -mr-2.5 rounded-lg min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'text-text-muted hover:text-text-primary',
              'hover:bg-text-primary/5 active:bg-text-primary/10',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
            )}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Add button (always visible when we have prompts) */}
        {prompts && prompts.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-text-primary/10">
            <button
              type="button"
              onClick={onAddNew}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-3 rounded-lg',
                'bg-accent text-white font-medium',
                'hover:bg-accent/90 active:bg-accent/80',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
              )}
            >
              <PlusIcon />
              <span>Add Scheduled Prompt</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState onRetry={() => refresh()} />
          ) : !prompts || prompts.length === 0 ? (
            <EmptyState onAddNew={onAddNew} />
          ) : (
            <div className="py-2">
              {prompts.map((prompt) => (
                <ScheduledPromptListItem
                  key={prompt.id}
                  prompt={prompt}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={onEdit}
                  onRunNow={handleRunNow}
                  isLoading={actionInProgress === prompt.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
