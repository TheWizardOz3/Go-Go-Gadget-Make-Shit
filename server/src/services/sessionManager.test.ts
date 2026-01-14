/**
 * Tests for Session Manager Service
 *
 * Focuses on status detection logic which is critical for the UI.
 */

import { describe, it, expect } from 'vitest';
import { detectStatus } from './sessionManager.js';
import type { Message } from '../lib/jsonlParser.js';

// ============================================================
// Test Fixtures
// ============================================================

const createMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  sessionId: 'session-1',
  type: 'user',
  content: 'Hello',
  timestamp: new Date(),
  ...overrides,
});

// ============================================================
// detectStatus Tests (with claudeRunning = true)
// ============================================================

describe('detectStatus', () => {
  describe('when Claude is not running', () => {
    it('returns idle regardless of messages', () => {
      const messages = [
        createMessage({ type: 'user' }),
        createMessage({ type: 'assistant', id: 'msg-2' }),
      ];
      expect(detectStatus(messages, false)).toBe('idle');
    });

    it('returns idle for empty messages', () => {
      expect(detectStatus([], false)).toBe('idle');
    });
  });

  describe('when Claude is running', () => {
    it('returns idle for empty messages', () => {
      expect(detectStatus([], true)).toBe('idle');
    });

    it('returns waiting when last message is from assistant with no pending tools', () => {
      const messages = [
        createMessage({ type: 'user', timestamp: new Date('2026-01-14T10:00:00Z') }),
        createMessage({
          type: 'assistant',
          id: 'msg-2',
          timestamp: new Date('2026-01-14T10:00:05Z'),
          toolUse: [], // No tools
        }),
      ];
      expect(detectStatus(messages, true)).toBe('waiting');
    });

    it('returns waiting when assistant message has no toolUse property', () => {
      const messages = [
        createMessage({ type: 'user' }),
        createMessage({
          type: 'assistant',
          id: 'msg-2',
          toolUse: undefined, // Explicitly undefined
        }),
      ];
      expect(detectStatus(messages, true)).toBe('waiting');
    });

    it('returns waiting when all tools are complete', () => {
      const messages = [
        createMessage({ type: 'user' }),
        createMessage({
          type: 'assistant',
          id: 'msg-2',
          toolUse: [
            { tool: 'write_file', input: {}, status: 'complete' },
            { tool: 'run_command', input: {}, status: 'complete' },
          ],
        }),
      ];
      expect(detectStatus(messages, true)).toBe('waiting');
    });

    it('returns working when last message has pending tool use', () => {
      const messages = [
        createMessage({ type: 'user' }),
        createMessage({
          type: 'assistant',
          id: 'msg-2',
          toolUse: [
            { tool: 'write_file', input: {}, status: 'complete' },
            { tool: 'run_command', input: {}, status: 'pending' },
          ],
        }),
      ];
      expect(detectStatus(messages, true)).toBe('working');
    });

    it('returns working when last message is from user', () => {
      const messages = [
        createMessage({ type: 'assistant', timestamp: new Date('2026-01-14T10:00:00Z') }),
        createMessage({
          type: 'user',
          id: 'msg-2',
          timestamp: new Date('2026-01-14T10:00:05Z'),
        }),
      ];
      expect(detectStatus(messages, true)).toBe('working');
    });
  });
});

// ============================================================
// Status Logic - Integration-like Tests
// ============================================================

describe('status detection scenarios', () => {
  it('conversation just started - user sent first message, Claude working', () => {
    const messages = [createMessage({ type: 'user' })];
    // When Claude is running and last message is user's, Claude is working on response
    expect(detectStatus(messages, true)).toBe('working');
  });

  it('Claude finished responding, waiting for next prompt', () => {
    const messages = [
      createMessage({ type: 'user' }),
      createMessage({
        type: 'assistant',
        id: 'msg-2',
        content: 'Done! Let me know if you need anything else.',
        toolUse: undefined,
      }),
    ];
    expect(detectStatus(messages, true)).toBe('waiting');
  });

  it('Claude is writing a file', () => {
    const messages = [
      createMessage({ type: 'user', content: 'Create a new file' }),
      createMessage({
        type: 'assistant',
        id: 'msg-2',
        content: 'I will create the file now.',
        toolUse: [{ tool: 'write_file', input: { path: 'test.txt' }, status: 'pending' }],
      }),
    ];
    expect(detectStatus(messages, true)).toBe('working');
  });

  it('Claude finished running multiple tools', () => {
    const messages = [
      createMessage({ type: 'user', content: 'Setup the project' }),
      createMessage({
        type: 'assistant',
        id: 'msg-2',
        content: 'I have set up your project.',
        toolUse: [
          { tool: 'write_file', input: {}, status: 'complete' },
          { tool: 'run_command', input: {}, status: 'complete' },
          { tool: 'write_file', input: {}, status: 'complete' },
        ],
      }),
    ];
    expect(detectStatus(messages, true)).toBe('waiting');
  });

  it('Mixed tool statuses - some pending means working', () => {
    const messages = [
      createMessage({ type: 'user' }),
      createMessage({
        type: 'assistant',
        id: 'msg-2',
        toolUse: [
          { tool: 'read_file', input: {}, status: 'complete' },
          { tool: 'write_file', input: {}, status: 'pending' },
          { tool: 'run_command', input: {}, status: 'complete' },
        ],
      }),
    ];
    expect(detectStatus(messages, true)).toBe('working');
  });

  it('Tool with error status is not pending', () => {
    const messages = [
      createMessage({ type: 'user' }),
      createMessage({
        type: 'assistant',
        id: 'msg-2',
        toolUse: [{ tool: 'run_command', input: {}, status: 'error' }],
      }),
    ];
    // Error is not pending, so Claude is waiting
    expect(detectStatus(messages, true)).toBe('waiting');
  });
});
