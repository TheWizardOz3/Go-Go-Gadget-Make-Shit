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
 * User icon - simple user silhouette
 */
function UserIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-accent/20 text-accent',
        className
      )}
    >
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
      </svg>
    </div>
  );
}

/**
 * Claude icon - sparkle/star shape
 */
function ClaudeIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-working/20 text-working',
        className
      )}
    >
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </div>
  );
}

/**
 * Message header with icon, sender label, and timestamp
 */
function MessageHeader({ type, timestamp }: { type: 'user' | 'assistant'; timestamp: string }) {
  const isUser = type === 'user';

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* Icon */}
      {isUser ? <UserIcon className="h-6 w-6" /> : <ClaudeIcon className="h-6 w-6" />}

      {/* Sender label */}
      <span className="text-sm font-semibold text-text-primary">{isUser ? 'You' : 'Claude'}</span>

      {/* Timestamp */}
      <span className="text-xs text-text-muted">{formatRelativeTime(timestamp)}</span>
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

  return (
    <div
      className={cn(
        'px-4 py-4',
        // User messages have a subtle left border accent
        isUser && 'border-l-2 border-accent/40 bg-accent/5',
        // Assistant messages have default background
        !isUser && 'bg-transparent',
        className
      )}
    >
      {/* Header: icon + label + timestamp */}
      <MessageHeader type={message.type} timestamp={message.timestamp} />

      {/* Content */}
      <div className="pl-8">
        {/* Message content with markdown rendering */}
        <div className="text-text-primary break-words">
          <Markdown components={markdownComponents}>
            {typeof message.content === 'string' ? message.content : String(message.content)}
          </Markdown>
        </div>

        {/* Tool use cards */}
        {message.toolUse && message.toolUse.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.toolUse.map((tool, index) => (
              <ToolUseCard key={`${tool.tool}-${index}`} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
