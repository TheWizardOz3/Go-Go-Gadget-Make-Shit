/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background colors - Claude warm palette
        background: {
          light: '#FAF8F5',
          dark: '#1a1816',
          DEFAULT: 'var(--color-background)',
        },
        // Surface/card colors
        surface: {
          light: '#FFFFFF',
          dark: '#242220',
          elevated: 'var(--color-surface-elevated)',
          DEFAULT: 'var(--color-surface)',
        },
        // Accent/primary colors - warm terracotta
        accent: {
          light: '#c97a62',
          dark: '#d4826a',
          hover: 'var(--color-accent-hover)',
          DEFAULT: 'var(--color-accent)',
        },
        // Status colors - warm variants
        success: {
          light: '#7aa356',
          dark: '#8cb369',
          DEFAULT: 'var(--color-success)',
        },
        error: {
          light: '#d76a4f',
          dark: '#e07a5f',
          DEFAULT: 'var(--color-error)',
        },
        working: {
          light: '#c97a62',
          dark: '#d4826a',
          DEFAULT: 'var(--color-working)',
        },
        warning: {
          light: '#e0b97f',
          dark: '#f2cc8f',
          DEFAULT: 'var(--color-warning)',
        },
        // Text colors
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        // Conversation-specific colors
        user: {
          bg: 'var(--color-user-bg)',
          border: 'var(--color-user-border)',
        },
        claude: {
          bg: 'var(--color-claude-bg)',
        },
        tool: {
          bg: 'var(--color-tool-bg)',
          border: 'var(--color-tool-border)',
        },
        thinking: {
          bg: 'var(--color-thinking-bg)',
          border: 'var(--color-thinking-border)',
        },
      },
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        // Mobile-optimized sizes
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      spacing: {
        // Touch-friendly spacing
        touch: '44px', // Minimum touch target
        'touch-lg': '48px', // Preferred touch target
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
