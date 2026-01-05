/**
 * Metigan Library Configuration
 * Central configuration file for all modules
 */

/**
 * Default API URL for Metigan services
 * All API calls are routed through this single endpoint
 * 
 * Can be overridden with METIGAN_API_URL environment variable for testing
 */
export const API_URL = (typeof process !== 'undefined' && process.env?.METIGAN_API_URL) 
  || 'https://api.metigan.com';

/**
 * SDK Version
 */
export const SDK_VERSION = '2.1.2';

/**
 * Default timeout for API requests (in milliseconds)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_RETRY_DELAY = 1000;

/**
 * Maximum file size for attachments (7MB)
 */
export const MAX_FILE_SIZE = 7 * 1024 * 1024;

