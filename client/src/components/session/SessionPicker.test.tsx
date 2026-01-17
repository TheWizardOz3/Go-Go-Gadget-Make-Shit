/**
 * Tests for SessionPicker component
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionPicker } from './SessionPicker';
import type { MergedSessionSummary } from '@/hooks/useSessions';

// Mock session data (local sessions with source indicator)
// Note: Sessions with empty/null previews are now filtered out by SessionPicker
const mockSessions: MergedSessionSummary[] = [
  {
    id: 'session-alpha',
    filePath: '/Users/test/.claude/projects/-test/session-alpha.jsonl',
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    messageCount: 5,
    preview: 'Hello Claude, help me with React',
    source: 'local',
  },
  {
    id: 'session-beta',
    filePath: '/Users/test/.claude/projects/-test/session-beta.jsonl',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
    messageCount: 3,
    preview: 'Write a Python script',
    source: 'local',
  },
  {
    id: 'session-gamma',
    filePath: '/Users/test/.claude/projects/-test/session-gamma.jsonl',
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    lastActivityAt: new Date(Date.now() - 7200000).toISOString(),
    messageCount: 1,
    preview: 'Third session with content',
    source: 'local',
  },
];

// Generate many sessions for search testing
const generateManySessions = (count: number): MergedSessionSummary[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    filePath: `/Users/test/.claude/projects/-test/session-${i}.jsonl`,
    startedAt: new Date(Date.now() - i * 3600000).toISOString(),
    lastActivityAt: new Date(Date.now() - i * 3600000).toISOString(),
    messageCount: i + 1,
    preview: `Session preview text number ${i}`,
    source: 'local' as const,
  }));
};

describe('SessionPicker', () => {
  // Clean up body overflow after each test
  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('visibility', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <SessionPicker
          isOpen={false}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays "Select Session" title', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByText('Select Session')).toBeInTheDocument();
    });

    it('displays session count in header', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByText('(3)')).toBeInTheDocument();
    });
  });

  describe('session list', () => {
    it('renders all sessions', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByText('Hello Claude, help me with React')).toBeInTheDocument();
      expect(screen.getByText('Write a Python script')).toBeInTheDocument();
      expect(screen.getByText('Third session with content')).toBeInTheDocument();
    });

    it('marks selected session with aria-selected', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession="session-beta"
          onSelectSession={vi.fn()}
        />
      );

      const options = screen.getAllByRole('option');
      const selectedOption = options.find((opt) => opt.getAttribute('aria-selected') === 'true');
      expect(selectedOption).toBeInTheDocument();
      expect(selectedOption?.textContent).toContain('Write a Python script');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no sessions', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={[]}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByText('No sessions yet')).toBeInTheDocument();
      expect(
        screen.getByText('Start a conversation with Claude to create a session.')
      ).toBeInTheDocument();
    });

    it('does not show count when no sessions', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={[]}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('calls onSelectSession when session is clicked', async () => {
      const user = userEvent.setup();
      const onSelectSession = vi.fn();
      const onClose = vi.fn();

      render(
        <SessionPicker
          isOpen={true}
          onClose={onClose}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={onSelectSession}
        />
      );

      await user.click(screen.getByText('Write a Python script'));

      expect(onSelectSession).toHaveBeenCalledWith('session-beta');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <SessionPicker
          isOpen={true}
          onClose={onClose}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <SessionPicker
          isOpen={true}
          onClose={onClose}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('search functionality', () => {
    it('does not show search when <= 10 sessions', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.queryByPlaceholderText('Search sessions...')).not.toBeInTheDocument();
    });

    it('shows search when > 10 sessions', () => {
      const manySessions = generateManySessions(15);

      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={manySessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByPlaceholderText('Search sessions...')).toBeInTheDocument();
    });

    it('filters sessions by preview text', async () => {
      const user = userEvent.setup();
      const manySessions = generateManySessions(15);

      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={manySessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      await user.type(searchInput, 'number 5');

      // Should only show sessions matching "number 5"
      expect(screen.getByText('Session preview text number 5')).toBeInTheDocument();
      expect(screen.queryByText('Session preview text number 0')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      const manySessions = generateManySessions(15);

      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={manySessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      await user.type(searchInput, 'xyznonexistent');

      expect(screen.getByText('No sessions match')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      const manySessions = generateManySessions(15);

      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={manySessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      await user.type(searchInput, 'number 5');

      // Click clear button
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // All sessions should be visible again
      expect(screen.getByText('Session preview text number 0')).toBeInTheDocument();
      expect(screen.getByText('Session preview text number 5')).toBeInTheDocument();
    });
  });

  describe('new session button', () => {
    it('shows new session button when projectPath is provided', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
          projectPath="/Users/test/project"
        />
      );

      expect(screen.getByRole('button', { name: /new session/i })).toBeInTheDocument();
    });

    it('does not show new session button when projectPath is not provided', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /new session/i })).not.toBeInTheDocument();
    });
  });

  describe('body scroll lock', () => {
    it('locks body scroll when modal is open', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when modal is closed', () => {
      const { rerender } = render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <SessionPicker
          isOpen={false}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('accessibility', () => {
    it('has aria-modal="true" on dialog', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(document.getElementById(labelledBy!)).toHaveTextContent('Select Session');
    });

    it('has listbox role for session container', () => {
      render(
        <SessionPicker
          isOpen={true}
          onClose={vi.fn()}
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={vi.fn()}
        />
      );

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});
