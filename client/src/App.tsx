/**
 * GoGoGadgetClaude - Main App Component
 *
 * Mobile web interface for monitoring and controlling Claude Code.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { useConversation } from '@/hooks/useConversation';
import { useFilesChanged } from '@/hooks/useFilesChanged';
import { ConversationView } from '@/components/conversation/ConversationView';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusIndicator, StatusIndicatorSkeleton } from '@/components/ui/StatusIndicator';
import { ProjectPicker } from '@/components/project';
import { SessionPicker } from '@/components/session';
import { FilesChangedView, FilesBadge } from '@/components/files';
import { DiffViewer } from '@/components/files/diff';
import type { SessionStatus, SessionSummarySerialized } from '@shared/types';

/** Active tab type */
type ActiveTab = 'conversation' | 'files';

/** localStorage key for persisting selected project */
const STORAGE_KEY_LAST_PROJECT = 'gogogadgetclaude:lastProject';

/** localStorage key prefix for persisting selected session per project */
const STORAGE_KEY_SESSION_PREFIX = 'gogogadgetclaude:lastSession:';

/**
 * Read the last selected project from localStorage
 */
function getStoredProject(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_PROJECT);
  } catch {
    // localStorage might be unavailable (private browsing, etc.)
    return null;
  }
}

/**
 * Save the selected project to localStorage
 */
