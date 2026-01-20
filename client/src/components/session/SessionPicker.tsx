/**
 * SessionPicker - Full-screen modal for selecting sessions
 *
 * Displays a list of all sessions for the current project.
 * Slides up from bottom with dark backdrop overlay.
 * Includes search functionality when > 10 sessions.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { SessionListItem } from './SessionListItem';
import type { MergedSessionSummary } from '@/hooks/useSessions';

/** Threshold for showing search input */
const SEARCH_THRESHOLD = 10;

interface SessionPickerProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of sessions to display (supports merged local + cloud sessions) */
  sessions: MergedSessionSummary[];
  /** Currently selected session ID */
  selectedSession: string | null;
  /** Callback when a session is selected */
  onSelectSession: (sessionId: string) => void;
  /** Project path for creating new sessions */
  projectPath?: string;
  /** Callback when a new session is started (triggers refresh) */
  onNewSession?: () => void;
  /** Number of local sessions included in the list */
  localCount?: number;
  /** Number of cloud sessions included in the list */
  cloudCount?: number;
  /** Callback to continue a session in a different environment */
  onContinueIn?: (sessionId: string, targetEnvironment: 'local' | 'cloud') => void;
  /** Whether to show the continue action (requires both environments available) */
  showContinueAction?: boolean;
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
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Search icon
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

/**
 * Clear/X icon for search input
 */
function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Plus icon for new session button
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

/**
 * Chat bubble icon for empty state
 */
function ChatBubbleIcon({ className }: { className?: string }) {
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
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

/**
 * Empty state when no sessions exist
 */
function EmptyState({ isSearchResult }: { isSearchResult?: boolean }) {
  if (isSearchResult) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-text-primary/5">
          <SearchIcon className="h-8 w-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">No sessions match</h3>
        <p className="text-sm text-text-secondary max-w-xs">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-text-primary/5">
        <ChatBubbleIcon className="text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">No sessions yet</h3>
      <p className="text-sm text-text-secondary max-w-xs">
        Start a conversation with Claude to create a session.
      </p>
    </div>
  );
}

/**
 * SessionPicker component - modal for selecting a session
 *
 * @example
 * ```tsx
 * <SessionPicker
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   sessions={sessions}
 *   selectedSession={selectedSession}
 *   onSelectSession={handleSelectSession}
 * />
 * ```
 */
export function SessionPicker({
  isOpen,
  onClose,
  sessions,
  selectedSession,
  onSelectSession,
  projectPath,
  onNewSession,
  localCount = 0,
  cloudCount = 0,
  onContinueIn,
  showContinueAction = false,
  className,
}: SessionPickerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Note: Session creation state removed - new sessions are created directly from ConversationView

  // Determine if search should be shown
  const showSearch = sessions.length > SEARCH_THRESHOLD;

  // Filter sessions based on search query and exclude empty sessions
  const filteredSessions = useMemo(() => {
    // First, filter out empty sessions (no messages or no preview)
    const nonEmptySessions = sessions.filter(
      (session) => session.messageCount > 0 || session.preview
    );

    if (!searchQuery.trim()) {
      return nonEmptySessions;
    }
    const query = searchQuery.toLowerCase().trim();
    return nonEmptySessions.filter((session) => session.preview?.toLowerCase().includes(query));
  }, [sessions, searchQuery]);

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

  // Focus search input when modal opens (if search is shown)
  useEffect(() => {
    if (isOpen && showSearch) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showSearch]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Scroll selected session into view when modal opens
  useEffect(() => {
    if (isOpen && selectedSession) {
      // Small delay to allow modal animation to complete
      const timer = setTimeout(() => {
        const selectedElement = document.querySelector(`[data-session="${selectedSession}"]`);
        selectedElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedSession]);

  // Handle session selection
  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle search clear
  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Handle new session creation
  const handleNewSession = () => {
    // Simply trigger the callback - the parent will clear the session selection
    // and show the "new conversation" state where the user can type their first message
    onNewSession?.();
    onClose();
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
      aria-labelledby="session-picker-title"
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

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 id="session-picker-title" className="text-lg font-semibold text-text-primary">
                Select Session
              </h2>
              {sessions.length > 0 && (
                <span className="text-sm text-text-muted">({sessions.length})</span>
              )}
            </div>
            {/* Show source breakdown when we have sessions from multiple sources */}
            {(localCount > 0 || cloudCount > 0) && (
              <div className="flex items-center gap-2 text-xs">
                {localCount > 0 && <span className="text-emerald-400">{localCount} local</span>}
                {localCount > 0 && cloudCount > 0 && <span className="text-text-muted">·</span>}
                {cloudCount > 0 && <span className="text-violet-400">{cloudCount} cloud</span>}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              // 44×44px minimum touch target: p-2.5 (10px) + h-6 (24px) + p-2.5 (10px) = 44px
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

        {/* New Session button */}
        {projectPath && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-text-primary/10">
            <button
              type="button"
              onClick={handleNewSession}
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
              <span>New Session</span>
            </button>
          </div>
        )}

        {/* Search input - only shown when > 10 sessions */}
        {showSearch && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-text-primary/10">
            <div className="relative">
              {/* Search icon */}
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <SearchIcon className="text-text-muted" />
              </div>

              {/* Input */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className={cn(
                  'w-full pl-10 pr-10 py-2.5',
                  'bg-text-primary/5 rounded-lg',
                  'text-text-primary placeholder:text-text-muted',
                  'border border-transparent',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  'transition-colors duration-150'
                )}
                aria-label="Search sessions"
              />

              {/* Clear button - 44×44px touch target */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={cn(
                    'absolute inset-y-0 right-0 w-11 flex items-center justify-center',
                    'text-text-muted hover:text-text-primary',
                    'transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset'
                  )}
                  aria-label="Clear search"
                >
                  <ClearIcon />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto overscroll-contain" role="listbox">
          {sessions.length === 0 ? (
            <EmptyState />
          ) : filteredSessions.length === 0 ? (
            <EmptyState isSearchResult />
          ) : (
            <div className="py-2">
              {filteredSessions.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  isSelected={selectedSession === session.id}
                  onSelect={handleSelectSession}
                  onContinueIn={onContinueIn}
                  showContinueAction={showContinueAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
