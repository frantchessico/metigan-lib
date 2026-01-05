"use strict";
/**
 * Metigan Security Module
 * Security utilities for the Metigan SDK
 * @version 2.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugLogger = exports.RateLimiter = exports.BLOCKED_MIME_TYPES = exports.ALLOWED_MIME_TYPES = void 0;
exports.sanitizeHtml = sanitizeHtml;
exports.isAllowedMimeType = isAllowedMimeType;
exports.isSafeFileExtension = isSafeFileExtension;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizeSubject = sanitizeSubject;
/**
 * Dangerous HTML tags that could be used for XSS attacks
 */
const DANGEROUS_TAGS = [
    'script', 'iframe', 'object', 'embed', 'form', 'input',
    'button', 'select', 'textarea', 'applet', 'meta', 'link',
    'base', 'frame', 'frameset', 'layer', 'ilayer', 'bgsound'
];
/**
 * Dangerous attributes that could be used for XSS attacks
 */
const DANGEROUS_ATTRIBUTES = [
    'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
    'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup',
    'onload', 'onerror', 'onunload', 'onabort', 'onreset', 'onsubmit',
    'onfocus', 'onblur', 'onchange', 'oninput', 'onscroll', 'onresize',
    'javascript:', 'vbscript:', 'data:'
];
/**
 * Allowed MIME types for attachments
 */
exports.ALLOWED_MIME_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Audio/Video
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm'
];
/**
 * Blocked MIME types (executable content)
 */
exports.BLOCKED_MIME_TYPES = [
    'application/x-msdownload',
    'application/x-executable',
    'application/x-msdos-program',
    'application/javascript',
    'text/javascript',
    'application/x-javascript',
    'text/html', // Can contain scripts
    'application/xhtml+xml',
    'application/x-shockwave-flash'
];
/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML
 */
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    let sanitized = html;
    // Remove dangerous tags
    for (const tag of DANGEROUS_TAGS) {
        const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*\\/?>`, 'gi');
        sanitized = sanitized.replace(regex, '');
    }
    // Remove dangerous attributes
    for (const attr of DANGEROUS_ATTRIBUTES) {
        // Remove event handlers and javascript: URLs
        const attrRegex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        sanitized = sanitized.replace(attrRegex, '');
        // Remove attribute without quotes
        const attrRegex2 = new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]+`, 'gi');
        sanitized = sanitized.replace(attrRegex2, '');
    }
    // Remove javascript: and data: URLs from href and src
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'src=""');
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:[^"'>\s]*/gi, 'href="#"');
    return sanitized;
}
/**
 * Validate MIME type against allowed list
 * @param mimeType - MIME type to validate
 * @returns True if MIME type is allowed
 */
function isAllowedMimeType(mimeType) {
    if (!mimeType)
        return false;
    const normalizedType = mimeType.toLowerCase().trim();
    // Check if blocked
    if (exports.BLOCKED_MIME_TYPES.includes(normalizedType)) {
        return false;
    }
    // Check if explicitly allowed
    return exports.ALLOWED_MIME_TYPES.includes(normalizedType);
}
/**
 * Validate file extension
 * @param filename - File name to check
 * @returns True if extension is safe
 */
function isSafeFileExtension(filename) {
    if (!filename)
        return false;
    const DANGEROUS_EXTENSIONS = [
        '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
        '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1',
        '.jar', '.sh', '.bash', '.app', '.dmg', '.deb', '.rpm'
    ];
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return !DANGEROUS_EXTENSIONS.includes(ext);
}
/**
 * Sanitize email address - remove potential injection characters
 * @param email - Email to sanitize
 * @returns Sanitized email
 */
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return '';
    }
    // Remove newlines and carriage returns (header injection prevention)
    return email.replace(/[\r\n]/g, '').trim();
}
/**
 * Sanitize subject line
 * @param subject - Subject to sanitize
 * @returns Sanitized subject
 */
function sanitizeSubject(subject) {
    if (!subject || typeof subject !== 'string') {
        return '';
    }
    // Remove newlines and carriage returns (header injection prevention)
    // Also limit length
    return subject.replace(/[\r\n]/g, '').trim().substring(0, 998);
}
/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
    constructor(config = { maxRequests: 10, windowMs: 1000 }) {
        this.requests = [];
        this.maxRequests = config.maxRequests;
        this.windowMs = config.windowMs;
    }
    /**
     * Check if a request can be made
     * @returns True if request is allowed
     */
    canMakeRequest() {
        const now = Date.now();
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        // Check if we're under the limit
        return this.requests.length < this.maxRequests;
    }
    /**
     * Record a request
     */
    recordRequest() {
        this.requests.push(Date.now());
    }
    /**
     * Try to make a request - checks and records if allowed
     * @returns True if request was allowed and recorded
     */
    tryRequest() {
        if (this.canMakeRequest()) {
            this.recordRequest();
            return true;
        }
        return false;
    }
    /**
     * Get time until next request is allowed (in ms)
     * @returns Milliseconds until next request is allowed, or 0 if allowed now
     */
    getTimeUntilNextRequest() {
        if (this.canMakeRequest()) {
            return 0;
        }
        const now = Date.now();
        const oldestRequest = Math.min(...this.requests);
        return Math.max(0, this.windowMs - (now - oldestRequest));
    }
    /**
     * Reset the rate limiter
     */
    reset() {
        this.requests = [];
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Debug logger that can be disabled
 */
class DebugLogger {
    constructor(enabled = false, prefix = '[Metigan]') {
        this.enabled = enabled;
        this.prefix = prefix;
    }
    enable() {
        this.enabled = true;
    }
    disable() {
        this.enabled = false;
    }
    log(...args) {
        if (this.enabled) {
            console.log(this.prefix, ...args);
        }
    }
    warn(...args) {
        if (this.enabled) {
            console.warn(this.prefix, ...args);
        }
    }
    error(...args) {
        if (this.enabled) {
            console.error(this.prefix, ...args);
        }
    }
    info(...args) {
        if (this.enabled) {
            console.info(this.prefix, ...args);
        }
    }
}
exports.DebugLogger = DebugLogger;
