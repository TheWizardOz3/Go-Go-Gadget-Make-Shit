/**
 * Tests for SharedPromptContext
 *
 * Tests the shared prompt state management between FloatingVoiceButton and PromptInput.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SharedPromptProvider, useSharedPrompt } from './SharedPromptContext';

/**
 * Test component that exposes context values
 */
function TestConsumer() {
  const {
    promptText,
    hasText,
    shouldSend,
    setPromptText,
    appendText,
    clearText,
    requestSend,
    clearSendRequest,
  } = useSharedPrompt();

  return (
    <div>
      <span data-testid="promptText">{promptText}</span>
      <span data-testid="hasText">{hasText.toString()}</span>
      <span data-testid="shouldSend">{shouldSend.toString()}</span>
      <button onClick={() => setPromptText('set text')}>setPromptText</button>
      <button onClick={() => appendText('appended')}>appendText</button>
      <button onClick={() => clearText()}>clearText</button>
      <button onClick={() => requestSend()}>requestSend</button>
      <button onClick={() => clearSendRequest()}>clearSendRequest</button>
    </div>
  );
}

describe('SharedPromptContext', () => {
  describe('initial state', () => {
    it('should start with empty prompt text', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      expect(screen.getByTestId('promptText')).toHaveTextContent('');
      expect(screen.getByTestId('hasText')).toHaveTextContent('false');
      expect(screen.getByTestId('shouldSend')).toHaveTextContent('false');
    });
  });

  describe('setPromptText', () => {
    it('should replace prompt text', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      act(() => {
        screen.getByText('setPromptText').click();
      });

      expect(screen.getByTestId('promptText')).toHaveTextContent('set text');
      expect(screen.getByTestId('hasText')).toHaveTextContent('true');
    });
  });

  describe('appendText', () => {
    it('should append text with space separator when text exists', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      // First set some text
      act(() => {
        screen.getByText('setPromptText').click();
      });

      // Then append
      act(() => {
        screen.getByText('appendText').click();
      });

      expect(screen.getByTestId('promptText')).toHaveTextContent('set text appended');
    });

    it('should set text directly when prompt is empty', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      act(() => {
        screen.getByText('appendText').click();
      });

      expect(screen.getByTestId('promptText')).toHaveTextContent('appended');
    });
  });

  describe('clearText', () => {
    it('should clear all text', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      // Set text first
      act(() => {
        screen.getByText('setPromptText').click();
      });

      expect(screen.getByTestId('hasText')).toHaveTextContent('true');

      // Clear it
      act(() => {
        screen.getByText('clearText').click();
      });

      expect(screen.getByTestId('promptText')).toHaveTextContent('');
      expect(screen.getByTestId('hasText')).toHaveTextContent('false');
    });
  });

  describe('shouldSend and requestSend', () => {
    it('should set shouldSend to true when requestSend is called', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      expect(screen.getByTestId('shouldSend')).toHaveTextContent('false');

      act(() => {
        screen.getByText('requestSend').click();
      });

      expect(screen.getByTestId('shouldSend')).toHaveTextContent('true');
    });

    it('should set shouldSend to false when clearSendRequest is called', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      // Request send first
      act(() => {
        screen.getByText('requestSend').click();
      });

      expect(screen.getByTestId('shouldSend')).toHaveTextContent('true');

      // Clear the request
      act(() => {
        screen.getByText('clearSendRequest').click();
      });

      expect(screen.getByTestId('shouldSend')).toHaveTextContent('false');
    });
  });

  describe('hasText', () => {
    it('should return false for whitespace-only text', () => {
      render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      // Create a custom test component to test whitespace
      const { rerender } = render(
        <SharedPromptProvider>
          <TestConsumer />
        </SharedPromptProvider>
      );

      // We need a component that can set whitespace
      function WhitespaceTestConsumer() {
        const { hasText, setPromptText } = useSharedPrompt();
        return (
          <div>
            <span data-testid="hasText2">{hasText.toString()}</span>
            <button onClick={() => setPromptText('   ')}>setWhitespace</button>
          </div>
        );
      }

      rerender(
        <SharedPromptProvider>
          <WhitespaceTestConsumer />
        </SharedPromptProvider>
      );

      act(() => {
        screen.getByText('setWhitespace').click();
      });

      expect(screen.getByTestId('hasText2')).toHaveTextContent('false');
    });
  });

  describe('error handling', () => {
    it('should throw error when useSharedPrompt is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useSharedPrompt must be used within a SharedPromptProvider');

      consoleSpy.mockRestore();
    });
  });
});

// Import vi for the mock
import { vi } from 'vitest';
