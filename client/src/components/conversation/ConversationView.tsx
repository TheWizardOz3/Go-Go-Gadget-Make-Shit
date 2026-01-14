/**
 * ConversationView - Main conversation container
 *
 * Handles data fetching, loading/error states, scroll container,
 * auto-scroll behavior, and pull-to-refresh.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useConversation } from '@/hooks/useConversation';
import { useSendPrompt } from '@/hooks/useSendPrompt';
import { useStopAgent } from '@/hooks/useStopAgent';
import { useTemplates } from '@/hooks/useTemplates';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { MessageList } from './MessageList';
import { EmptyState } from './EmptyState';
import { JumpToLatest } from './JumpToLatest';
import { PullToRefresh } from './PullToRefresh';
import { PromptInput } from './PromptInput';
import { TemplateChips, TemplateChipsSkeleton } from './TemplateChips';

interface ConversationViewProps {
  /** Session ID to load conversation for */
  sessionId: string | null;
  /** Encoded project path for loading templates */
  encodedPath: string | null;
  /** Additional CSS classes */
  className?: string;
}

/** Threshold in pixels for considering "near bottom" */
const SCROLL_THRESHOLD = 150;

/** Threshold in pixels for triggering pull-to-refresh */
const PULL_THRESHOLD = 80;

