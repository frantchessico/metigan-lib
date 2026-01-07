"use strict";
/**
 * Metigan Library Configuration
 * Central configuration file for all modules
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FILE_SIZE = exports.DEFAULT_RETRY_DELAY = exports.DEFAULT_RETRY_COUNT = exports.DEFAULT_TIMEOUT = exports.SDK_VERSION = exports.API_URL = void 0;
/**
 * Default API URL for Metigan services
 * All API calls are routed through this single endpoint
 *
 * Can be overridden with METIGAN_API_URL environment variable for testing
 */
exports.API_URL = (typeof process !== 'undefined' && ((_a = process.env) === null || _a === void 0 ? void 0 : _a.METIGAN_API_URL))
    || 'https://api.metigan.com';
/**
 * SDK Version
 */
exports.SDK_VERSION = '2.2.1';
/**
 * Default timeout for API requests (in milliseconds)
 */
exports.DEFAULT_TIMEOUT = 30000;
/**
 * Default retry configuration
 */
exports.DEFAULT_RETRY_COUNT = 3;
exports.DEFAULT_RETRY_DELAY = 1000;
/**
 * Maximum file size for attachments (7MB)
 */
exports.MAX_FILE_SIZE = 7 * 1024 * 1024;
