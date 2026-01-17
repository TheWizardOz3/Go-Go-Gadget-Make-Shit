/// <reference types="vite/client" />

/**
 * Environment variable type declarations for GoGoGadgetClaude
 *
 * These are set in:
 * - .env.local (local development)
 * - Vercel dashboard (production)
 */

interface ImportMetaEnv {
  /** Development mode flag */
  readonly DEV: boolean;
  /** Production mode flag */
  readonly PROD: boolean;
  /** Build mode (development, production, etc.) */
  readonly MODE: string;
  /** Base URL for the app */
  readonly BASE_URL: string;

  // ==========================================================================
  // GoGoGadgetClaude Environment Variables
  // ==========================================================================

  /**
   * Laptop API URL via Tailscale
   * Example: https://macbook.tailnet.ts.net:3456
   */
  readonly VITE_LAPTOP_API_URL?: string;

  /**
   * Modal cloud API URL
   * Example: https://username--gogogadget-claude-web.modal.run
   */
  readonly VITE_MODAL_API_URL?: string;

  /**
   * Force cloud mode (for testing)
   * Set to 'true' to skip laptop connectivity check
   */
  readonly VITE_FORCE_CLOUD_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants defined in vite.config.ts
declare const __LAPTOP_API_URL__: string;
declare const __MODAL_API_URL__: string;
