/**
 * Tests for Path Encoder/Decoder
 *
 * Note: The encoding scheme has a known limitation - paths with hyphens
 * cannot be correctly decoded. This is documented in ADR-008.
 * The preferred approach is to extract the project path from JSONL cwd field.
 */

import { describe, it, expect } from 'vitest';
import {
  encodePath,
  decodePath,
  getProjectName,
  getProjectNameFromEncoded,
  isEncodedPath,
  isAbsolutePath,
  getProjectSessionsPath,
  getClaudeBasePath,
  getProjectsBasePath,
} from './pathEncoder.js';

// ============================================================
// encodePath Tests
// ============================================================

describe('encodePath', () => {
  it('encodes a simple Unix path', () => {
    expect(encodePath('/Users/derek/project')).toBe('-Users-derek-project');
  });

  it('encodes path with single directory', () => {
    expect(encodePath('/home')).toBe('-home');
  });

  it('encodes deeply nested path', () => {
    expect(encodePath('/Users/derek/Documents/code/my-app')).toBe(
      '-Users-derek-Documents-code-my-app'
    );
  });

  it('preserves trailing slashes (encoded as trailing dash)', () => {
    // Note: path.normalize does NOT remove trailing slashes on POSIX
    expect(encodePath('/Users/derek/project/')).toBe('-Users-derek-project-');
  });

  it('handles paths with dots', () => {
    expect(encodePath('/Users/derek/.config')).toBe('-Users-derek-.config');
  });
});

// ============================================================
// decodePath Tests
// ============================================================

describe('decodePath', () => {
  it('decodes a simple encoded path', () => {
    expect(decodePath('-Users-derek-project')).toBe('/Users/derek/project');
  });

  it('decodes path with single directory', () => {
    expect(decodePath('-home')).toBe('/home');
  });

  it('round-trips with encodePath for paths without hyphens', () => {
    const original = '/Users/derek/Documents/code';
    expect(decodePath(encodePath(original))).toBe(original);
  });

  it('KNOWN LIMITATION: cannot correctly decode paths with hyphens', () => {
    // This demonstrates the known limitation documented in ADR-008
    // A path like /Users/derek/my-project gets encoded as -Users-derek-my-project
    // When decoded, it becomes /Users/derek/my/project (wrong!)
    const encoded = encodePath('/Users/derek/my-project');
    const decoded = decodePath(encoded);

    // This is INCORRECT but expected behavior
    expect(decoded).toBe('/Users/derek/my/project'); // NOT /Users/derek/my-project

    // This is why we use extractProjectPath() from JSONL instead
  });
});

// ============================================================
// getProjectName Tests
// ============================================================

describe('getProjectName', () => {
  it('extracts basename from absolute path', () => {
    expect(getProjectName('/Users/derek/myproject')).toBe('myproject');
  });

  it('extracts basename from nested path', () => {
    expect(getProjectName('/Users/derek/code/awesome-app')).toBe('awesome-app');
  });

  it('handles root path', () => {
    expect(getProjectName('/home')).toBe('home');
  });

  it('handles trailing slash', () => {
    expect(getProjectName('/Users/derek/project/')).toBe('project');
  });
});

// ============================================================
// getProjectNameFromEncoded Tests
// ============================================================

describe('getProjectNameFromEncoded', () => {
  it('extracts project name from encoded path', () => {
    expect(getProjectNameFromEncoded('-Users-derek-myproject')).toBe('myproject');
  });

  it('handles encoded path with hyphenated project name (note: may be incorrect)', () => {
    // Due to the encoding limitation, project names with hyphens
    // will be split incorrectly
    const result = getProjectNameFromEncoded('-Users-derek-my-project');
    // This returns 'project' instead of 'my-project'
    expect(result).toBe('project'); // Known limitation
  });
});

// ============================================================
// isEncodedPath Tests
// ============================================================

describe('isEncodedPath', () => {
  it('returns true for valid encoded paths', () => {
    expect(isEncodedPath('-Users-derek-project')).toBe(true);
  });

  it('returns true for minimal encoded path', () => {
    expect(isEncodedPath('-h')).toBe(true);
  });

  it('returns false for absolute paths', () => {
    expect(isEncodedPath('/Users/derek/project')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isEncodedPath('')).toBe(false);
  });

  it('returns false for single dash', () => {
    expect(isEncodedPath('-')).toBe(false);
  });

  it('returns false for non-encoded strings', () => {
    expect(isEncodedPath('myproject')).toBe(false);
    expect(isEncodedPath('some-file.txt')).toBe(false);
  });
});

// ============================================================
// isAbsolutePath Tests
// ============================================================

describe('isAbsolutePath', () => {
  it('returns true for Unix absolute paths', () => {
    expect(isAbsolutePath('/Users/derek')).toBe(true);
    expect(isAbsolutePath('/home/user')).toBe(true);
    expect(isAbsolutePath('/')).toBe(true);
  });

  it('returns false for relative paths', () => {
    expect(isAbsolutePath('myproject')).toBe(false);
    expect(isAbsolutePath('./myproject')).toBe(false);
    expect(isAbsolutePath('../parent')).toBe(false);
  });

  it('returns false for encoded paths', () => {
    expect(isAbsolutePath('-Users-derek-project')).toBe(false);
  });
});

// ============================================================
// getProjectSessionsPath Tests
// ============================================================

describe('getProjectSessionsPath', () => {
  it('constructs correct path with custom base', () => {
    const result = getProjectSessionsPath('/Users/derek/project', '/custom/.claude');
    expect(result).toBe('/custom/.claude/projects/-Users-derek-project');
  });

  it('uses HOME env var when base not provided', () => {
    const originalHome = process.env.HOME;
    process.env.HOME = '/Users/testuser';

    const result = getProjectSessionsPath('/Users/testuser/myapp');
    expect(result).toBe('/Users/testuser/.claude/projects/-Users-testuser-myapp');

    process.env.HOME = originalHome;
  });
});

// ============================================================
// getClaudeBasePath Tests
// ============================================================

describe('getClaudeBasePath', () => {
  it('returns path based on HOME env var', () => {
    const originalHome = process.env.HOME;
    process.env.HOME = '/Users/testuser';

    expect(getClaudeBasePath()).toBe('/Users/testuser/.claude');

    process.env.HOME = originalHome;
  });

  it('handles missing HOME gracefully', () => {
    const originalHome = process.env.HOME;
    delete process.env.HOME;

    expect(getClaudeBasePath()).toBe('.claude');

    process.env.HOME = originalHome;
  });
});

// ============================================================
// getProjectsBasePath Tests
// ============================================================

describe('getProjectsBasePath', () => {
  it('returns projects subdirectory of claude base', () => {
    const originalHome = process.env.HOME;
    process.env.HOME = '/Users/testuser';

    expect(getProjectsBasePath()).toBe('/Users/testuser/.claude/projects');

    process.env.HOME = originalHome;
  });
});
