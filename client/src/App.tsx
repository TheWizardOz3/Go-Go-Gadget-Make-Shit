/**
 * GoGoGadgetClaude - Main App Component
 *
 * Mobile web interface for monitoring and controlling Claude Code.
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { useConversation } from '@/hooks/useConversation';
import { useFilesChanged } from '@/hooks/useFilesChanged';
import { ConversationView } from '@/components/conversation/ConversationView';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusIndicator, StatusIndicatorSkeleton } from '@/components/ui/StatusIndicator';
import {
  ConnectionModeBadge,
  ConnectionModeBadgeSkeleton,
} from '@/components/ui/ConnectionModeBadge';
import { ProjectPicker } from '@/components/project';
import { SessionPicker } from '@/components/session';
import { SettingsModal } from '@/components/settings';
import { ScheduledPromptsPanel, ScheduledPromptForm } from '@/components/scheduled';
import { FilesChangedView, FilesBadge } from '@/components/files';
import { DiffViewer } from '@/components/files/diff';
import { FileTreeView } from '@/components/files/tree';
import { FloatingVoiceButton } from '@/components/voice';
import { SharedPromptProvider } from '@/contexts/SharedPromptContext';
import { ApiEndpointProvider, useApiEndpointContext } from '@/hooks/useApiEndpoint';
import { useScheduledPrompts } from '@/hooks/useScheduledPrompts';
import { useScheduledPromptNotifications } from '@/hooks/useScheduledPromptNotifications';
import type { SessionStatus, SessionSummarySerialized, ScheduledPromptInput } from '@shared/types';

/** Active tab type */
type ActiveTab = 'conversation' | 'files';

