/**
 * SessionListItem - Individual session row for session picker
 *
 * Displays session preview, last activity, message count with touch-friendly sizing.
 */

import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/formatters';
import type { SessionSummarySerialized } from '@shared/types';

interface SessionListItemProps {
  /** The session to display */
  session: SessionSummarySerialized;
  /** Whether this session is currently selected */
  isSelected: boolean;
  /** Callback when session is selected */
  onSelect: (sessionId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Checkmark icon for selected state
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Chat bubble icon for session
 */
function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
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
 * SessionListItem component - displays a single session row
 *
 * @example
 * ```tsx
 * <SessionListItem
 *   session={session}
 *   isSelected={selectedSession === session.id}
 *   onSelect={handleSelectSession}
 * />
 * ```
 */
export function SessionListItem({
  session,
  isSelected,
  onSelect,
  className,
}: SessionListItemProps) {
  const handleClick = () => {
    onSelect(session.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(session.id);
    }
  };

  // Display preview or fallback text
  const displayPreview = session.preview || 'Empty session';
  const hasPreview = session.preview !== null;

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base styles
        'w-full text-left px-4 py-3 min-h-[56px]',
        'flex items-center gap-3',
        // Interactive states
        'transition-colors duration-150',
        'hover:bg-text-primary/5 active:bg-text-primary/10',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
        // Selected state
        isSelected && 'bg-accent/10',
        className
      )}
      aria-selected={isSelected}
      role="option"
      data-session={session.id}
    >
      {/* Chat bubble icon */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg',
          isSelected ? 'bg-accent/20 text-accent' : 'bg-text-primary/5 text-text-muted'
        )}
      >
        <ChatBubbleIcon />
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0">
        {/* Preview text */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'line-clamp-1',
              isSelected ? 'text-accent' : 'text-text-primary',
              !hasPreview && 'italic text-text-muted'
            )}
          >
            {displayPreview}
          </span>
        </div>

        {/* Last activity and message count */}
        <div className="flex items-center gap-2 mt-0.5">
          {session.lastActivityAt && (
            <span className="text-xs text-text-muted">
              {formatRelativeTime(session.lastActivityAt)}
            </span>
          )}
          {session.lastActivityAt && session.messageCount > 0 && (
            <span className="text-text-muted">·</span>
          )}
          {session.messageCount > 0 && (
            <span className="text-xs text-text-muted">
              {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
            </span>
          )}
        </div>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="flex-shrink-0 text-accent">
          <CheckIcon />
        </div>
      )}
    </button>
  );
}