function setStoredProject(encodedPath: string | null): void {
  try {
    if (encodedPath) {
      localStorage.setItem(STORAGE_KEY_LAST_PROJECT, encodedPath);
    } else {
      localStorage.removeItem(STORAGE_KEY_LAST_PROJECT);
    }
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Read the last selected session for a project from localStorage
 */
function getStoredSession(encodedPath: string | null): string | null {
  if (!encodedPath) return null;
  try {
    return localStorage.getItem(STORAGE_KEY_SESSION_PREFIX + encodedPath);
  } catch {
    return null;
  }
}

/**
 * Save the selected session for a project to localStorage
 */
function setStoredSession(encodedPath: string | null, sessionId: string | null): void {
  if (!encodedPath) return;
  try {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY_SESSION_PREFIX + encodedPath, sessionId);
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION_PREFIX + encodedPath);
    }
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Main App component
 *
 * For MVP:
 * - Restores last selected project from localStorage
 * - Auto-selects most recent project if no stored selection
 * - Auto-selects the most recent session
 * - Full-screen conversation view
 */
export default function App() {
  // Selected project and session state
  // Initialize from localStorage if available
  const [selectedProject, setSelectedProject] = useState<string | null>(() => getStoredProject());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('conversation');

  // Selected file for diff view (null = show file list)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Modal states
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);

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
    refresh: _refreshSessions,
  } = useSessions(selectedProject);

  // Fetch conversation status for selected session
  const { status, isLoading: statusLoading } = useConversation(selectedSession);

  // Fetch files changed for badge count
  const { count: filesChangedCount } = useFilesChanged(selectedProject);

  // Persist selected project to localStorage
  useEffect(() => {
    setStoredProject(selectedProject);
  }, [selectedProject]);

  // Auto-select project when projects load
  // Priority: 1) stored project (if still exists), 2) most recent project
  useEffect(() => {
    if (!projects || projects.length === 0) return;

    // If we already have a valid selection, keep it
    if (selectedProject) {
      const stillExists = projects.some((p) => p.encodedPath === selectedProject);
      if (stillExists) return;
      // Stored project no longer exists, fall through to auto-select
    }

    // Auto-select most recent project
    const sorted = [...projects].sort((a, b) => {
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bTime - aTime;
    });
    setSelectedProject(sorted[0].encodedPath);
  }, [projects, selectedProject]);

  // When sessions load, try to restore from localStorage or auto-select most recent
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;
    if (selectedSession) {
      // Validate that selected session still exists
      const stillExists = sessions.some((s) => s.id === selectedSession);
      if (stillExists) return;
      // Selected session no longer exists, fall through to re-select
    }

    // Try to restore from localStorage first
    const storedSessionId = getStoredSession(selectedProject);
    if (storedSessionId) {
      const sessionExists = sessions.some((s) => s.id === storedSessionId);
      if (sessionExists) {
        setSelectedSession(storedSessionId);
        return;
      }
    }

    // Fall back to most recent session
    const sorted = [...sessions].sort((a, b) => {
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bTime - aTime;
    });
    setSelectedSession(sorted[0].id);
  }, [sessions, selectedSession, selectedProject]);

  // Persist selected session to localStorage when it changes
  useEffect(() => {
    setStoredSession(selectedProject, selectedSession);
  }, [selectedProject, selectedSession]);

  // Reset session when project changes (will be restored from localStorage in above effect)
  useEffect(() => {
    setSelectedSession(null);
  }, [selectedProject]);

  // Clear selected file when project changes
  useEffect(() => {
    setSelectedFilePath(null);
  }, [selectedProject]);

  // Loading state (projects)
  if (projectsLoading) {
    return (
      <div className={cn('dark', 'h-dvh', 'flex', 'flex-col', 'bg-background', 'overflow-hidden')}>
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
      <div className={cn('dark', 'h-dvh', 'flex', 'flex-col', 'bg-background', 'overflow-hidden')}>
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
      <div className={cn('dark', 'h-dvh', 'flex', 'flex-col', 'bg-background', 'overflow-hidden')}>
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

  // Get current session for header display
  const currentSession = sessions?.find((s) => s.id === selectedSession);

  // Handle project selection from picker
  const handleSelectProject = (encodedPath: string) => {
    setSelectedProject(encodedPath);
  };

  // Handle session selection from picker
  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId);
  };

  // Main app with tab navigation
  return (
    <div className={cn('dark', 'h-dvh', 'flex', 'flex-col', 'bg-background', 'overflow-hidden')}>
      <Header
        projectName={currentProject?.name || null}
        currentSession={currentSession}
        status={status}
        statusLoading={statusLoading}
        sessionLoading={sessionsLoading}
        sessionError={sessionsError}
        onProjectClick={() => setIsProjectPickerOpen(true)}
        onSessionClick={() => setIsSessionPickerOpen(true)}
        hasProjects={projects.length > 0}
        hasSessions={(sessions?.length ?? 0) > 0}
      />

      {/* Main content area - conditionally render based on active tab */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'conversation' ? (
          <ConversationView
            sessionId={selectedSession}
            encodedPath={selectedProject}
            className="h-full"
          />
        ) : selectedFilePath && selectedProject ? (
          <DiffViewer
            encodedPath={selectedProject}
            filePath={selectedFilePath}
            onBack={() => setSelectedFilePath(null)}
          />
        ) : (
          <FilesChangedView
            encodedPath={selectedProject}
            onFilePress={setSelectedFilePath}
            className="h-full"
          />
        )}
      </div>

      {/* Bottom Tab Bar - fixed at bottom */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filesChangedCount={filesChangedCount}
      />

      {/* Project Picker Modal */}
      <ProjectPicker
        isOpen={isProjectPickerOpen}
        onClose={() => setIsProjectPickerOpen(false)}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
      />

      {/* Session Picker Modal */}
      <SessionPicker
        isOpen={isSessionPickerOpen}
        onClose={() => setIsSessionPickerOpen(false)}
        sessions={sessions ?? []}
        selectedSession={selectedSession}
        onSelectSession={handleSelectSession}
        projectPath={currentProject?.path}
        onNewSession={() => {
          // Refresh sessions to discover the new one
          _refreshSessions();
          // Clear selected session so auto-select picks up the new one
          setSelectedSession(null);
        }}
      />
    </div>
  );
}

/**
 * Chevron down icon
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * App header with project name, session indicator, and status
 */
interface HeaderProps {
  projectName: string | null;
  currentSession?: SessionSummarySerialized;
  status?: SessionStatus;
  statusLoading?: boolean;
  sessionLoading?: boolean;
  sessionError?: Error;
  onProjectClick?: () => void;
  onSessionClick?: () => void;
  hasProjects?: boolean;
  hasSessions?: boolean;
}

