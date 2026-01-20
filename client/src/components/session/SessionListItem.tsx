/**
 * SessionListItem - Individual session row for session picker
 *
 * Displays session preview, last activity, message count with touch-friendly sizing.
 * Shows cloud/local badge for merged sessions.
 */

import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/formatters';
import { SessionSourceBadge } from './SessionSourceBadge';
import type { MergedSessionSummary } from '@/hooks/useSessions';

interface SessionListItemProps {
  /** The session to display (supports both local and cloud sessions) */
  session: MergedSessionSummary;
  /** Whether this session is currently selected */
  isSelected: boolean;
  /** Callback when session is selected */
  onSelect: (sessionId: string) => void;
  /** Callback to continue session in opposite environment */
  onContinueIn?: (sessionId: string, targetEnvironment: 'local' | 'cloud') => void;
  /** Whether context continuation is enabled (requires cloud to be available) */
  showContinueAction?: boolean;
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
 * Chat bubble icon for local session
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
 * Cloud icon for cloud session
 */
function CloudChatIcon({ className }: { className?: string }) {
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
        d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
      />
    </svg>
  );
}

/**
 * Arrow right icon for "Continue in..." action
 */
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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
  onContinueIn,
  showContinueAction = false,
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

  const handleContinueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onContinueIn) {
      // Continue in the opposite environment
      const targetEnvironment = session.source === 'cloud' ? 'local' : 'cloud';
      onContinueIn(session.id, targetEnvironment);
    }
  };

  // Display preview or fallback text
  const displayPreview =
    session.preview || (session.source === 'cloud' ? 'Cloud session' : 'Empty session');
  const hasPreview = session.preview !== null;
  const isCloud = session.source === 'cloud';

  // Choose icon based on source
  const SessionIcon = isCloud ? CloudChatIcon : ChatBubbleIcon;

  // Target environment for continuation
  const targetEnv = isCloud ? 'local' : 'cloud';
  const continueLabel = isCloud ? 'Continue locally' : 'Continue in cloud';

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
      {/* Session icon - changes based on source */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg',
          isSelected
            ? 'bg-accent/20 text-accent'
            : isCloud
              ? 'bg-violet-500/10 text-violet-400'
              : 'bg-text-primary/5 text-text-muted'
        )}
      >
        <SessionIcon />
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0">
        {/* Preview text with source badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'line-clamp-1 flex-1',
              isSelected ? 'text-accent' : 'text-text-primary',
              !hasPreview && 'italic text-text-muted'
            )}
          >
            {displayPreview}
          </span>
          {/* Source badge - show for both sources for clear distinction in merged lists */}
          <SessionSourceBadge source={session.source} size="sm" />
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
          {/* Show project name for cloud sessions if available */}
          {isCloud && session.projectName && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-xs text-text-muted truncate max-w-[100px]">
                {session.projectName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Continue in... button */}
      {showContinueAction && onContinueIn && (
        <button
          type="button"
          onClick={handleContinueClick}
          className={cn(
            'flex-shrink-0 p-2 rounded-lg min-w-[40px] min-h-[40px]',
            'flex items-center justify-center gap-1',
            'text-xs font-medium',
            targetEnv === 'cloud'
              ? 'text-violet-400 hover:bg-violet-500/10'
              : 'text-emerald-400 hover:bg-emerald-500/10',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
          )}
          title={continueLabel}
          aria-label={continueLabel}
        >
          <ArrowRightIcon />
          {targetEnv === 'cloud' ? (
            <CloudChatIcon className="h-4 w-4" />
          ) : (
            <ChatBubbleIcon className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <div className="flex-shrink-0 text-accent">
          <CheckIcon />
        </div>
      )}
    </button>
  );
}
