import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    // Define environment variables to expose to the client
    define: {
      // These will be available as import.meta.env.VITE_*
      __LAPTOP_API_URL__: JSON.stringify(env.VITE_LAPTOP_API_URL || ''),
      __MODAL_API_URL__: JSON.stringify(env.VITE_MODAL_API_URL || ''),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3456',
          changeOrigin: true,
        },
      },
    },
    build: {
      // Generate source maps for debugging
      sourcemap: true,
      // Rollup options for production build
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
