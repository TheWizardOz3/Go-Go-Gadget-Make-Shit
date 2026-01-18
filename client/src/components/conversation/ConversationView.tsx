/**
 * ConversationView - Main conversation container
 *
 * Handles data fetching, loading/error states, scroll container,
 * auto-scroll behavior, and pull-to-refresh.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { debugLog } from '@/lib/debugLog';
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
import { CloudJobPending } from './CloudJobPending';

interface ConversationViewProps {
  /** Session ID to load conversation for */
  sessionId: string | null;
  /** Encoded project path for loading templates */
  encodedPath: string | null;
  /** Project path (decoded) for creating new sessions */
  projectPath?: string;
  /** Project name for cloud execution */
  projectName?: string;
  /** Git remote URL for cloud execution */
  gitRemoteUrl?: string;
  /** Callback when a new session is started with the user's first message */
  onNewSessionStarted?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/** Threshold in pixels for considering "near bottom" */
const SCROLL_THRESHOLD = 150;

/** Threshold in pixels for triggering pull-to-refresh */
const PULL_THRESHOLD = 80;

export function ConversationView({
  sessionId,
  encodedPath,
  projectPath,
  projectName,
  gitRemoteUrl,
  onNewSessionStarted,
  className,
}: ConversationViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const prevMessageCountRef = useRef(0);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Text to insert into PromptInput (from template selection)
  const [textToInsert, setTextToInsert] = useState<string | undefined>(undefined);

  const { messages, status, isLoading, error, refresh, isValidating } = useConversation(sessionId);
  // Pass cloud options from project's git remote URL for automatic cloud execution
  const cloudOptions =
    gitRemoteUrl && projectName ? { repoUrl: gitRemoteUrl, projectName } : undefined;
  const { sendPromptAdvanced, isSending } = useSendPrompt(sessionId, cloudOptions);
  const { stopAgent, isStopping } = useStopAgent(sessionId);
  const { templates, isLoading: templatesLoading } = useTemplates(encodedPath);

  // Toast state for showing messages (info or error)
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' } | null>(null);

  // State for creating new session
  const [isStartingNewSession, setIsStartingNewSession] = useState(false);

  // State for pending cloud job (shows loading UI while job runs)
  const [pendingCloudJob, setPendingCloudJob] = useState<{
    jobId: string;
    prompt: string;
  } | null>(null);

  /**
   * Handle starting a new session with the user's first message
   * In cloud mode, uses sendPromptAdvanced which dispatches to /cloud/jobs
   */
  const handleStartNewSession = useCallback(
    async (prompt: string) => {
      debugLog.info('handleStartNewSession called', { projectPath, prompt: prompt.slice(0, 50) });

      if (!projectPath || isStartingNewSession) {
        debugLog.warn('handleStartNewSession aborted', { projectPath, isStartingNewSession });
        return false;
      }

      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) return false;

      setIsStartingNewSession(true);

      try {
        // Use sendPromptAdvanced which handles cloud mode automatically
        const result = await sendPromptAdvanced(trimmedPrompt);

        debugLog.info('handleStartNewSession result', {
          success: result.success,
          mode: result.mode,
          jobId: result.jobId,
          errorMessage: result.errorMessage,
        });

        if (!result.success) {
          setToast({ message: result.errorMessage || 'Failed to start session', type: 'error' });
          return false;
        }

        // If this is a cloud job, show pending state with job ID
        if (result.mode === 'cloud' && result.jobId) {
          debugLog.info('Setting pendingCloudJob from handleStartNewSession', {
            jobId: result.jobId,
          });
          setPendingCloudJob({
            jobId: result.jobId,
            prompt: trimmedPrompt,
          });
          return true;
        }

        // Notify parent to refresh sessions and select the new one
        onNewSessionStarted?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start session';
        setToast({ message, type: 'error' });
        return false;
      } finally {
        setIsStartingNewSession(false);
      }
    },
    [projectPath, isStartingNewSession, onNewSessionStarted, sendPromptAdvanced]
  );

  /**
   * Handle cloud job completion
   */
  const handleCloudJobComplete = useCallback(
    (sessionId?: string) => {
      debugLog.info('handleCloudJobComplete called', { sessionId });
      setPendingCloudJob(null);
      // Refresh sessions to pick up the new one
      onNewSessionStarted?.();
    },
    [onNewSessionStarted]
  );

  /**
   * Handle cloud job error
   */
  const handleCloudJobError = useCallback((error: string) => {
    setPendingCloudJob(null);
    setToast({ message: error, type: 'error' });
  }, []);

  /**
   * Handle template selection - insert text at cursor position
   */
  const handleTemplateSelect = useCallback((prompt: string) => {
    setTextToInsert(prompt);
  }, []);

  /**
   * Clear insert text after it's been applied
   */
  const handleInsertComplete = useCallback(() => {
    setTextToInsert(undefined);
  }, []);

  /**
   * Handle voice input errors - display as error toast
   */
  const handleVoiceError = useCallback((error: Error) => {
    setToast({ message: error.message, type: 'error' });
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
      const trimmedPrompt = prompt.trim();
      debugLog.info('handleSend called', { prompt: trimmedPrompt.slice(0, 50) });

      const result = await sendPromptAdvanced(trimmedPrompt);
      debugLog.info('sendPromptAdvanced result', {
        success: result.success,
        mode: result.mode,
        jobId: result.jobId,
        errorMessage: result.errorMessage,
      });

      if (result.success) {
        // If this is a cloud job, show pending state with job ID
        if (result.mode === 'cloud' && result.jobId) {
          debugLog.info('Setting pendingCloudJob state', { jobId: result.jobId });
          setPendingCloudJob({
            jobId: result.jobId,
            prompt: trimmedPrompt,
          });
          return;
        }

        // Scroll to bottom after a short delay to allow for UI update
        setTimeout(() => scrollToBottom('smooth'), 100);
      } else if (result.errorMessage) {
        // Show error to user
        setToast({ message: result.errorMessage, type: 'error' });
      }
    },
    [sendPromptAdvanced, scrollToBottom]
  );

  /**
   * Handle stopping the agent
   */
  const handleStop = useCallback(async () => {
    const success = await stopAgent();
    if (success) {
      setToast({ message: 'Agent stopped', type: 'info' });
    }
  }, [stopAgent]);

  /**
   * Auto-dismiss toast after 3 seconds
   */
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Cloud job pending - show loading state while job executes
  // This check MUST come before the !sessionId check, because we set pendingCloudJob
  // when starting a new session (no sessionId yet)
  if (pendingCloudJob) {
    debugLog.info('Rendering CloudJobPending', { jobId: pendingCloudJob.jobId });
    return (
      <div className={cn('flex flex-col', className)}>
        <CloudJobPending
          jobId={pendingCloudJob.jobId}
          prompt={pendingCloudJob.prompt}
          projectName={projectName || 'Project'}
          onComplete={handleCloudJobComplete}
          onError={handleCloudJobError}
        />
      </div>
    );
  }

  // No session selected - show "new conversation" UI if project is selected
  if (!sessionId) {
    // If no project is selected, show basic empty state
    if (!projectPath) {
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

    // Project is selected - show new conversation UI
    return (
      <div className={cn('flex flex-col', className)}>
        {/* Empty conversation area with prompt to start */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="mb-6 text-center">
            <div className="mb-3 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-accent/10">
              <svg
                className="h-8 w-8 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">New Conversation</h3>
            <p className="text-sm text-text-secondary max-w-xs">
              Type a message below to start a new session with Claude.
            </p>
          </div>
        </div>

        {/* Template chips */}
        {templatesLoading ? (
          <TemplateChipsSkeleton />
        ) : templates && templates.length > 0 ? (
          <TemplateChips templates={templates} onSelect={handleTemplateSelect} />
        ) : null}

        {/* Toast notification */}
        {toast && (
          <div
            className={cn(
              'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
              'px-4 py-2 rounded-lg shadow-lg',
              'text-sm font-medium',
              'animate-fade-in',
              toast.type === 'error'
                ? 'bg-error/90 text-white'
                : 'bg-surface-elevated text-text-primary border border-text-primary/10'
            )}
          >
            {toast.message}
          </div>
        )}

        {/* Prompt input for new session */}
        <PromptInput
          onSend={handleStartNewSession}
          isSending={isStartingNewSession}
          disabled={false}
          status="idle"
          insertText={textToInsert}
          onInsertComplete={handleInsertComplete}
          onVoiceError={handleVoiceError}
        />
      </div>
    );
  }

  // Loading state - only show if no messages yet (prevents flickering during revalidation)
  if (isLoading && !messages) {
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
          onVoiceError={handleVoiceError}
        />
      </div>
    );
  }

  // Error state - only show if no messages yet (keeps showing messages during transient errors)
  if (error && !messages) {
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
          onVoiceError={handleVoiceError}
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
          insertText={textToInsert}
          onInsertComplete={handleInsertComplete}
          onVoiceError={handleVoiceError}
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
        insertText={textToInsert}
        onInsertComplete={handleInsertComplete}
        onVoiceError={handleVoiceError}
      />

      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            'absolute bottom-20 left-1/2 -translate-x-1/2',
            'flex items-center gap-2',
            'px-4 py-2 rounded-lg shadow-lg',
            'text-sm animate-in fade-in slide-in-from-bottom-2 duration-200',
            // Error styling
            toast.type === 'error' && 'bg-error/10 border border-error/30 text-error',
            // Info styling
            toast.type === 'info' && 'bg-surface border border-text-primary/10 text-text-primary'
          )}
        >
          {toast.type === 'error' && (
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          )}
          {toast.message}
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
