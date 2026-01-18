/**
 * CloudJobPending - Shows a pending cloud job with loading state
 *
 * Displays the user's prompt with a loading indicator while
 * the cloud job executes in the background.
 */

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { debugLog } from '@/lib/debugLog';

interface CloudJobPendingProps {
  /** The job ID returned from dispatch */
  jobId: string;
  /** The prompt that was sent */
  prompt: string;
  /** Project name for display */
  projectName: string;
  /** Called when job completes */
  onComplete: (sessionId?: string) => void;
  /** Called if job fails */
  onError: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

interface JobStatusResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'unknown';
  result?: {
    sessionId: string;
    success: boolean;
    output?: string;
  };
  error?: string;
}

// Animated dots component
function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
        .
      </span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
        .
      </span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
        .
      </span>
    </span>
  );
}

// Progress stages for the job
const STAGES = [
  { key: 'queued', label: 'Job queued', duration: 2000 },
  { key: 'cloning', label: 'Cloning repository', duration: 5000 },
  { key: 'running', label: 'Claude is thinking', duration: null }, // No duration, waits for actual status
] as const;

export function CloudJobPending({
  jobId,
  prompt,
  projectName,
  onComplete,
  onError,
  className,
}: CloudJobPendingProps) {
  const [_status, setStatus] = useState<'queued' | 'running' | 'completed' | 'failed'>('queued');
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Log when component mounts
  useEffect(() => {
    debugLog.info('CloudJobPending mounted', { jobId, projectName });
  }, [jobId, projectName]);

  // Poll for job status
  const checkStatus = useCallback(async () => {
    try {
      debugLog.info('Polling job status', { jobId });
      const response = await api.get<JobStatusResponse>(`/cloud/jobs/${jobId}`);
      debugLog.info('Job status response', {
        jobId,
        status: response.status,
        hasResult: Boolean(response.result),
        sessionId: response.result?.sessionId,
        success: response.result?.success,
      });

      if (response.status === 'completed') {
        setStatus('completed');
        if (response.result?.success) {
          debugLog.info('Job completed successfully, calling onComplete', {
            sessionId: response.result.sessionId,
          });
          onComplete(response.result.sessionId);
        } else {
          const errorMsg = response.result?.output || 'Job completed with errors';
          debugLog.error('Job completed with errors', { errorMsg });
          setError(errorMsg);
          onError(errorMsg);
        }
        return true; // Stop polling
      } else if (response.status === 'running') {
        setStatus('running');
        setStageIndex(2); // Jump to "Claude is thinking"
      } else if (response.status === 'unknown' && response.error) {
        debugLog.error('Job failed with unknown status', { error: response.error });
        setStatus('failed');
        setError(response.error);
        onError(response.error);
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (err) {
      debugLog.warn('Failed to check job status', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }, [jobId, onComplete, onError]);

  // Poll effect
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;

      const shouldStop = await checkStatus();
      if (!shouldStop && isMounted) {
        // Poll every 3 seconds
        pollInterval = setTimeout(poll, 3000);
      }
    };

    // Start polling after a short delay
    const startDelay = setTimeout(poll, 2000);

    return () => {
      isMounted = false;
      clearTimeout(startDelay);
      clearTimeout(pollInterval);
    };
  }, [checkStatus]);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Progress through stages
  useEffect(() => {
    if (stageIndex >= STAGES.length - 1) return;

    const stage = STAGES[stageIndex];
    if (stage.duration) {
      const timer = setTimeout(() => {
        setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
      }, stage.duration);

      return () => clearTimeout(timer);
    }
  }, [stageIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const currentStage = STAGES[stageIndex];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* User message */}
        <div className="flex justify-end mb-4">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent/20 px-4 py-3">
            <p className="text-sm text-text-primary whitespace-pre-wrap">{prompt}</p>
          </div>
        </div>

        {/* Assistant loading state */}
        <div className="flex justify-start">
          <div className="max-w-[85%]">
            {error ? (
              <div className="rounded-2xl rounded-bl-md bg-error/10 border border-error/20 px-4 py-3">
                <p className="text-sm text-error">{error}</p>
              </div>
            ) : (
              <div className="rounded-2xl rounded-bl-md bg-surface-elevated px-4 py-4">
                {/* Loading animation */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-8 h-8">
                    {/* Spinning ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    {/* Center dot */}
                    <div className="absolute inset-2 rounded-full bg-accent/30 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {currentStage.label}
                      <LoadingDots />
                    </p>
                    <p className="text-xs text-text-muted">{formatTime(elapsedTime)} elapsed</p>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="flex gap-1">
                  {STAGES.map((stage, i) => (
                    <div
                      key={stage.key}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors duration-500',
                        i <= stageIndex ? 'bg-accent' : 'bg-text-primary/10'
                      )}
                    />
                  ))}
                </div>

                {/* Context info */}
                <p className="text-xs text-text-muted mt-3">
                  Running on <span className="text-accent">{projectName}</span> via Modal cloud
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
            />
          </svg>
          <span>Cloud execution • Job ID: {jobId.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}
