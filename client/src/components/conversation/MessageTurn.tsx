/**
 * MessageTurn - Individual message display (Cursor-style layout)
 *
 * Displays a single user or assistant message with header and content.
 */

import Markdown from 'react-markdown';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/formatters';
import { markdownComponents } from '@/lib/markdown';
import { ToolUseCard } from './ToolUseCard';
import type { MessageSerialized } from '@shared/types';

interface MessageTurnProps {
  /** The message to display */
  message: MessageSerialized;
  /** Additional CSS classes */
  className?: string;
}

/**
 * User icon - simple circle with U
 */
function UserIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-user-bg border border-user-border text-accent font-semibold text-xs',
        className
      )}
    >
      U
    </div>
  );
}

/**
 * Claude icon - stylized C
 */
function ClaudeIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-accent/15 text-accent font-semibold text-xs',
        className
      )}
    >
      C
    </div>
  );
}

/**
 * Message header with icon, sender label, and timestamp
 */
function MessageHeader({ type, timestamp }: { type: 'user' | 'assistant'; timestamp: string }) {
  const isUser = type === 'user';

  return (
    <div className="flex items-center gap-2 mb-1.5">
      {/* Icon */}
      {isUser ? <UserIcon className="h-5 w-5" /> : <ClaudeIcon className="h-5 w-5" />}

      {/* Sender label */}
      <span className={cn('text-xs font-semibold', isUser ? 'text-accent' : 'text-accent')}>
        {isUser ? 'You' : 'Claude'}
      </span>

      {/* Timestamp */}
      <span className="text-[10px] text-text-muted">{formatRelativeTime(timestamp)}</span>
    </div>
  );
}

/**
 * MessageTurn component - displays a single message turn
 *
 * @example
 * ```tsx
 * <MessageTurn message={message} />
 * ```
 */
export function MessageTurn({ message, className }: MessageTurnProps) {
  const isUser = message.type === 'user';
  const hasContent =
    typeof message.content === 'string'
      ? message.content.trim().length > 0
      : Boolean(message.content);

  return (
    <div
      className={cn(
        'px-3 py-2.5',
        // User messages have subtle accent styling
        isUser && 'bg-user-bg border-l-2 border-user-border',
        // Assistant messages have clean background
        !isUser && 'bg-transparent',
        className
      )}
    >
      {/* Header: icon + label + timestamp */}
      <MessageHeader type={message.type} timestamp={message.timestamp} />

      {/* Content */}
      <div className="pl-7">
        {/* Message content with markdown rendering */}
        {hasContent && (
          <div className="text-sm text-text-primary break-words leading-relaxed">
            <Markdown components={markdownComponents}>
              {typeof message.content === 'string' ? message.content : String(message.content)}
            </Markdown>
          </div>
        )}

        {/* Tool use cards */}
        {message.toolUse && message.toolUse.length > 0 && (
          <div className={cn('space-y-1.5', hasContent && 'mt-2')}>
            {message.toolUse.map((tool, index) => (
              <ToolUseCard key={`${tool.tool}-${index}`} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