function Header({
  projectName,
  currentSession,
  status,
  statusLoading,
  sessionLoading,
  sessionError,
  onProjectClick,
  onSessionClick,
  hasProjects,
  hasSessions,
}: HeaderProps) {
  const isProjectClickable = hasProjects && onProjectClick;
  const isSessionClickable = hasSessions && onSessionClick;

  // Generate session display text
  const sessionDisplayText = currentSession?.preview || 'Select session';

  return (
    <header className="flex-shrink-0 px-4 py-2 border-b border-text-primary/10 bg-surface safe-top">
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Project + Session */}
        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
          {/* Project name row */}
          <div className="flex items-center gap-2">
            {isProjectClickable ? (
              <button
                type="button"
                onClick={onProjectClick}
                className={cn(
                  'flex items-center gap-1 min-w-0',
                  'rounded-lg -ml-2 pl-2 pr-1 py-0.5',
                  'hover:bg-text-primary/5 active:bg-text-primary/10',
                  'transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                )}
                aria-label="Select project"
              >
                <span className="text-base font-semibold text-text-primary truncate">
                  {projectName || 'GoGoGadgetClaude'}
                </span>
                <ChevronDownIcon className="flex-shrink-0 text-text-muted" />
              </button>
            ) : (
              <h1 className="text-base font-semibold text-text-primary truncate">
                {projectName || 'GoGoGadgetClaude'}
              </h1>
            )}
            {sessionLoading && (
              <span className="flex-shrink-0 w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            )}
            {sessionError && <span className="flex-shrink-0 text-error text-xs">Error</span>}
          </div>

          {/* Session indicator row */}
          {isSessionClickable ? (
            <button
              type="button"
              onClick={onSessionClick}
              className={cn(
                'flex items-center gap-1 min-w-0',
                'rounded-lg -ml-2 pl-2 pr-1 py-0.5',
                'hover:bg-text-primary/5 active:bg-text-primary/10',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
              )}
              aria-label="Select session"
            >
              <span className="text-sm text-text-muted truncate">{sessionDisplayText}</span>
              <ChevronDownIcon className="flex-shrink-0 text-text-muted h-3 w-3" />
            </button>
          ) : (
            <span className="text-sm text-text-muted truncate pl-0">{sessionDisplayText}</span>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0">
          {statusLoading ? <StatusIndicatorSkeleton /> : <StatusIndicator status={status} />}
        </div>
      </div>
    </header>
  );
}

/**
 * Chat bubble icon for Conversation tab
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
 * Document/Files icon for Files tab
 */
function DocumentIcon({ className }: { className?: string }) {
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

/**
 * Bottom tab bar for navigation between views
 */
interface TabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  filesChangedCount: number;
}

function TabBar({ activeTab, onTabChange, filesChangedCount }: TabBarProps) {
  return (
    <nav className="flex-shrink-0 border-t border-text-primary/10 bg-surface safe-bottom">
      <div className="flex items-center justify-around">
        {/* Conversation Tab */}
        <button
          type="button"
          onClick={() => onTabChange('conversation')}
          className={cn(
            'flex flex-col items-center justify-center gap-1',
            'flex-1 py-2 min-h-[56px]',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:bg-text-primary/5',
            activeTab === 'conversation' ? 'text-accent' : 'text-text-muted'
          )}
          aria-selected={activeTab === 'conversation'}
          role="tab"
        >
          <ChatBubbleIcon />
          <span className="text-xs font-medium">Chat</span>
        </button>

        {/* Files Tab */}
        <button
          type="button"
          onClick={() => onTabChange('files')}
          className={cn(
            'flex flex-col items-center justify-center gap-1',
            'flex-1 py-2 min-h-[56px]',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:bg-text-primary/5',
            activeTab === 'files' ? 'text-accent' : 'text-text-muted'
          )}
          aria-selected={activeTab === 'files'}
          role="tab"
        >
          <div className="relative">
            <DocumentIcon />
            {/* Badge positioned at top-right of icon */}
            {filesChangedCount > 0 && (
              <div className="absolute -top-1 -right-2">
                <FilesBadge count={filesChangedCount} />
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Files</span>
        </button>
      </div>
    </nav>
  );
}
