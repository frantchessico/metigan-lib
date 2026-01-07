/**
 * Metigan - Email Sending Library
 * A simple library for sending emails through the Metigan API
 * @version 2.0.0
 */
/**
 * Custom error class for Metigan-specific errors
 */
export declare class MetiganError extends Error {
    constructor(message: string);
}
/**
 * Interface for email attachment in Node.js environment
 */
export interface NodeAttachment {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}
/**
 * Interface for email attachment in any environment
 */
export interface CustomAttachment {
    content: Buffer | ArrayBuffer | Uint8Array | string;
    filename: string;
    contentType: string;
}
/**
 * Email options interface
 */
export interface EmailOptions {
    /** Sender email address (or Name <email>) */
    from: string;
    /** List of recipient email addresses */
    recipients: string[];
    /** Email subject */
    subject: string;
    /** Email content (HTML supported) - Required if not using templateId */
    content?: string;
    /** Template ID for using pre-created templates (optional) */
    templateId?: string;
    /** Optional file attachments */
    attachments?: Array<File | NodeAttachment | CustomAttachment>;
    /** Optional CC recipients */
    cc?: string[];
    /** Optional BCC recipients */
    bcc?: string[];
    /** Optional reply-to address */
    replyTo?: string;
}
/**
 * API response interface for successful email
 */
export interface EmailSuccessResponse {
    success: true;
    message: string;
    successfulEmails: {
        recipient: string;
        trackingId: string;
    }[];
    failedEmails: {
        recipient: string;
        error: string;
    }[];
    recipientCount: number;
    emailsRemaining: number;
}
/**
 * API error response interfaces
 */
export interface EmailErrorResponse {
    error: string;
    message: string;
}
/**
 * API key error response
 */
export interface ApiKeyErrorResponse {
    error: string;
}
/**
 * Union type for all possible API responses
 */
export type EmailApiResponse = EmailSuccessResponse | EmailErrorResponse | ApiKeyErrorResponse;
/**
 * Template variables type
 */
export type TemplateVariables = Record<string, string | number | boolean>;
/**
 * Template function type
 */
export type TemplateFunction = (variables?: TemplateVariables) => string;
/**
 * Metigan client options
 */
export interface MetiganOptions {
    /** User ID for logging */
    userId?: string;
    /** Disable logging */
    disableLogs?: boolean;
    /** Number of retry attempts for failed operations */
    retryCount?: number;
    /** Base delay between retries (ms) */
    retryDelay?: number;
    /** Request timeout (ms) */
    timeout?: number;
    /** Enable debug mode (shows internal logs) */
    debug?: boolean;
    /** Enable HTML sanitization (default: true) */
    sanitizeHtml?: boolean;
    /** Enable rate limiting (default: true) */
    enableRateLimit?: boolean;
    /** Max requests per second (default: 10) */
    maxRequestsPerSecond?: number;
}
/**
 * Metigan client for sending emails
 */
export declare class Metigan {
    private apiKey;
    private logger;
    private timeout;
    private retryCount;
    private retryDelay;
    private debug;
    private shouldSanitizeHtml;
    private rateLimiter;
    /**
     * Create a new Metigan client
     * @param apiKey - Your API key
     * @param options - Client options
     */
    constructor(apiKey: string, options?: MetiganOptions);
    /**
     * Enables logging
     */
    enableLogging(): void;
    /**
     * Disables logging
     */
    disableLogging(): void;
    /**
     * Validates an email address format
     * @param email - The email to validate
     * @returns True if email is valid
     * @private
     */
    private _validateEmail;
    /**
     * Extracts email address from a format like "Name <email@example.com>"
     * @param from - The from field which might include a name
     * @returns The extracted email address
     * @private
     */
    private _extractEmailAddress;
    /**
     * Validates email message data
     * @param messageData - The email message data
     * @returns Validation result with status and error message
     * @private
     */
    private _validateMessageData;
    /**
     * Process attachments for the email
     * @param attachments - Array of files or file-like objects
     * @returns Processed attachments
     * @private
     */
    private _processAttachments;
    /**
     * Validate attachments for security
     * @param attachments - Array of attachments to validate
     * @throws MetiganError if validation fails
     * @private
     */
    private _validateAttachments;
    /**
     * Get MIME type based on file extension
     * @param filename - File name
     * @returns MIME type
     * @private
     */
    private _getMimeType;
    /**
     * Attempts HTTP request with retry system
     * @param url - Request URL
     * @param data - Data to send
     * @param headers - Request headers
     * @param method - HTTP method
     * @private
     */
    private _makeRequestWithRetry;
    /**
     * Send an email
     * @param options - Email options
     * @returns Response from the API
     */
    sendEmail(options: EmailOptions): Promise<EmailApiResponse>; /**
     * Generates a unique tracking ID for email analytics
     * @returns A unique tracking ID string
     * @private
     */
    private _generateTrackingId;
    /**
     * Enable debug mode
     */
    enableDebug(): void;
    /**
     * Disable debug mode
     */
    disableDebug(): void;
    /**
     * Reset rate limiter (useful for testing)
     */
    resetRateLimit(): void;
    /**
     * Check if rate limit allows a request
     * @returns True if request is allowed
     */
    canMakeRequest(): boolean;
    /**
     * Get time until next request is allowed (in ms)
     * @returns Milliseconds until next request is allowed, or 0 if allowed now
     */
    getTimeUntilNextRequest(): number;
}
export { sanitizeHtml, sanitizeEmail, sanitizeSubject, isAllowedMimeType, isSafeFileExtension, RateLimiter, DebugLogger, ALLOWED_MIME_TYPES, BLOCKED_MIME_TYPES } from './security';
export default Metigan;