/** Files sub-view type */
type FilesSubView = 'changed' | 'all';

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

  // "New session" mode - prevents auto-select from re-selecting a session
  const [isNewSessionMode, setIsNewSessionMode] = useState(false);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('conversation');

  // Files sub-view state ('changed' = files changed, 'all' = file tree)
  const [filesSubView, setFilesSubView] = useState<FilesSubView>('changed');

  // Selected file for diff view (null = show file list)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Modal states
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScheduledPromptsOpen, setIsScheduledPromptsOpen] = useState(false);
  const [isScheduledPromptFormOpen, setIsScheduledPromptFormOpen] = useState(false);

  // Fetch projects
  const {
    projects,
    isLoading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects,
  } = useProjects();

  // Get current project for path lookup
  const selectedProjectData = projects?.find((p) => p.encodedPath === selectedProject);

  // Fetch sessions for selected project (includes both local and cloud sessions)
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    refresh: _refreshSessions,
    cloudAvailable: _cloudAvailable, // Available for future UI indicators
  } = useSessions(selectedProject, selectedProjectData?.path);

  // Fetch conversation status for selected session
  const { status, isLoading: statusLoading } = useConversation(selectedSession);

  // Fetch files changed for badge count
  const { count: filesChangedCount } = useFilesChanged(selectedProject);

  // Scheduled prompts hook
  const { createPrompt: createScheduledPrompt, isLoading: scheduledPromptsLoading } =
    useScheduledPrompts();

  // Monitor scheduled prompt executions and show toast notifications
  useScheduledPromptNotifications();

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
  // Skip auto-selection when in "new session" mode (user explicitly wants blank conversation)
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;

    // Don't auto-select when user clicked "New Session"
    if (isNewSessionMode) return;

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
  }, [sessions, selectedSession, selectedProject, isNewSessionMode]);

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

  // Handler for long-press send from floating voice button
  // Switches to conversation tab - actual send is triggered via shared context
  const handleFloatingSend = useCallback(() => {
    setActiveTab('conversation');
    // The ConversationView will read from SharedPromptContext and send
  }, []);

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

  // Use the project data we looked up earlier for header
  const currentProject = selectedProjectData;

  // Get current session for header display
  const currentSession = sessions?.find((s) => s.id === selectedSession);

  // Handle project selection from picker
  const handleSelectProject = (encodedPath: string) => {
    setSelectedProject(encodedPath);
  };

  // Handle session selection from picker
  const handleSelectSession = (sessionId: string) => {
    setIsNewSessionMode(false); // Exit new session mode when manually selecting
    setSelectedSession(sessionId);
  };

  // Main app with tab navigation
  return (
    <ApiEndpointProvider>
      <SharedPromptProvider>
        <div
          className={cn('dark', 'h-dvh', 'flex', 'flex-col', 'bg-background', 'overflow-hidden')}
        >
          <Header
            projectName={currentProject?.name || null}
            currentSession={currentSession}
            status={status}
            statusLoading={statusLoading}
            sessionLoading={sessionsLoading}
            sessionError={sessionsError}
            onProjectClick={() => setIsProjectPickerOpen(true)}
            onSessionClick={() => setIsSessionPickerOpen(true)}
            onSettingsClick={() => setIsSettingsOpen(true)}
            onScheduledPromptsClick={() => setIsScheduledPromptsOpen(true)}
            hasProjects={projects.length > 0}
            hasSessions={(sessions?.length ?? 0) > 0}
          />

          {/* Main content area - conditionally render based on active tab */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'conversation' ? (
              <ConversationView
                sessionId={selectedSession}
                encodedPath={selectedProject}
                projectPath={currentProject?.path}
                projectName={currentProject?.name}
                gitRemoteUrl={currentProject?.gitRemoteUrl}
                onNewSessionStarted={async () => {
                  // Poll for new session with direct API calls (bypasses SWR cache)
                  // Claude takes a few seconds to write the JSONL

                  // First, capture the existing session IDs before the new session is created
                  const existingSessionIds = new Set(sessions?.map((s) => s.id) ?? []);

                  for (let attempt = 0; attempt < 8; attempt++) {
                    await new Promise((r) => setTimeout(r, 1500));

                    try {
                      // Direct API call to bypass SWR cache
                      const freshSessions = await api.get<SessionSummarySerialized[]>(
                        `/projects/${selectedProject}/sessions`
                      );

                      if (freshSessions && freshSessions.length > 0) {
                        // Find any session that wasn't in our original list (the new session)
                        const newSession = freshSessions.find((s) => !existingSessionIds.has(s.id));

                        if (newSession) {
                          // Found the new session - select it
                          setIsNewSessionMode(false);
                          setSelectedSession(newSession.id);
                          setStoredSession(selectedProject, newSession.id);
                          // Also refresh SWR cache
                          _refreshSessions();
                          return;
                        }

                        // Fallback: If no new session ID found but count increased,
                        // select the most recent session created within last 60 seconds
                        if (freshSessions.length > existingSessionIds.size) {
                          const sorted = [...freshSessions].sort((a, b) => {
                            const aTime = a.lastActivityAt
                              ? new Date(a.lastActivityAt).getTime()
                              : 0;
                            const bTime = b.lastActivityAt
                              ? new Date(b.lastActivityAt).getTime()
                              : 0;
                            return bTime - aTime;
                          });

                          const newest = sorted[0];
                          if (newest?.lastActivityAt) {
                            const newestTime = new Date(newest.lastActivityAt).getTime();
                            if (Date.now() - newestTime < 60000) {
                              setIsNewSessionMode(false);
                              setSelectedSession(newest.id);
                              setStoredSession(selectedProject, newest.id);
                              _refreshSessions();
                              return;
                            }
                          }
                        }
                      }
                    } catch {
                      // Ignore errors, keep polling
                    }
                  }
                  // Even if we didn't find a new session, exit new session mode
                  setIsNewSessionMode(false);
                  _refreshSessions();
                }}
                className="h-full"
              />
            ) : selectedFilePath && selectedProject ? (
              <DiffViewer
                encodedPath={selectedProject}
                filePath={selectedFilePath}
                onBack={() => setSelectedFilePath(null)}
              />
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Files sub-navigation */}
                <FilesSubNav activeView={filesSubView} onViewChange={setFilesSubView} />

                {/* Files content based on sub-view */}
                {filesSubView === 'changed' ? (
                  <FilesChangedView
                    encodedPath={selectedProject}
                    onFilePress={setSelectedFilePath}
                    className="flex-1"
                  />
                ) : (
                  <FileTreeView encodedPath={selectedProject} className="flex-1" />
                )}
              </div>
            )}
          </div>

          {/* Floating Voice Button - visible on Files tab only */}
          <FloatingVoiceButton hidden={activeTab === 'conversation'} onSend={handleFloatingSend} />

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
              // Enter "new session" mode - prevents auto-select from re-selecting
              setIsNewSessionMode(true);
              // Clear the session selection - this shows the "new conversation" state
              setSelectedSession(null);
              setStoredSession(selectedProject, null);
            }}
          />

          {/* Settings Modal */}
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

          {/* Scheduled Prompts Panel */}
          <ScheduledPromptsPanel
            isOpen={isScheduledPromptsOpen}
            onClose={() => setIsScheduledPromptsOpen(false)}
            onAddNew={() => {
              setIsScheduledPromptsOpen(false);
              setIsScheduledPromptFormOpen(true);
            }}
          />

          {/* Scheduled Prompt Form */}
          <ScheduledPromptForm
            isOpen={isScheduledPromptFormOpen}
            onClose={() => setIsScheduledPromptFormOpen(false)}
            onSubmit={async (input: ScheduledPromptInput) => {
              await createScheduledPrompt(input);
            }}
            projects={projects?.map((p) => ({ path: p.path, name: p.name })) ?? []}
            isSubmitting={scheduledPromptsLoading}
          />
        </div>
      </SharedPromptProvider>
    </ApiEndpointProvider>
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
 * Settings gear icon
 */
