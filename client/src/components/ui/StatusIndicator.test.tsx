/**
 * Unit tests for StatusIndicator component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator, StatusIndicatorSkeleton } from './StatusIndicator';

describe('StatusIndicator', () => {
  describe('renders correct styling for each status', () => {
    it('renders "Working" state with blue styling and pulse animation', () => {
      render(<StatusIndicator status="working" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Working')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Working');

      // Check for pulse animation class on the dot
      const dot = screen.getByRole('status').querySelector('span:first-child');
      expect(dot).toHaveClass('animate-status-pulse');
    });

    it('renders "Waiting" state with amber styling and no animation', () => {
      render(<StatusIndicator status="waiting" />);

      expect(screen.getByText('Waiting')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Waiting');

      // Check that pulse animation is NOT applied
      const dot = screen.getByRole('status').querySelector('span:first-child');
      expect(dot).not.toHaveClass('animate-status-pulse');
    });

    it('renders "Idle" state with gray styling and no animation', () => {
      render(<StatusIndicator status="idle" />);

      expect(screen.getByText('Idle')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Idle');

      // Check that pulse animation is NOT applied
      const dot = screen.getByRole('status').querySelector('span:first-child');
      expect(dot).not.toHaveClass('animate-status-pulse');
    });
  });

  describe('handles undefined status gracefully', () => {
    it('defaults to "Idle" when status is undefined', () => {
      render(<StatusIndicator status={undefined} />);

      expect(screen.getByText('Idle')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Idle');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<StatusIndicator status="working" />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label', 'Status: Working');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<StatusIndicator status="idle" className="custom-class" />);

      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
  });
});

describe('StatusIndicatorSkeleton', () => {
  it('renders a skeleton placeholder', () => {
    render(<StatusIndicatorSkeleton />);

    // Skeleton should be hidden from screen readers
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('has animate-pulse class for loading animation', () => {
    render(<StatusIndicatorSkeleton />);

    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    render(<StatusIndicatorSkeleton className="custom-skeleton" />);

    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('custom-skeleton');
  });
});
