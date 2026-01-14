import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { api, getErrorMessage } from '@/lib/api';

interface StatusResponse {
  healthy: boolean;
  claudeRunning: boolean;
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<StatusResponse>('/status')
      .then(setStatus)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div
      className={cn(
        'dark',
        'min-h-screen',
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'bg-background',
        'p-4'
      )}
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-accent-dark to-accent-light text-center">
        GoGoGadgetClaude
      </h1>
      <p className="text-base sm:text-lg text-text-secondary mt-4 text-center">
        Mobile control for Claude Code
      </p>

      {/* Status indicator */}
      <div className="mt-8 px-6 py-3 bg-surface border border-border rounded-lg text-sm">
        {error ? (
          <span className="text-error">Error: {error}</span>
        ) : status ? (
          <div className="flex items-center gap-3">
            <span
              className={cn('w-2 h-2 rounded-full', status.healthy ? 'bg-success' : 'bg-error')}
            />
            <span className="text-text-secondary">
              Server: {status.healthy ? 'Healthy' : 'Unhealthy'}
            </span>
            <span className="text-text-tertiary">•</span>
            <span className="text-text-secondary">
              Claude: {status.claudeRunning ? 'Running' : 'Idle'}
            </span>
          </div>
        ) : (
          <span className="text-text-tertiary">Loading...</span>
        )}
      </div>
    </div>
  );
}
