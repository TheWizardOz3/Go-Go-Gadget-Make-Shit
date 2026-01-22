/**
 * Tests for PromptInput component
 *
 * Tests disabled states, send behavior, and localStorage persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';
import { SharedPromptProvider } from '@/contexts/SharedPromptContext';

/**
 * Helper to render PromptInput with required context providers
 */
function renderWithProviders(ui: React.ReactElement) {
  return render(<SharedPromptProvider>{ui}</SharedPromptProvider>);
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia for desktop detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(hover: hover)', // Simulate desktop
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('PromptInput', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render textarea and send button', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should show placeholder text', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('should have proper aria labels', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      expect(screen.getByLabelText('Message input')).toBeInTheDocument();
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
    });
  });

  describe('disabled states', () => {
    it('should disable send button when input is empty', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when input is whitespace only', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   ');

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has content', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeEnabled();
    });

    it('should disable textarea when disabled prop is true', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} disabled />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should disable textarea when isSending is true', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} isSending />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should show loading spinner when isSending', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} isSending />);

      // The spinner has animate-spin class
      const button = screen.getByRole('button', { name: /send/i });
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('send behavior', () => {
    it('should call onSend with trimmed value when send button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '  Hello Claude  ');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // onSend is called with (prompt, imageAttachment) - imageAttachment is undefined when no image attached
      expect(mockOnSend).toHaveBeenCalledWith('Hello Claude', undefined);
    });

    it('should clear input after send', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(textarea).toHaveValue('');
    });

    it('should not call onSend when input is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should send on Enter key (desktop)', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      // onSend is called with (prompt, imageAttachment) - imageAttachment is undefined when no image attached
      expect(mockOnSend).toHaveBeenCalledWith('Hello', undefined);
    });

    it('should not send on Shift+Enter (allows newline)', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('localStorage persistence', () => {
    it('should load initial value from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('Saved draft');

      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Saved draft');
    });

    it('should save value to localStorage on change', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Draft message');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gogogadget-prompt-draft',
        expect.stringContaining('Draft message')
      );
    });

    it('should remove from localStorage when input cleared', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');
      await user.clear(textarea);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gogogadget-prompt-draft');
    });

    it('should clear localStorage on send', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gogogadget-prompt-draft');
    });
  });

  describe('auto-resize', () => {
    it('should have minimum height', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveStyle({ minHeight: '44px' });
    });

    it('should have maximum height', () => {
      renderWithProviders(<PromptInput onSend={mockOnSend} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveStyle({ maxHeight: '150px' });
    });
  });
});