export function ConversationView({ sessionId, encodedPath, className }: ConversationViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const prevMessageCountRef = useRef(0);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // External value for PromptInput (from template selection)
  const [externalInputValue, setExternalInputValue] = useState<string | undefined>(undefined);

  const { messages, status, isLoading, error, refresh, isValidating } = useConversation(sessionId);
  const { sendPrompt, isSending } = useSendPrompt(sessionId);
  const { stopAgent, isStopping } = useStopAgent(sessionId);
  const { templates, isLoading: templatesLoading } = useTemplates(encodedPath);

  // Toast state for showing "Agent stopped" message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /**
   * Handle template selection - sets input value
   */
  const handleTemplateSelect = useCallback((prompt: string) => {
    setExternalInputValue(prompt);
  }, []);

  /**
   * Clear external value after it's been applied
   * This allows the PromptInput to manage its own state after template insertion
   */
  const handleInputValueChange = useCallback(() => {
    // Clear external value so user can edit freely
    setExternalInputValue(undefined);
  }, []);

  /**
   * Scroll to the bottom of the conversation
   */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setUserScrolledUp(false);
  }, []);

  /**
   * Handle scroll events to detect when user scrolls up
   */
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // User is "scrolled up" if they're more than threshold from bottom
    setUserScrolledUp(distanceFromBottom > SCROLL_THRESHOLD);
  }, []);

  /**
   * Auto-scroll when new messages arrive (if user hasn't scrolled up)
   */
  useEffect(() => {
    const messageCount = messages?.length ?? 0;
    const prevCount = prevMessageCountRef.current;

    // Only auto-scroll if:
    // 1. We have messages
    // 2. Message count increased (new messages arrived)
    // 3. User hasn't manually scrolled up
    if (messageCount > 0 && messageCount > prevCount && !userScrolledUp) {
      // Use instant scroll on initial load, smooth after
      const behavior = prevCount === 0 ? 'instant' : 'smooth';
      scrollToBottom(behavior as ScrollBehavior);
    }

    prevMessageCountRef.current = messageCount;
  }, [messages?.length, userScrolledUp, scrollToBottom]);

  /**
   * Reset scroll state when session changes
   */
  useEffect(() => {
    setUserScrolledUp(false);
    prevMessageCountRef.current = 0;
  }, [sessionId]);

  /**
   * Handle touch start for pull-to-refresh
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const container = scrollContainerRef.current;
      if (!container || isRefreshing) return;

      // Only enable pull-to-refresh when scrolled to top
      if (container.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [isRefreshing]
  );

  /**
   * Handle touch move for pull-to-refresh
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      // Only pull when at the top
      if (container.scrollTop > 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      // Only allow pulling down
      if (distance > 0) {
        // Apply resistance (pull distance = actual distance * 0.5)
        setPullDistance(distance * 0.5);

        // Prevent default scroll behavior when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    },
    [isRefreshing]
  );

  /**
   * Handle touch end for pull-to-refresh
   */
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    // If pulled past threshold, trigger refresh
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);

      try {
        await refresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // Reset pull distance with animation
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, refresh]);

  /**
   * Handle sending a prompt
   */
  const handleSend = useCallback(
    async (prompt: string) => {
      const success = await sendPrompt(prompt);
      if (success) {
        // Scroll to bottom after a short delay to allow for UI update
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
    },
    [sendPrompt, scrollToBottom]
  );

  /**
   * Handle stopping the agent
   */
  const handleStop = useCallback(async () => {
    const success = await stopAgent();
    if (success) {
      setToastMessage('Agent stopped');
    }
  }, [stopAgent]);

  /**
   * Auto-dismiss toast after 3 seconds
   */
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // No session selected
  if (!sessionId) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="No session selected"
            message="Select a project and session to view the conversation."
          />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex-1 overflow-hidden">
          <ConversationSkeleton />
        </div>
        <PromptInput
          onSend={handleSend}
          isSending={isSending}
          disabled
          status={status}
          onStop={handleStop}
          isStopping={isStopping}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex-1 flex items-center justify-center">
          <ErrorState
            title="Failed to load conversation"
            message={error.message || 'Unable to fetch messages. Please try again.'}
            onRetry={() => refresh()}
          />
        </div>
        <PromptInput
          onSend={handleSend}
          isSending={isSending}
          disabled
          status={status}
          onStop={handleStop}
          isStopping={isStopping}
        />
      </div>
    );
  }

  // Empty conversation - allow sending first message
  if (!messages || messages.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState title="No messages yet" message="Send a message to start the conversation." />
        </div>
        {/* Template chips */}
        {templatesLoading ? (
          <TemplateChipsSkeleton />
        ) : templates && templates.length > 0 ? (
          <TemplateChips
            templates={templates}
            onSelect={handleTemplateSelect}
            disabled={status === 'working'}
          />
        ) : null}
        <PromptInput
          onSend={handleSend}
          isSending={isSending}
          disabled={status === 'working'}
          status={status}
          onStop={handleStop}
          isStopping={isStopping}
          externalValue={externalInputValue}
          onValueChange={handleInputValueChange}
        />
      </div>
    );
  }

  // Main conversation view
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Messages area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Pull-to-refresh indicator */}
        <PullToRefresh
          pullDistance={pullDistance}
          threshold={PULL_THRESHOLD}
          isRefreshing={isRefreshing || isValidating}
        />

        {/* Scrollable container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={cn(
            'absolute inset-0 overflow-y-auto overflow-x-hidden',
            'scrollbar-hide',
            // Add top padding when pulling to make room for indicator
            pullDistance > 0 && 'transition-transform'
          )}
          style={{
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          }}
        >
          {/* Status indicator at top */}
          {status && (
            <div className="sticky top-0 z-10 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-text-primary/5">
              <StatusBadge status={status} isRefreshing={isRefreshing || isValidating} />
            </div>
          )}

          {/* Messages */}
          <MessageList messages={messages} />

          {/* Scroll anchor for auto-scroll */}
          <div ref={messagesEndRef} className="h-px" />
        </div>

        {/* Jump to latest button (appears when scrolled up) */}
        <JumpToLatest
          visible={userScrolledUp && !isRefreshing}
          onClick={() => scrollToBottom('smooth')}
        />
      </div>

      {/* Template chips */}
      {templatesLoading ? (
        <TemplateChipsSkeleton />
      ) : templates && templates.length > 0 ? (
        <TemplateChips
          templates={templates}
          onSelect={handleTemplateSelect}
          disabled={status === 'working'}
        />
      ) : null}

      {/* Prompt input */}
      <PromptInput
        onSend={handleSend}
        isSending={isSending}
        disabled={status === 'working'}
        status={status}
        onStop={handleStop}
        isStopping={isStopping}
        externalValue={externalInputValue}
        onValueChange={handleInputValueChange}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-surface border border-text-primary/10 rounded-lg shadow-lg text-sm text-text-primary animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

/**
 * Status badge showing current session state
 */
function StatusBadge({
  status,
  isRefreshing = false,
}: {
  status: 'working' | 'waiting' | 'idle';
  isRefreshing?: boolean;
}) {
  const config = {
    working: {
      label: 'Working',
      className: 'bg-working/10 text-working border-working/30',
      dot: 'bg-working animate-pulse',
    },
    waiting: {
      label: 'Waiting for input',
      className: 'bg-success/10 text-success border-success/30',
      dot: 'bg-success',
    },
    idle: {
      label: 'Idle',
      className: 'bg-text-muted/10 text-text-muted border-text-muted/30',
      dot: 'bg-text-muted',
    },
  };

  const { label, className, dot } = config[status];

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border',
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
        {label}
      </span>

      {/* Refresh indicator */}
      {isRefreshing && (
        <span className="text-xs text-text-muted flex items-center gap-1.5">
          <svg
            className="w-3 h-3 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Syncing
        </span>
      )}
    </div>
  );
}
