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
export declare const API_URL: string;
/**
 * SDK Version
 */
export declare const SDK_VERSION = "2.2.1";
/**
 * Default timeout for API requests (in milliseconds)
 */
export declare const DEFAULT_TIMEOUT = 30000;
/**
 * Default retry configuration
 */
export declare const DEFAULT_RETRY_COUNT = 3;
export declare const DEFAULT_RETRY_DELAY = 1000;
/**
 * Maximum file size for attachments (7MB)
 */
export declare const MAX_FILE_SIZE: number;
