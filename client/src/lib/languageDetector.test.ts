/**
 * Tests for Language Detector
 *
 * Tests file extension to language mapping for syntax highlighting.
 */

import { describe, it, expect } from 'vitest';
import { detectLanguage } from './languageDetector';

describe('detectLanguage', () => {
  describe('JavaScript/TypeScript', () => {
    it('should detect .ts files as typescript', () => {
      expect(detectLanguage('src/utils.ts')).toBe('typescript');
      expect(detectLanguage('/path/to/file.ts')).toBe('typescript');
    });

    it('should detect .tsx files as tsx', () => {
      expect(detectLanguage('components/Button.tsx')).toBe('tsx');
    });

    it('should detect .js files as javascript', () => {
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('config.cjs')).toBe('javascript');
      expect(detectLanguage('module.mjs')).toBe('javascript');
    });

    it('should detect .jsx files as jsx', () => {
      expect(detectLanguage('Component.jsx')).toBe('jsx');
    });
  });

  describe('Python', () => {
    it('should detect .py files as python', () => {
      expect(detectLanguage('script.py')).toBe('python');
      expect(detectLanguage('main.pyw')).toBe('python');
    });
  });

  describe('Web Languages', () => {
    it('should detect .html files as html', () => {
      expect(detectLanguage('index.html')).toBe('html');
      expect(detectLanguage('page.htm')).toBe('html');
    });

    it('should detect .css files as css', () => {
      expect(detectLanguage('styles.css')).toBe('css');
    });

    it('should detect .scss files as scss', () => {
      expect(detectLanguage('styles.scss')).toBe('scss');
    });

    it('should detect .sass files as sass', () => {
      expect(detectLanguage('styles.sass')).toBe('sass');
    });

    it('should detect .less files as less', () => {
      expect(detectLanguage('styles.less')).toBe('less');
    });
  });

  describe('Data Formats', () => {
    it('should detect .json files as json', () => {
      expect(detectLanguage('package.json')).toBe('json');
      expect(detectLanguage('config.json')).toBe('json');
    });

    it('should detect .yaml files as yaml', () => {
      expect(detectLanguage('config.yaml')).toBe('yaml');
      expect(detectLanguage('docker-compose.yml')).toBe('yaml');
    });

    it('should detect .xml files as xml', () => {
      expect(detectLanguage('config.xml')).toBe('xml');
    });

    it('should detect .toml files as toml', () => {
      expect(detectLanguage('Cargo.toml')).toBe('toml');
    });
  });

  describe('Markdown and Text', () => {
    it('should detect .md files as markdown', () => {
      expect(detectLanguage('README.md')).toBe('markdown');
      expect(detectLanguage('docs.mdx')).toBe('mdx');
    });

    it('should detect .txt files as text', () => {
      expect(detectLanguage('notes.txt')).toBe('text');
    });
  });

  describe('Other Languages', () => {
    it('should detect Rust files', () => {
      expect(detectLanguage('main.rs')).toBe('rust');
    });

    it('should detect Go files', () => {
      expect(detectLanguage('server.go')).toBe('go');
    });

    it('should detect Java files', () => {
      expect(detectLanguage('Main.java')).toBe('java');
    });

    it('should detect C/C++ files', () => {
      expect(detectLanguage('program.c')).toBe('c');
      expect(detectLanguage('program.cpp')).toBe('cpp');
      expect(detectLanguage('program.cc')).toBe('cpp');
      expect(detectLanguage('program.cxx')).toBe('cpp');
      expect(detectLanguage('header.h')).toBe('c');
      expect(detectLanguage('header.hpp')).toBe('cpp');
    });

    it('should detect C# files', () => {
      expect(detectLanguage('Program.cs')).toBe('csharp');
    });

    it('should detect PHP files', () => {
      expect(detectLanguage('index.php')).toBe('php');
    });

    it('should detect Ruby files', () => {
      expect(detectLanguage('script.rb')).toBe('ruby');
    });

    it('should detect Shell files', () => {
      expect(detectLanguage('script.sh')).toBe('bash');
      expect(detectLanguage('script.bash')).toBe('bash');
      expect(detectLanguage('script.zsh')).toBe('zsh');
      expect(detectLanguage('script.fish')).toBe('fish');
    });

    it('should detect Swift files', () => {
      expect(detectLanguage('ViewController.swift')).toBe('swift');
    });

    it('should detect Kotlin files', () => {
      expect(detectLanguage('MainActivity.kt')).toBe('kotlin');
    });

    it('should detect SQL files', () => {
      expect(detectLanguage('query.sql')).toBe('sql');
    });

    it('should detect Dockerfile', () => {
      // Dockerfile has no extension, so it returns 'text'
      expect(detectLanguage('Dockerfile')).toBe('text');
      // .dockerfile extension returns 'dockerfile'
      expect(detectLanguage('app.dockerfile')).toBe('dockerfile');
    });
  });

  describe('Unknown Extensions', () => {
    it('should return "text" for unknown extensions', () => {
      expect(detectLanguage('file.unknown')).toBe('text');
      expect(detectLanguage('file.xyz')).toBe('text');
      expect(detectLanguage('noextension')).toBe('text');
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle uppercase extensions', () => {
      expect(detectLanguage('FILE.TS')).toBe('typescript');
      expect(detectLanguage('FILE.PY')).toBe('python');
      expect(detectLanguage('FILE.JSON')).toBe('json');
    });

    it('should handle mixed case extensions', () => {
      expect(detectLanguage('file.Ts')).toBe('typescript');
      expect(detectLanguage('file.Py')).toBe('python');
    });
  });

  describe('Path Handling', () => {
    it('should work with nested paths', () => {
      expect(detectLanguage('src/components/ui/Button.tsx')).toBe('tsx');
      expect(detectLanguage('/absolute/path/to/file.py')).toBe('python');
    });

    it('should work with files starting with dot', () => {
      expect(detectLanguage('.eslintrc.js')).toBe('javascript');
      expect(detectLanguage('.prettierrc.json')).toBe('json');
    });

    it('should handle multiple dots in filename', () => {
      expect(detectLanguage('file.test.ts')).toBe('typescript');
      expect(detectLanguage('component.spec.tsx')).toBe('tsx');
    });
  });
});
