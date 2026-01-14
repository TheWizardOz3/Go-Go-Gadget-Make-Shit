/**
 * ProjectPicker - Full-screen modal for selecting projects
 *
 * Displays a list of all projects with Claude Code sessions.
 * Slides up from bottom with dark backdrop overlay.
 * Includes search functionality when > 10 projects.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { ProjectListItem } from './ProjectListItem';
import type { ProjectSerialized } from '@shared/types';

/** Threshold for showing search input */
const SEARCH_THRESHOLD = 10;

interface ProjectPickerProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of projects to display */
  projects: ProjectSerialized[];
  /** Currently selected project's encodedPath */
  selectedProject: string | null;
  /** Callback when a project is selected */
  onSelectProject: (encodedPath: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Close icon (X)
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-6 w-6', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Search icon
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

/**
 * Clear/X icon for search input
 */
function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Empty state when no projects exist
 */
function EmptyState({ isSearchResult }: { isSearchResult?: boolean }) {
  if (isSearchResult) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-text-primary/5">
          <SearchIcon className="h-8 w-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">No projects match</h3>
        <p className="text-sm text-text-secondary max-w-xs">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-text-primary/5">
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
  );
}

/**
 * ProjectPicker component - modal for selecting a project
 *
 * @example
 * ```tsx
 * <ProjectPicker
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   projects={projects}
 *   selectedProject={selectedProject}
 *   onSelectProject={handleSelectProject}
 * />
 * ```
 */
export function ProjectPicker({
  isOpen,
  onClose,
  projects,
  selectedProject,
  onSelectProject,
  className,
}: ProjectPickerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine if search should be shown
  const showSearch = projects.length > SEARCH_THRESHOLD;

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }
    const query = searchQuery.toLowerCase().trim();
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus search input when modal opens (if search is shown)
  useEffect(() => {
    if (isOpen && showSearch) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showSearch]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Scroll selected project into view when modal opens
  useEffect(() => {
    if (isOpen && selectedProject) {
      // Small delay to allow modal animation to complete
      const timer = setTimeout(() => {
        const selectedElement = document.querySelector(`[data-project="${selectedProject}"]`);
        selectedElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedProject]);

  // Handle project selection
  const handleSelectProject = (encodedPath: string) => {
    onSelectProject(encodedPath);
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle search clear
  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        // Backdrop
        'fixed inset-0 z-50',
        'bg-black/60 backdrop-blur-sm',
        // Animation
        'animate-fade-in',
        className
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-picker-title"
    >
      {/* Modal container */}
      <div
        ref={modalRef}
        className={cn(
          'absolute inset-x-0 bottom-0',
          'max-h-[85vh] min-h-[50vh]',
          'bg-surface rounded-t-2xl',
          'flex flex-col',
          // Animation - slide up
          'animate-slide-up',
          // Safe area for notched phones
          'safe-bottom'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-text-primary/10">
          {/* Drag handle indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-primary/20" />

          <div className="flex items-center gap-2">
            <h2 id="project-picker-title" className="text-lg font-semibold text-text-primary">
              Select Project
            </h2>
            {projects.length > 0 && (
              <span className="text-sm text-text-muted">({projects.length})</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 -mr-2 rounded-lg',
              'text-text-muted hover:text-text-primary',
              'hover:bg-text-primary/5 active:bg-text-primary/10',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
            )}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search input - only shown when > 10 projects */}
        {showSearch && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-text-primary/10">
            <div className="relative">
              {/* Search icon */}
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <SearchIcon className="text-text-muted" />
              </div>

              {/* Input */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className={cn(
                  'w-full pl-10 pr-10 py-2.5',
                  'bg-text-primary/5 rounded-lg',
                  'text-text-primary placeholder:text-text-muted',
                  'border border-transparent',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  'transition-colors duration-150'
                )}
                aria-label="Search projects"
              />

              {/* Clear button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={cn(
                    'absolute inset-y-0 right-2 flex items-center px-1',
                    'text-text-muted hover:text-text-primary',
                    'transition-colors duration-150'
                  )}
                  aria-label="Clear search"
                >
                  <ClearIcon />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Project list */}
        <div className="flex-1 overflow-y-auto overscroll-contain" role="listbox">
          {projects.length === 0 ? (
            <EmptyState />
          ) : filteredProjects.length === 0 ? (
            <EmptyState isSearchResult />
          ) : (
            <div className="py-2">
              {filteredProjects.map((project) => (
                <ProjectListItem
                  key={project.encodedPath}
                  project={project}
                  isSelected={selectedProject === project.encodedPath}
                  onSelect={handleSelectProject}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
