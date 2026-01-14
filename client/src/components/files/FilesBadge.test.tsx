/**
 * Tests for FilesBadge component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilesBadge } from './FilesBadge';

describe('FilesBadge', () => {
  describe('rendering', () => {
    it('renders count when greater than zero', () => {
      render(<FilesBadge count={5} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not render when count is zero', () => {
      const { container } = render(<FilesBadge count={0} />);

      expect(container.firstChild).toBeNull();
    });

    it('displays count as-is for small numbers', () => {
      render(<FilesBadge count={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();

      const { unmount } = render(<FilesBadge count={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
      unmount();

      render(<FilesBadge count={99} />);
      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('displays 99+ for counts over 99', () => {
      render(<FilesBadge count={100} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('displays 99+ for very large counts', () => {
      render(<FilesBadge count={999} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has aria-label with exact count', () => {
      render(<FilesBadge count={5} />);

      const badge = screen.getByLabelText('5 files changed');
      expect(badge).toBeInTheDocument();
    });

    it('has aria-label with exact count even for large numbers', () => {
      render(<FilesBadge count={150} />);

      // aria-label should show exact count, not 99+
      const badge = screen.getByLabelText('150 files changed');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      render(<FilesBadge count={5} className="custom-class" />);

      const badge = screen.getByText('5');
      expect(badge).toHaveClass('custom-class');
    });

    it('has bg-accent class for visual styling', () => {
      render(<FilesBadge count={5} />);

      const badge = screen.getByText('5');
      expect(badge).toHaveClass('bg-accent');
    });
  });
});
