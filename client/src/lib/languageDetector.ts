/**
 * Language Detection Utility
 *
 * Maps file extensions to Shiki language identifiers for syntax highlighting.
 * Falls back to 'text' for unknown file types.
 */

/**
 * Detect programming language from file extension
 *
 * @param filePath - File path or file name
 * @returns Shiki language identifier (e.g., 'typescript', 'python', 'markdown')
 *
 * @example
 * ```ts
 * detectLanguage('src/App.tsx') // returns 'tsx'
 * detectLanguage('README.md') // returns 'markdown'
 * detectLanguage('unknown.xyz') // returns 'text'
 * ```
 */
export function detectLanguage(filePath: string): string {
  // Extract extension from file path
  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
    return 'text';
  }

  const ext = filePath.slice(lastDotIndex).toLowerCase();

  // Map file extensions to Shiki language identifiers
  // Based on: https://shiki.style/languages
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.mjs': 'javascript',
    '.cjs': 'javascript',

    // Web languages
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.vue': 'vue',
    '.svelte': 'svelte',

    // Python
    '.py': 'python',
    '.pyw': 'python',
    '.pyi': 'python',

    // Markup/Data
    '.md': 'markdown',
    '.mdx': 'mdx',
    '.json': 'json',
    '.jsonc': 'jsonc',
    '.json5': 'json5',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.xml': 'xml',

    // Shell scripts
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'zsh',
    '.fish': 'fish',

    // Systems programming
    '.c': 'c',
    '.h': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.hpp': 'cpp',
    '.hxx': 'cpp',
    '.c++': 'cpp',
    '.h++': 'cpp',
    '.rs': 'rust',
    '.go': 'go',

    // JVM languages
    '.java': 'java',
    '.kt': 'kotlin',
    '.kts': 'kotlin',
    '.scala': 'scala',
    '.groovy': 'groovy',

    // .NET languages
    '.cs': 'csharp',
    '.vb': 'vb',
    '.fs': 'fsharp',

    // Other popular languages
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.r': 'r',
    '.R': 'r',
    '.lua': 'lua',
    '.pl': 'perl',
    '.pm': 'perl',
    '.sql': 'sql',
    '.graphql': 'graphql',
    '.gql': 'graphql',

    // Configuration files
    '.dockerfile': 'dockerfile',
    '.dockerignore': 'ignore',
    '.gitignore': 'ignore',
    '.gitattributes': 'ignore',
    '.env': 'dotenv',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.conf': 'ini',

    // Other formats
    '.txt': 'text',
    '.log': 'log',
  };

  return languageMap[ext] || 'text';
}

/**
 * Check if a file extension is supported for syntax highlighting
 *
 * @param filePath - File path or file name
 * @returns True if the language is known and not 'text'
 *
 * @example
 * ```ts
 * isKnownLanguage('App.tsx') // returns true
 * isKnownLanguage('unknown.xyz') // returns false
 * ```
 */
export function isKnownLanguage(filePath: string): boolean {
  return detectLanguage(filePath) !== 'text';
}

/**
 * Get a human-readable language name from a file path
 *
 * @param filePath - File path or file name
 * @returns Human-readable language name
 *
 * @example
 * ```ts
 * getLanguageName('App.tsx') // returns 'TypeScript JSX'
 * getLanguageName('script.py') // returns 'Python'
 * ```
 */
export function getLanguageName(filePath: string): string {
  const lang = detectLanguage(filePath);

  const nameMap: Record<string, string> = {
    javascript: 'JavaScript',
    jsx: 'JavaScript JSX',
    typescript: 'TypeScript',
    tsx: 'TypeScript JSX',
    python: 'Python',
    markdown: 'Markdown',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    yaml: 'YAML',
    bash: 'Bash',
    rust: 'Rust',
    go: 'Go',
    java: 'Java',
    csharp: 'C#',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    sql: 'SQL',
    text: 'Text',
  };

  return nameMap[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}
