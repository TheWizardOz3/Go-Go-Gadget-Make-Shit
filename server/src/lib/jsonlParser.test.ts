/**
 * Tests for JSONL Parser
 */

import { describe, it, expect } from 'vitest';
import {
  transformToMessages,
  getSessionMetadata,
  filterMessagesSince,
  extractProjectPath,
  getFirstUserMessagePreview,
  type RawJsonlEntry,
  type UserJsonlEntry,
  type AssistantJsonlEntry,
} from './jsonlParser.js';

// ============================================================
// Test Fixtures
// ============================================================

const createUserEntry = (overrides: Partial<UserJsonlEntry> = {}): UserJsonlEntry => ({
  uuid: 'user-1',
  parentUuid: null,
  timestamp: '2026-01-14T10:00:00Z',
  sessionId: 'session-1',
  type: 'user',
  cwd: '/Users/test/project',
  message: {
    role: 'user',
    content: 'Hello, Claude!',
  },
  ...overrides,
});

const createAssistantEntry = (
  overrides: Partial<AssistantJsonlEntry> = {}
): AssistantJsonlEntry => ({
  uuid: 'assistant-1',
  parentUuid: 'user-1',
  timestamp: '2026-01-14T10:00:05Z',
  sessionId: 'session-1',
  type: 'assistant',
  cwd: '/Users/test/project',
  message: {
    role: 'assistant',
    content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
  },
  ...overrides,
});

// ============================================================
// transformToMessages Tests
// ============================================================

describe('transformToMessages', () => {
  it('parses a simple user message with string content', () => {
    const entries: RawJsonlEntry[] = [createUserEntry()];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: 'user-1',
      sessionId: 'session-1',
      type: 'user',
      content: 'Hello, Claude!',
    });
    expect(messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('parses user message with content blocks (array format)', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({
        message: {
          role: 'user',
          content: [
            { type: 'text', text: 'First part.' },
            { type: 'text', text: 'Second part.' },
          ],
        },
      }),
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('First part.\n\nSecond part.');
  });

  it('parses assistant message with text content blocks', () => {
    const entries: RawJsonlEntry[] = [createAssistantEntry()];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: 'assistant-1',
      type: 'assistant',
      content: 'Hello! How can I help you today?',
    });
  });

  it('extracts tool use from assistant messages', () => {
    const entries: RawJsonlEntry[] = [
      createAssistantEntry({
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'I will create a file for you.' },
            {
              type: 'tool_use',
              name: 'write_file',
              input: { path: 'test.txt', content: 'Hello!' },
            },
          ],
        },
      }),
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0].toolUse).toBeDefined();
    expect(messages[0].toolUse).toHaveLength(1);
    expect(messages[0].toolUse![0]).toMatchObject({
      tool: 'write_file',
      input: { path: 'test.txt', content: 'Hello!' },
      status: 'complete',
    });
  });

  it('sorts messages by timestamp', () => {
    const entries: RawJsonlEntry[] = [
      createAssistantEntry({ uuid: 'a2', timestamp: '2026-01-14T10:00:10Z' }),
      createUserEntry({ uuid: 'u1', timestamp: '2026-01-14T10:00:00Z' }),
      createUserEntry({ uuid: 'u2', timestamp: '2026-01-14T10:00:05Z' }),
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(3);
    expect(messages[0].id).toBe('u1');
    expect(messages[1].id).toBe('u2');
    expect(messages[2].id).toBe('a2');
  });

  it('filters out file-history-snapshot entries', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry(),
      {
        uuid: 'snapshot-1',
        parentUuid: null,
        timestamp: '2026-01-14T10:00:00Z',
        sessionId: 'session-1',
        type: 'file-history-snapshot',
        messageId: 'user-1',
        snapshot: {},
      } as RawJsonlEntry,
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('user');
  });

  it('filters out meta messages (isMeta: true)', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry(),
      createUserEntry({ uuid: 'meta-1', isMeta: true }),
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('user-1');
  });

  it('filters out API error messages', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry(),
      createAssistantEntry({ uuid: 'error-1', isApiErrorMessage: true }),
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('user-1');
  });

  it('returns empty array for empty input', () => {
    const messages = transformToMessages([], 'session-1');
    expect(messages).toEqual([]);
  });

  it('handles multiple tool uses in a single message', () => {
    const entries: RawJsonlEntry[] = [
      createAssistantEntry({
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Creating files...' },
            { type: 'tool_use', name: 'write_file', input: { path: 'a.txt' } },
            { type: 'tool_use', name: 'run_command', input: { command: 'ls' } },
          ],
        },
      }),
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages[0].toolUse).toHaveLength(2);
    expect(messages[0].toolUse![0].tool).toBe('write_file');
    expect(messages[0].toolUse![1].tool).toBe('run_command');
  });

  it('handles assistant message with string content (not array)', () => {
    const entries: RawJsonlEntry[] = [
      createAssistantEntry({
        message: {
          role: 'assistant',
          content: 'Simple string response',
        },
      }),
    ];
    const messages = transformToMessages(entries, 'session-1');

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Simple string response');
    expect(messages[0].toolUse).toBeUndefined();
  });
});

