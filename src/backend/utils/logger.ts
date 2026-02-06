/**
 * Production-safe logger utility
 * Only logs debug/info in development mode
 */

const isDev = process.env.NODE_ENV === 'development';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export const logger: Logger = {
  /**
   * Debug logs - only in development
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Info logs - only in development
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Warnings - only in development
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Errors - always logged
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },
};

export default logger;
