/**
 * Metigan Security Module
 * Security utilities for the Metigan SDK
 * @version 2.0.0
 */
/**
 * Allowed MIME types for attachments
 */
export declare const ALLOWED_MIME_TYPES: string[];
/**
 * Blocked MIME types (executable content)
 */
export declare const BLOCKED_MIME_TYPES: string[];
/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML
 */
export declare function sanitizeHtml(html: string): string;
/**
 * Validate MIME type against allowed list
 * @param mimeType - MIME type to validate
 * @returns True if MIME type is allowed
 */
export declare function isAllowedMimeType(mimeType: string): boolean;
/**
 * Validate file extension
 * @param filename - File name to check
 * @returns True if extension is safe
 */
export declare function isSafeFileExtension(filename: string): boolean;
/**
 * Sanitize email address - remove potential injection characters
 * @param email - Email to sanitize
 * @returns Sanitized email
 */
export declare function sanitizeEmail(email: string): string;
/**
 * Sanitize subject line
 * @param subject - Subject to sanitize
 * @returns Sanitized subject
 */
export declare function sanitizeSubject(subject: string): string;
/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
}
/**
 * Simple in-memory rate limiter
 */
export declare class RateLimiter {
    private requests;
    private maxRequests;
    private windowMs;
    constructor(config?: RateLimiterConfig);
    /**
     * Check if a request can be made
     * @returns True if request is allowed
     */
    canMakeRequest(): boolean;
    /**
     * Record a request
     */
    recordRequest(): void;
    /**
     * Try to make a request - checks and records if allowed
     * @returns True if request was allowed and recorded
     */
    tryRequest(): boolean;
    /**
     * Get time until next request is allowed (in ms)
     * @returns Milliseconds until next request is allowed, or 0 if allowed now
     */
    getTimeUntilNextRequest(): number;
    /**
     * Reset the rate limiter
     */
    reset(): void;
}
/**
 * Debug logger that can be disabled
 */
export declare class DebugLogger {
    private enabled;
    private prefix;
    constructor(enabled?: boolean, prefix?: string);
    enable(): void;
    disable(): void;
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
}