function SettingsIcon({ className }: { className?: string }) {
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/**
 * Calendar/Clock icon for scheduled prompts
 */
function CalendarClockIcon({ className }: { className?: string }) {
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
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75v1.5l1.125.75" />
    </svg>
  );
}

/**
 * App header with project name, session indicator, status, and connection mode
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
  onSettingsClick?: () => void;
  onScheduledPromptsClick?: () => void;
  hasProjects?: boolean;
  hasSessions?: boolean;
  /** Whether to show connection mode badge */
  showConnectionMode?: boolean;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1).trim() + '…';
}

/**
 * Format a date as a short relative or absolute time for header display
 */
function formatShortTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Show short date for older sessions
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  onSettingsClick,
  onScheduledPromptsClick,
  hasProjects,
  hasSessions,
  showConnectionMode = true,
}: HeaderProps) {
  const isProjectClickable = hasProjects && onProjectClick;
  const isSessionClickable = hasSessions && onSessionClick;

  // Get connection mode from context (safe to call - will return skeleton if not in provider)
  let connectionBadge = null;
  try {
    const endpoint = useApiEndpointContext();
    if (showConnectionMode) {
      connectionBadge = (
        <ConnectionModeBadge
          mode={endpoint.mode}
          isLaptopAvailable={endpoint.isLaptopAvailable}
          isCloudConfigured={endpoint.isCloudConfigured}
          isChecking={endpoint.isChecking}
          onTap={endpoint.checkNow}
        />
      );
    }
  } catch {
    // Not in provider, show skeleton or nothing
    if (showConnectionMode) {
      connectionBadge = <ConnectionModeBadgeSkeleton />;
    }
  }

  // Generate session display text - shorter for header, with time context
  const sessionPreview = currentSession?.preview
    ? truncateText(currentSession.preview, 35)
    : 'Select session';
  const sessionTime = formatShortTime(currentSession?.lastActivityAt || null);
  const sessionDisplayText = sessionTime ? `${sessionPreview} · ${sessionTime}` : sessionPreview;

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

        {/* Right side: Connection Mode + Scheduled Prompts + Settings + Status */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* Connection mode badge */}
          {connectionBadge}

          {/* Scheduled Prompts button */}
          {onScheduledPromptsClick && (
            <button
              type="button"
              onClick={onScheduledPromptsClick}
              className={cn(
                'p-2 rounded-lg',
                'text-text-muted hover:text-text-primary',
                'hover:bg-text-primary/5 active:bg-text-primary/10',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
              )}
              aria-label="Scheduled prompts"
            >
              <CalendarClockIcon />
            </button>
          )}

          {/* Settings button */}
          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              className={cn(
                'p-2 rounded-lg',
                'text-text-muted hover:text-text-primary',
                'hover:bg-text-primary/5 active:bg-text-primary/10',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
              )}
              aria-label="Settings"
            >
              <SettingsIcon />
            </button>
          )}

          {/* Status indicator */}
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
 * Files sub-navigation for switching between Changed and All Files views
 */
interface FilesSubNavProps {
  activeView: FilesSubView;
  onViewChange: (view: FilesSubView) => void;
}

function FilesSubNav({ activeView, onViewChange }: FilesSubNavProps) {
  return (
    <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-bg-secondary">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-tertiary">
        <button
          type="button"
          onClick={() => onViewChange('changed')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeView === 'changed'
              ? 'bg-bg-primary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          )}
          aria-selected={activeView === 'changed'}
        >
          Changed
        </button>
        <button
          type="button"
          onClick={() => onViewChange('all')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeView === 'all'
              ? 'bg-bg-primary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          )}
          aria-selected={activeView === 'all'}
        >
          All Files
        </button>
      </div>
    </div>
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
