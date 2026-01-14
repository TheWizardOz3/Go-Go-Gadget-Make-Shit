/**
 * GoGoGadgetClaude - Main App Component
 *
 * Mobile web interface for monitoring and controlling Claude Code.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { ConversationView } from '@/components/conversation/ConversationView';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

/**
 * Main App component
 *
 * For MVP:
 * - Auto-selects the most recently active project
 * - Auto-selects the most recent session
 * - Full-screen conversation view
 *
 * Project/Session picker will be added as separate features.
 */
export default function App() {
  // Selected project and session state
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fetch projects
  const {
    projects,
    isLoading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects,
  } = useProjects();

  // Fetch sessions for selected project
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    refresh: refreshSessions,
  } = useSessions(selectedProject);

  // Auto-select most recent project when projects load
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProject) {
      // Sort by last activity (most recent first)
      const sorted = [...projects].sort((a, b) => {
        const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return bTime - aTime;
      });
      setSelectedProject(sorted[0].encodedPath);
    }
  }, [projects, selectedProject]);

  // Auto-select most recent session when sessions load
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSession) {
      // Sort by last activity (most recent first)
      const sorted = [...sessions].sort((a, b) => {
        const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return bTime - aTime;
      });
      setSelectedSession(sorted[0].id);
    }
  }, [sessions, selectedSession]);

  // Reset session when project changes
  useEffect(() => {
    setSelectedSession(null);
  }, [selectedProject]);

  // Loading state (projects)
  if (projectsLoading) {
    return (
      <div className={cn('dark', 'min-h-screen', 'flex', 'flex-col', 'bg-background')}>
        <Header projectName={null} />
        <div className="flex-1 overflow-hidden">
          <ConversationSkeleton />
        </div>
      </div>
    );
  }

  // Error state (projects)
  if (projectsError) {
    return (
      <div className={cn('dark', 'min-h-screen', 'flex', 'flex-col', 'bg-background')}>
        <Header projectName={null} />
        <div className="flex-1 flex items-center justify-center">
          <ErrorState
            title="Failed to load projects"
            message={projectsError.message || 'Unable to connect to the server.'}
            onRetry={() => refreshProjects()}
          />
        </div>
      </div>
    );
  }

  // No projects found
  if (!projects || projects.length === 0) {
    return (
      <div className={cn('dark', 'min-h-screen', 'flex', 'flex-col', 'bg-background')}>
        <Header projectName={null} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-text-primary/5">
              <svg
                className="h-8 w-8 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">No projects found</h3>
            <p className="text-sm text-text-secondary max-w-xs">
              Start a Claude Code session in any project to see it here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get current project name for header
  const currentProject = projects.find((p) => p.encodedPath === selectedProject);

  // Main app with conversation view
  return (
    <div className={cn('dark', 'min-h-screen', 'flex', 'flex-col', 'bg-background')}>
      <Header
        projectName={currentProject?.name || null}
        sessionLoading={sessionsLoading}
        sessionError={sessionsError}
        onRetrySession={() => refreshSessions()}
      />
      <ConversationView sessionId={selectedSession} className="flex-1" />
    </div>
  );
}

/**
 * App header with project name
 *
 * Project/session picker will be added as separate feature.
 */
interface HeaderProps {
  projectName: string | null;
  sessionLoading?: boolean;
  sessionError?: Error;
  onRetrySession?: () => void;
}

function Header({ projectName, sessionLoading, sessionError }: HeaderProps) {
  return (
    <header className="flex-shrink-0 px-4 py-3 border-b border-text-primary/10 bg-surface safe-top">
      <div className="flex items-center justify-between">
        {/* Project name / title */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-semibold text-text-primary truncate">
            {projectName || 'GoGoGadgetClaude'}
          </h1>
          {sessionLoading && (
            <span className="flex-shrink-0 w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          )}
          {sessionError && <span className="flex-shrink-0 text-error text-xs">Error</span>}
        </div>

        {/* Placeholder for future project/session picker */}
        <button
          className="flex-shrink-0 p-2 -mr-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-text-primary/5 transition-colors"
          aria-label="Settings (coming soon)"
          disabled
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