// ============================================================
// getSessionMetadata Tests
// ============================================================

describe('getSessionMetadata', () => {
  it('returns correct metadata for messages', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({ timestamp: '2026-01-14T10:00:00Z' }),
      createAssistantEntry({ timestamp: '2026-01-14T10:00:05Z' }),
      createUserEntry({ uuid: 'user-2', timestamp: '2026-01-14T10:00:10Z' }),
    ];
    const metadata = getSessionMetadata(entries);

    expect(metadata.messageCount).toBe(3);
    expect(metadata.startedAt).toEqual(new Date('2026-01-14T10:00:00Z'));
    expect(metadata.lastActivityAt).toEqual(new Date('2026-01-14T10:00:10Z'));
  });

  it('returns nulls and zero for empty entries', () => {
    const metadata = getSessionMetadata([]);

    expect(metadata.messageCount).toBe(0);
    expect(metadata.startedAt).toBeNull();
    expect(metadata.lastActivityAt).toBeNull();
  });

  it('excludes filtered entries from count', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry(),
      createUserEntry({ uuid: 'meta', isMeta: true }),
      {
        uuid: 'snapshot',
        parentUuid: null,
        timestamp: '2026-01-14T10:00:00Z',
        sessionId: 'session-1',
        type: 'file-history-snapshot',
        messageId: 'user-1',
        snapshot: {},
      } as RawJsonlEntry,
    ];
    const metadata = getSessionMetadata(entries);

    expect(metadata.messageCount).toBe(1);
  });
});

// ============================================================
// filterMessagesSince Tests
// ============================================================

describe('filterMessagesSince', () => {
  it('filters messages after the given timestamp', () => {
    const messages: import('./jsonlParser.js').Message[] = [
      {
        id: '1',
        sessionId: 's1',
        type: 'user',
        content: '',
        timestamp: new Date('2026-01-14T10:00:00Z'),
      },
      {
        id: '2',
        sessionId: 's1',
        type: 'user',
        content: '',
        timestamp: new Date('2026-01-14T10:00:05Z'),
      },
      {
        id: '3',
        sessionId: 's1',
        type: 'user',
        content: '',
        timestamp: new Date('2026-01-14T10:00:10Z'),
      },
    ];

    const since = new Date('2026-01-14T10:00:05Z');
    const filtered = filterMessagesSince(messages, since);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('3');
  });

  it('returns all messages if since is before all timestamps', () => {
    const messages: import('./jsonlParser.js').Message[] = [
      {
        id: '1',
        sessionId: 's1',
        type: 'user',
        content: '',
        timestamp: new Date('2026-01-14T10:00:00Z'),
      },
      {
        id: '2',
        sessionId: 's1',
        type: 'user',
        content: '',
        timestamp: new Date('2026-01-14T10:00:05Z'),
      },
    ];

    const since = new Date('2026-01-13T00:00:00Z');
    const filtered = filterMessagesSince(messages, since);

    expect(filtered).toHaveLength(2);
  });

  it('returns empty array if since is after all timestamps', () => {
    const messages: import('./jsonlParser.js').Message[] = [
      {
        id: '1',
        sessionId: 's1',
        type: 'user',
        content: '',
        timestamp: new Date('2026-01-14T10:00:00Z'),
      },
    ];

    const since = new Date('2026-01-15T00:00:00Z');
    const filtered = filterMessagesSince(messages, since);

    expect(filtered).toHaveLength(0);
  });
});

// ============================================================
// extractProjectPath Tests
// ============================================================

