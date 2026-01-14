/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background colors
        background: {
          light: '#FAFAFA',
          dark: '#0A0A0A',
          DEFAULT: 'var(--color-background)',
        },
        // Surface/card colors
        surface: {
          light: '#FFFFFF',
          dark: '#141414',
          DEFAULT: 'var(--color-surface)',
        },
        // Accent/primary colors
        accent: {
          light: '#6366F1',
          dark: '#818CF8',
          DEFAULT: 'var(--color-accent)',
        },
        // Status colors
        success: {
          light: '#10B981',
          dark: '#34D399',
          DEFAULT: 'var(--color-success)',
        },
        error: {
          light: '#EF4444',
          dark: '#F87171',
          DEFAULT: 'var(--color-error)',
        },
        working: {
          light: '#3B82F6',
          dark: '#60A5FA',
          DEFAULT: 'var(--color-working)',
        },
        warning: {
          light: '#F59E0B',
          dark: '#FBBF24',
          DEFAULT: 'var(--color-warning)',
        },
        // Text colors
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
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
