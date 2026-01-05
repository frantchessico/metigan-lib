"use strict";
/**
 * Metigan - Complete Marketing Automation Library
 * Email, Forms, Contacts, Audiences, and Templates management
 * @version 2.2.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metigan = exports.BLOCKED_MIME_TYPES = exports.ALLOWED_MIME_TYPES = exports.DebugLogger = exports.RateLimiter = exports.isSafeFileExtension = exports.isAllowedMimeType = exports.sanitizeSubject = exports.sanitizeEmail = exports.sanitizeHtml = exports.MAX_FILE_SIZE = exports.DEFAULT_RETRY_DELAY = exports.DEFAULT_RETRY_COUNT = exports.DEFAULT_TIMEOUT = exports.SDK_VERSION = exports.API_URL = exports.ApiError = exports.ValidationError = exports.MetiganError = exports.MetiganTemplates = exports.MetiganAudiences = exports.MetiganContacts = exports.MetiganForms = exports.MetiganEmailClient = exports.MetiganEmail = void 0;
// Export main email class
var metigan_1 = require("./lib/metigan");
Object.defineProperty(exports, "MetiganEmail", { enumerable: true, get: function () { return __importDefault(metigan_1).default; } });
Object.defineProperty(exports, "MetiganEmailClient", { enumerable: true, get: function () { return metigan_1.Metigan; } });
// Export modules
var forms_1 = require("./lib/forms");
Object.defineProperty(exports, "MetiganForms", { enumerable: true, get: function () { return forms_1.MetiganForms; } });
var contacts_1 = require("./lib/contacts");
Object.defineProperty(exports, "MetiganContacts", { enumerable: true, get: function () { return contacts_1.MetiganContacts; } });
var audiences_1 = require("./lib/audiences");
Object.defineProperty(exports, "MetiganAudiences", { enumerable: true, get: function () { return audiences_1.MetiganAudiences; } });
var templates_1 = require("./lib/templates");
Object.defineProperty(exports, "MetiganTemplates", { enumerable: true, get: function () { return templates_1.MetiganTemplates; } });
// Export errors
var errors_1 = require("./lib/errors");
Object.defineProperty(exports, "MetiganError", { enumerable: true, get: function () { return errors_1.MetiganError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
Object.defineProperty(exports, "ApiError", { enumerable: true, get: function () { return errors_1.ApiError; } });
// Export configuration constants
var config_1 = require("./lib/config");
Object.defineProperty(exports, "API_URL", { enumerable: true, get: function () { return config_1.API_URL; } });
Object.defineProperty(exports, "SDK_VERSION", { enumerable: true, get: function () { return config_1.SDK_VERSION; } });
Object.defineProperty(exports, "DEFAULT_TIMEOUT", { enumerable: true, get: function () { return config_1.DEFAULT_TIMEOUT; } });
Object.defineProperty(exports, "DEFAULT_RETRY_COUNT", { enumerable: true, get: function () { return config_1.DEFAULT_RETRY_COUNT; } });
Object.defineProperty(exports, "DEFAULT_RETRY_DELAY", { enumerable: true, get: function () { return config_1.DEFAULT_RETRY_DELAY; } });
Object.defineProperty(exports, "MAX_FILE_SIZE", { enumerable: true, get: function () { return config_1.MAX_FILE_SIZE; } });
// Export security utilities
var security_1 = require("./lib/security");
Object.defineProperty(exports, "sanitizeHtml", { enumerable: true, get: function () { return security_1.sanitizeHtml; } });
Object.defineProperty(exports, "sanitizeEmail", { enumerable: true, get: function () { return security_1.sanitizeEmail; } });
Object.defineProperty(exports, "sanitizeSubject", { enumerable: true, get: function () { return security_1.sanitizeSubject; } });
Object.defineProperty(exports, "isAllowedMimeType", { enumerable: true, get: function () { return security_1.isAllowedMimeType; } });
Object.defineProperty(exports, "isSafeFileExtension", { enumerable: true, get: function () { return security_1.isSafeFileExtension; } });
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return security_1.RateLimiter; } });
Object.defineProperty(exports, "DebugLogger", { enumerable: true, get: function () { return security_1.DebugLogger; } });
Object.defineProperty(exports, "ALLOWED_MIME_TYPES", { enumerable: true, get: function () { return security_1.ALLOWED_MIME_TYPES; } });
Object.defineProperty(exports, "BLOCKED_MIME_TYPES", { enumerable: true, get: function () { return security_1.BLOCKED_MIME_TYPES; } });
// Import modules for unified client
const metigan_2 = require("./lib/metigan");
const forms_2 = require("./lib/forms");
const contacts_2 = require("./lib/contacts");
const audiences_2 = require("./lib/audiences");
const templates_2 = require("./lib/templates");
const errors_2 = require("./lib/errors");
/**
 * Unified Metigan Client
 * Provides access to all Metigan services
 */
class Metigan {
    /**
     * Create a new Metigan client
     * @param options - Client options
     */
    constructor(options) {
        if (!options.apiKey) {
            throw new errors_2.MetiganError('API key is required');
        }
        // Initialize all modules with security options
        this.email = new metigan_2.Metigan(options.apiKey, {
            userId: options.userId,
            disableLogs: options.disableLogs,
            timeout: options.timeout,
            retryCount: options.retryCount,
            retryDelay: options.retryDelay,
            debug: options.debug,
            sanitizeHtml: options.sanitizeHtml,
            enableRateLimit: options.enableRateLimit,
            maxRequestsPerSecond: options.maxRequestsPerSecond
        });
        this.forms = new forms_2.MetiganForms({
            apiKey: options.apiKey,
            timeout: options.timeout,
            retryCount: options.retryCount,
            retryDelay: options.retryDelay
        });
        this.contacts = new contacts_2.MetiganContacts({
            apiKey: options.apiKey,
            timeout: options.timeout,
            retryCount: options.retryCount,
            retryDelay: options.retryDelay
        });
        this.audiences = new audiences_2.MetiganAudiences({
            apiKey: options.apiKey,
            timeout: options.timeout,
            retryCount: options.retryCount,
            retryDelay: options.retryDelay
        });
        this.templates = new templates_2.MetiganTemplates({
            apiKey: options.apiKey,
            timeout: options.timeout,
            retryCount: options.retryCount,
            retryDelay: options.retryDelay
        });
    }
}
exports.Metigan = Metigan;
// Default export
exports.default = Metigan;