describe('extractProjectPath', () => {
  it('extracts cwd from the first entry that has it', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({ cwd: '/Users/test/my-project' }),
      createAssistantEntry({ cwd: '/Users/test/my-project' }),
    ];
    const path = extractProjectPath(entries);

    expect(path).toBe('/Users/test/my-project');
  });

  it('returns null if no entry has cwd', () => {
    const entries: RawJsonlEntry[] = [{ ...createUserEntry(), cwd: undefined }];
    const path = extractProjectPath(entries);

    expect(path).toBeNull();
  });

  it('returns null for empty entries', () => {
    const path = extractProjectPath([]);
    expect(path).toBeNull();
  });

  it('skips entries without cwd and finds one that has it', () => {
    const entries: RawJsonlEntry[] = [
      { ...createUserEntry(), uuid: 'u1', cwd: undefined },
      createUserEntry({ uuid: 'u2', cwd: '/Users/found/path' }),
    ];
    const path = extractProjectPath(entries);

    expect(path).toBe('/Users/found/path');
  });
});

// ============================================================
// getFirstUserMessagePreview Tests
// ============================================================

describe('getFirstUserMessagePreview', () => {
  it('returns the first user message content', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({ message: { role: 'user', content: 'Hello Claude!' } }),
      createAssistantEntry(),
    ];
    const preview = getFirstUserMessagePreview(entries);

    expect(preview).toBe('Hello Claude!');
  });

  it('returns null for empty entries', () => {
    const preview = getFirstUserMessagePreview([]);
    expect(preview).toBeNull();
  });

  it('returns null when no user messages exist', () => {
    const entries: RawJsonlEntry[] = [createAssistantEntry()];
    const preview = getFirstUserMessagePreview(entries);

    expect(preview).toBeNull();
  });

  it('truncates long messages with ellipsis', () => {
    const longMessage = 'A'.repeat(150);
    const entries: RawJsonlEntry[] = [
      createUserEntry({ message: { role: 'user', content: longMessage } }),
    ];
    const preview = getFirstUserMessagePreview(entries, 100);

    expect(preview).toHaveLength(100);
    expect(preview?.endsWith('…')).toBe(true);
  });

  it('does not truncate messages at or under maxLength', () => {
    const shortMessage = 'A'.repeat(50);
    const entries: RawJsonlEntry[] = [
      createUserEntry({ message: { role: 'user', content: shortMessage } }),
    ];
    const preview = getFirstUserMessagePreview(entries, 100);

    expect(preview).toBe(shortMessage);
    expect(preview?.endsWith('…')).toBe(false);
  });

  it('respects custom maxLength parameter', () => {
    const message = 'A'.repeat(100);
    const entries: RawJsonlEntry[] = [
      createUserEntry({ message: { role: 'user', content: message } }),
    ];
    const preview = getFirstUserMessagePreview(entries, 50);

    expect(preview).toHaveLength(50);
    expect(preview?.endsWith('…')).toBe(true);
  });

  it('cleans up extra whitespace and uses · separator for line breaks', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({
        message: { role: 'user', content: '  Hello    World  \n\n  Test  ' },
      }),
    ];
    const preview = getFirstUserMessagePreview(entries);

    // Line breaks become " · " separators to preserve structure visibility
    expect(preview).toBe('Hello World · Test');
  });

  it('skips empty user messages and finds the next one', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({
        uuid: 'user-1',
        timestamp: '2026-01-14T10:00:00Z',
        message: { role: 'user', content: '   ' }, // Empty after trimming
      }),
      createUserEntry({
        uuid: 'user-2',
        timestamp: '2026-01-14T10:00:05Z',
        message: { role: 'user', content: 'Actual content' },
      }),
    ];
    const preview = getFirstUserMessagePreview(entries);

    expect(preview).toBe('Actual content');
  });

  it('handles content as array of text blocks with · separator', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({
        message: {
          role: 'user',
          content: [
            { type: 'text', text: 'First part.' },
            { type: 'text', text: 'Second part.' },
          ],
        },
      }),
    ];
    const preview = getFirstUserMessagePreview(entries);

    // Content blocks are joined with line breaks which become " · " separators
    expect(preview).toBe('First part. · Second part.');
  });

  it('returns first user message by timestamp order', () => {
    const entries: RawJsonlEntry[] = [
      createUserEntry({
        uuid: 'user-late',
        timestamp: '2026-01-14T10:00:10Z',
        message: { role: 'user', content: 'Later message' },
      }),
      createUserEntry({
        uuid: 'user-early',
        timestamp: '2026-01-14T10:00:00Z',
        message: { role: 'user', content: 'Earlier message' },
      }),
    ];
    const preview = getFirstUserMessagePreview(entries);

    expect(preview).toBe('Earlier message');
  });
});
