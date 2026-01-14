/**
 * Tests for SessionListItem component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionListItem } from './SessionListItem';
import type { SessionSummarySerialized } from '@shared/types';

// Mock session data
const mockSession: SessionSummarySerialized = {
  id: 'session-123',
  filePath: '/Users/test/.claude/projects/-Users-test-my-project/session-123.jsonl',
  startedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  messageCount: 5,
  preview: 'Hello Claude, please help me with a React component',
};

const mockSessionNoPreview: SessionSummarySerialized = {
  id: 'session-456',
  filePath: '/Users/test/.claude/projects/-Users-test-my-project/session-456.jsonl',
  startedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  messageCount: 0,
  preview: null,
};

const mockSessionNoActivity: SessionSummarySerialized = {
  id: 'session-789',
  filePath: '/Users/test/.claude/projects/-Users-test-my-project/session-789.jsonl',
  startedAt: null,
  lastActivityAt: null,
  messageCount: 0,
  preview: 'Old session preview',
};

describe('SessionListItem', () => {
  describe('rendering', () => {
    it('renders session preview text', () => {
      render(<SessionListItem session={mockSession} isSelected={false} onSelect={vi.fn()} />);

      expect(
        screen.getByText('Hello Claude, please help me with a React component')
      ).toBeInTheDocument();
    });

    it('renders "Empty session" when preview is null', () => {
      render(
        <SessionListItem session={mockSessionNoPreview} isSelected={false} onSelect={vi.fn()} />
      );

      expect(screen.getByText('Empty session')).toBeInTheDocument();
    });

    it('renders message count with correct pluralization', () => {
      render(<SessionListItem session={mockSession} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByText('5 messages')).toBeInTheDocument();
    });

    it('renders singular "message" for count of 1', () => {
      const sessionWithOneMessage = { ...mockSession, messageCount: 1 };
      render(
        <SessionListItem session={sessionWithOneMessage} isSelected={false} onSelect={vi.fn()} />
      );

      expect(screen.getByText('1 message')).toBeInTheDocument();
    });

    it('does not render message count when zero', () => {
      render(
        <SessionListItem session={mockSessionNoPreview} isSelected={false} onSelect={vi.fn()} />
      );

      expect(screen.queryByText(/message/)).not.toBeInTheDocument();
    });

    it('renders last activity time when available', () => {
      render(<SessionListItem session={mockSession} isSelected={false} onSelect={vi.fn()} />);

      // Should show "just now" or similar relative time
      expect(screen.getByText(/just now|ago/)).toBeInTheDocument();
    });

    it('does not render activity time when not available', () => {
      render(
        <SessionListItem session={mockSessionNoActivity} isSelected={false} onSelect={vi.fn()} />
      );

      // Should not show any time indicator
      expect(screen.queryByText(/ago|just now/)).not.toBeInTheDocument();
    });
  });

  describe('selected state', () => {
    it('shows checkmark when selected', () => {
      render(<SessionListItem session={mockSession} isSelected={true} onSelect={vi.fn()} />);

      // Check for aria-selected attribute
      const button = screen.getByRole('option');
      expect(button).toHaveAttribute('aria-selected', 'true');
    });

    it('does not show checkmark when not selected', () => {
      render(<SessionListItem session={mockSession} isSelected={false} onSelect={vi.fn()} />);

      const button = screen.getByRole('option');
      expect(button).toHaveAttribute('aria-selected', 'false');
    });

    it('applies selected styling when selected', () => {
      render(<SessionListItem session={mockSession} isSelected={true} onSelect={vi.fn()} />);

      const button = screen.getByRole('option');
      expect(button).toHaveClass('bg-accent/10');
    });
  });

  describe('interaction', () => {
    it('calls onSelect with session id when clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<SessionListItem session={mockSession} isSelected={false} onSelect={onSelect} />);

      await user.click(screen.getByRole('option'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('session-123');
    });

    it('calls onSelect when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<SessionListItem session={mockSession} isSelected={false} onSelect={onSelect} />);

      const button = screen.getByRole('option');
      button.focus();
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('session-123');
    });

    it('calls onSelect when Space key is pressed', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<SessionListItem session={mockSession} isSelected={false} onSelect={onSelect} />);

      const button = screen.getByRole('option');
      button.focus();
      await user.keyboard(' ');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('session-123');
    });
  });

  describe('accessibility', () => {
    it('has role="option" for listbox integration', () => {
      render(<SessionListItem session={mockSession} isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    it('has data-session attribute for scroll targeting', () => {
      render(<SessionListItem session={mockSession} isSelected={false} onSelect={vi.fn()} />);

      const button = screen.getByRole('option');
      expect(button).toHaveAttribute('data-session', 'session-123');
    });
  });

  describe('styling', () => {
    it('renders empty session text in italic muted style', () => {
      render(
        <SessionListItem session={mockSessionNoPreview} isSelected={false} onSelect={vi.fn()} />
      );

      const emptyText = screen.getByText('Empty session');
      expect(emptyText).toHaveClass('italic');
      expect(emptyText).toHaveClass('text-text-muted');
    });
  });
});
