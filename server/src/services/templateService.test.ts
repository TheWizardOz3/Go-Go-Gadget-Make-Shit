/**
 * Tests for Template Service
 *
 * Tests YAML parsing, default fallback, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTemplates, getDefaultTemplates } from './templateService.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock yaml
vi.mock('yaml', () => ({
  parse: vi.fn(),
}));

// Mock pathEncoder
vi.mock('../lib/pathEncoder.js', () => ({
  decodePath: vi.fn((encoded: string) => `/decoded${encoded}`),
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';

const mockReadFile = vi.mocked(readFile);
const mockParseYaml = vi.mocked(parseYaml);

describe('templateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDefaultTemplates', () => {
    it('should return 6 default templates', () => {
      const templates = getDefaultTemplates();

      expect(templates).toHaveLength(6);
    });

    it('should include all vibe-coding workflow templates', () => {
      const templates = getDefaultTemplates();
      const labels = templates.map((t) => t.label);

      expect(labels).toContain('Plan Milestone');
      expect(labels).toContain('Plan Feature');
      expect(labels).toContain('Build Task');
      expect(labels).toContain('Test');
      expect(labels).toContain('Finalize');
      expect(labels).toContain('Fix/Update');
    });

    it('should have correct icons for each template', () => {
      const templates = getDefaultTemplates();

      const templateMap = Object.fromEntries(templates.map((t) => [t.label, t.icon]));

      expect(templateMap['Plan Milestone']).toBe('📋');
      expect(templateMap['Plan Feature']).toBe('📝');
      expect(templateMap['Build Task']).toBe('🔨');
      expect(templateMap['Test']).toBe('🧪');
      expect(templateMap['Finalize']).toBe('✅');
      expect(templateMap['Fix/Update']).toBe('🔧');
    });

    it('should have non-empty prompts for each template', () => {
      const templates = getDefaultTemplates();

      for (const template of templates) {
        expect(template.prompt).toBeDefined();
        expect(template.prompt.length).toBeGreaterThan(100);
      }
    });

    it('should have "Plan Milestone" with correct prompt structure', () => {
      const templates = getDefaultTemplates();
      const planMilestone = templates.find((t) => t.label === 'Plan Milestone');

      expect(planMilestone).toBeDefined();
      expect(planMilestone!.prompt).toContain('# Plan Milestone');
      expect(planMilestone!.prompt).toContain('[MILESTONE NAME]');
      expect(planMilestone!.prompt).toContain('docs/project_status.md');
    });
  });

  describe('getTemplates', () => {
    describe('when templates.yaml exists and is valid', () => {
      it('should return parsed templates from file', async () => {
        const customTemplates = {
          templates: [
            { label: 'Custom 1', icon: '🎯', prompt: 'Do something' },
            { label: 'Custom 2', icon: '🚀', prompt: 'Do something else' },
          ],
        };

        mockReadFile.mockResolvedValue('yaml content');
        mockParseYaml.mockReturnValue(customTemplates);

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(2);
        expect(templates[0].label).toBe('Custom 1');
        expect(templates[0].icon).toBe('🎯');
        expect(templates[1].label).toBe('Custom 2');
      });

      it('should use default icon if not specified in yaml', async () => {
        const customTemplates = {
          templates: [{ label: 'No Icon Template', prompt: 'Do something' }],
        };

        mockReadFile.mockResolvedValue('yaml content');
        mockParseYaml.mockReturnValue(customTemplates);

        const templates = await getTemplates('-test-project');

        expect(templates[0].icon).toBe('📌');
      });

      it('should filter out templates without required fields', async () => {
        const customTemplates = {
          templates: [
            { label: 'Valid', prompt: 'Valid prompt' },
            { label: 'Missing Prompt' }, // No prompt
            { prompt: 'Missing Label' }, // No label
            { label: '', prompt: 'Empty label' }, // Empty label
            { label: 'Also Valid', prompt: 'Another prompt' },
          ],
        };

        mockReadFile.mockResolvedValue('yaml content');
        mockParseYaml.mockReturnValue(customTemplates);

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(2);
        expect(templates[0].label).toBe('Valid');
        expect(templates[1].label).toBe('Also Valid');
      });
    });

    describe('when templates.yaml does not exist', () => {
      it('should return default templates', async () => {
        const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
        enoentError.code = 'ENOENT';
        mockReadFile.mockRejectedValue(enoentError);

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(6);
        expect(templates[0].label).toBe('Plan Milestone');
      });
    });

    describe('when templates.yaml is invalid', () => {
      it('should return defaults when yaml has no templates array', async () => {
        mockReadFile.mockResolvedValue('yaml content');
        mockParseYaml.mockReturnValue({ other: 'data' });

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(6);
        expect(templates[0].label).toBe('Plan Milestone');
      });

      it('should return defaults when templates is not an array', async () => {
        mockReadFile.mockResolvedValue('yaml content');
        mockParseYaml.mockReturnValue({ templates: 'not an array' });

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(6);
      });

      it('should return defaults when all templates are invalid', async () => {
        mockReadFile.mockResolvedValue('yaml content');
        mockParseYaml.mockReturnValue({
          templates: [{ label: 'No prompt' }, { prompt: 'No label' }],
        });

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(6);
      });

      it('should return defaults when yaml parse returns null', async () => {
        mockReadFile.mockResolvedValue('yaml content');
        mockParseYaml.mockReturnValue(null);

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(6);
      });
    });

    describe('when file read fails with non-ENOENT error', () => {
      it('should return defaults on permission error', async () => {
        const permError = new Error('EACCES') as NodeJS.ErrnoException;
        permError.code = 'EACCES';
        mockReadFile.mockRejectedValue(permError);

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(6);
      });

      it('should return defaults on generic error', async () => {
        mockReadFile.mockRejectedValue(new Error('Unknown error'));

        const templates = await getTemplates('-test-project');

        expect(templates).toHaveLength(6);
      });
    });

    describe('path handling', () => {
      it('should read from correct file path', async () => {
        const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
        enoentError.code = 'ENOENT';
        mockReadFile.mockRejectedValue(enoentError);

        await getTemplates('-Users-test-myproject');

        expect(mockReadFile).toHaveBeenCalledWith(
          '/decoded-Users-test-myproject/.claude/templates.yaml',
          'utf-8'
        );
      });
    });
  });
});
