"use strict";
/**
 * Metigan - Email Sending Library
 * A simple library for sending emails through the Metigan API
 * @version 2.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKED_MIME_TYPES = exports.ALLOWED_MIME_TYPES = exports.DebugLogger = exports.RateLimiter = exports.isSafeFileExtension = exports.isAllowedMimeType = exports.sanitizeSubject = exports.sanitizeEmail = exports.sanitizeHtml = exports.Metigan = exports.MetiganError = void 0;
// Import dependencies in a way that doesn't expose them in stack traces
const http = __importStar(require("../utils/http"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const security_1 = require("./security");
// Status options constants
const STATUS_OPTIONS = [
    { value: "200", label: "200 - Ok" },
    { value: "201", label: "201 - Created" },
    { value: "400", label: "400 - Bad Request" },
    { value: "401", label: "401 - Unauthorized" },
    { value: "403", label: "403 - Forbidden" },
    { value: "404", label: "404 - Not Found" },
    { value: "422", label: "422 - Unprocessable Content" },
    { value: "429", label: "429 - Too Many Requests" },
    { value: "451", label: "451 - Unavailable For Legal Reasons" },
    { value: "500", label: "500 - Internal Server Error" },
];
// Valid user agents
const VALID_USER_AGENTS = ['SDK', 'Webhook', 'SMTP'];
// Global debug logger instance
let debugLogger = null;
/**
 * Get or create debug logger instance
 */
function getDebugLogger(enabled = false) {
    if (!debugLogger) {
        debugLogger = new security_1.DebugLogger(enabled, '[Metigan]');
    }
    return debugLogger;
}
/**
 * Logger for Metigan library monitoring
 */
class MetiganLogger {
    constructor(apiKey, userId, debugEnabled = false) {
        this.disabled = false;
        this.retryCount = 3; // Number of retry attempts on failure
        this.retryDelay = 500; // Delay between retries (ms)
        this.pendingLogs = [];
        this.isBatchProcessing = false;
        this.batchTimeout = null;
        this.apiKey = apiKey;
        this.userId = userId;
        this.debug = getDebugLogger(debugEnabled);
    }
    /**
     * Disables the logger
     */
    disable() {
        this.disabled = true;
        this.clearPendingLogs();
    }
    /**
     * Enables the logger
     */
    enable() {
        this.disabled = false;
    }
    /**
     * Clears pending logs
     */
    clearPendingLogs() {
        this.pendingLogs = [];
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
    }
    /**
     * Validate and format status code for API compatibility
     * @param status - HTTP status code
     * @returns Valid status code and its label
     * @private
     */
    _validateStatus(status) {
        // Convert to string and check if it's in the valid status list
        const statusStr = status.toString();
        const validStatus = STATUS_OPTIONS.find(option => option.value === statusStr);
        if (validStatus) {
            return {
                code: statusStr,
                label: validStatus.label
            };
        }
        else {
            // If not a valid status, return 500 as default
            const defaultStatus = STATUS_OPTIONS.find(option => option.value === "500");
            return {
                code: "500",
                label: defaultStatus ? defaultStatus.label : "500 - Internal Server Error"
            };
        }
    }
    /**
     * Determine the appropriate userAgent
     * @returns UserAgent string
     */
    _getUserAgent() {
        // In our case, we always use SDK
        return 'SDK';
    }
    /**
     * Attempts to make a request with retries
     * @param url - Request URL
     * @param data - Data to send
     * @param headers - Request headers
     */
    async _makeRequestWithRetry(url, data, headers) {
        let lastError;
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            try {
                return await axios_1.default.post(url, data, { headers, timeout: 5000 }); // 5 second timeout
            }
            catch (err) {
                lastError = err;
                // If error is 403 (Forbidden), check if it's an authentication problem
                if (err.response && err.response.status === 403) {
                    // If last attempt, log the error silently
                    if (attempt === this.retryCount - 1) {
                        this.debug.warn('Authentication error while logging. Check your API key.');
                        return; // End attempts
                    }
                }
                // If network error or timeout, try again more urgently
                if (!err.response || err.code === 'ECONNABORTED') {
                    if (attempt === this.retryCount - 1) {
                        this.debug.warn('Connection error while logging. Check your connectivity.');
                        return;
                    }
                }
                // Wait before retrying (except on last attempt)
                if (attempt < this.retryCount - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1))); // Exponential backoff
                }
            }
        }
        // If we got here, all attempts failed
        throw lastError;
    }
    /**
     * Processes the pending logs batch
     */
    async processBatch() {
        if (this.disabled || this.pendingLogs.length === 0 || this.isBatchProcessing) {
            return;
        }
        this.isBatchProcessing = true;
        this.batchTimeout = null;
        try {
            // Copy pending logs and clear the queue
            const logBatch = [...this.pendingLogs];
            this.pendingLogs = [];
            // Get appropriate userAgent
            const userAgent = this._getUserAgent();
            // Prepare logs batch for sending
            const batchData = logBatch.map(log => {
                const validatedStatus = this._validateStatus(log.status);
                return {
                    userId: this.userId,
                    apiKey: this.apiKey,
                    endpoint: log.endpoint,
                    status: validatedStatus.code,
                    statusLabel: validatedStatus.label,
                    method: log.method,
                    userAgent,
                    timestamp: new Date().toISOString()
                };
            });
            // Send batch
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'User-Agent': userAgent
            };
            await this._makeRequestWithRetry(`${config_1.API_URL}/api/logs`, { logs: batchData }, headers)
                .catch(err => {
                this.debug.warn('Warning processing logs batch:', err.message || 'Unknown error');
            });
        }
        catch (error) {
            this.debug.warn('Error processing logs batch:', error.message || 'Unknown error');
        }
        finally {
            this.isBatchProcessing = false;
            // Check if new logs were added during processing
            if (this.pendingLogs.length > 0) {
                this.scheduleBatchProcessing();
            }
        }
    }
    /**
     * Schedules batch processing
     */
    scheduleBatchProcessing() {
        if (!this.batchTimeout && !this.disabled) {
            this.batchTimeout = setTimeout(() => this.processBatch(), 1000); // Process every 1 second
        }
    }
    /**
     * Logs an operation to be sent in batch to the logs API
     */
    async log(endpoint, status, method) {
        if (this.disabled)
            return;
        // Add log to queue
        this.pendingLogs.push({ endpoint, status, method });
        // Schedule batch processing if needed
        this.scheduleBatchProcessing();
    }
}
/**
 * Custom error class for Metigan-specific errors
 */
class MetiganError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MetiganError';
        // This prevents the implementation details from showing in the stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.MetiganError = MetiganError;
/**
 * Metigan client for sending emails
 */
class Metigan {
    /**
     * Create a new Metigan client
     * @param apiKey - Your API key
     * @param options - Client options
     */
    constructor(apiKey, options = {}) {
        if (!apiKey) {
            throw new MetiganError('API key is required');
        }
        // Validate API key format (basic check)
        if (apiKey.length < 10) {
            throw new MetiganError('Invalid API key format');
        }
        this.apiKey = apiKey;
        // Advanced options
        this.timeout = options.timeout || config_1.DEFAULT_TIMEOUT;
        this.retryCount = options.retryCount || config_1.DEFAULT_RETRY_COUNT;
        this.retryDelay = options.retryDelay || config_1.DEFAULT_RETRY_DELAY;
        // Security options
        this.debug = getDebugLogger(options.debug || false);
        this.shouldSanitizeHtml = options.sanitizeHtml !== false; // Default: true
        // Rate limiting (default: enabled, 10 req/sec)
        if (options.enableRateLimit !== false) {
            this.rateLimiter = new security_1.RateLimiter({
                maxRequests: options.maxRequestsPerSecond || 10,
                windowMs: 1000
            });
        }
        else {
            this.rateLimiter = null;
        }
        // Initialize logger
        const userId = options.userId || 'anonymous';
        this.logger = new MetiganLogger(apiKey, userId, options.debug || false);
        // Disable logs if requested
        if (options.disableLogs) {
            this.logger.disable();
        }
        this.debug.log('Metigan client initialized');
    }
    /**
     * Enables logging
     */
    enableLogging() {
        this.logger.enable();
    }
    /**
     * Disables logging
     */
    disableLogging() {
        this.logger.disable();
    }
    /**
     * Validates an email address format
     * @param email - The email to validate
     * @returns True if email is valid
     * @private
     */
    _validateEmail(email) {
        // More comprehensive email validation
        if (!email || typeof email !== 'string')
            return false;
        // Simple email validation - check for @ and at least one dot after it
        const parts = email.split('@');
        if (parts.length !== 2)
            return false;
        if (parts[0].length === 0)
            return false;
        // Verify domain part
        const domainParts = parts[1].split('.');
        if (domainParts.length < 2)
            return false;
        if (domainParts.some(part => part.length === 0))
            return false;
        return true;
    }
    /**
     * Extracts email address from a format like "Name <email@example.com>"
     * @param from - The from field which might include a name
     * @returns The extracted email address
     * @private
     */
    _extractEmailAddress(from) {
        if (!from)
            return '';
        // Handle case with angle brackets
        const angleMatch = from.match(/<([^>]+)>/);
        if (angleMatch) {
            return angleMatch[1].trim();
        }
        // If no angle brackets, assume it's just an email
        return from.trim();
    }
    /**
     * Validates email message data
     * @param messageData - The email message data
     * @returns Validation result with status and error message
     * @private
     */
    _validateMessageData(messageData) {
        // Check required fields
        if (!messageData.from) {
            return { isValid: false, error: 'Sender email (from) is required' };
        }
        if (!messageData.recipients || !Array.isArray(messageData.recipients) || messageData.recipients.length === 0) {
            return { isValid: false, error: 'Recipients must be a non-empty array' };
        }
        if (!messageData.subject) {
            return { isValid: false, error: 'Subject is required' };
        }
        if (!messageData.content) {
            return { isValid: false, error: 'Content is required' };
        }
        // Validate sender email format
        const fromEmail = this._extractEmailAddress(messageData.from);
        if (!fromEmail || !this._validateEmail(fromEmail)) {
            return { isValid: false, error: `Invalid sender email format: ${fromEmail}` };
        }
        // Validate recipient email formats
        for (const recipient of messageData.recipients) {
            const recipientEmail = this._extractEmailAddress(recipient);
            if (!recipientEmail || !this._validateEmail(recipientEmail)) {
                return { isValid: false, error: `Invalid recipient email format: ${recipientEmail}` };
            }
        }
        // Validate CC emails if provided
        if (messageData.cc && Array.isArray(messageData.cc)) {
            for (const cc of messageData.cc) {
                const ccEmail = this._extractEmailAddress(cc);
                if (!ccEmail || !this._validateEmail(ccEmail)) {
                    return { isValid: false, error: `Invalid CC email format: ${ccEmail}` };
                }
            }
        }
        // Validate BCC emails if provided
        if (messageData.bcc && Array.isArray(messageData.bcc)) {
            for (const bcc of messageData.bcc) {
                const bccEmail = this._extractEmailAddress(bcc);
                if (!bccEmail || !this._validateEmail(bccEmail)) {
                    return { isValid: false, error: `Invalid BCC email format: ${bccEmail}` };
                }
            }
        }
        // Validate reply-to if provided
        if (messageData.replyTo) {
            const replyToEmail = this._extractEmailAddress(messageData.replyTo);
            if (!replyToEmail || !this._validateEmail(replyToEmail)) {
                return { isValid: false, error: `Invalid reply-to email format: ${replyToEmail}` };
            }
        }
        return { isValid: true };
    }
    /**
     * Process attachments for the email
     * @param attachments - Array of files or file-like objects
     * @returns Processed attachments
     * @private
     */
    async _processAttachments(attachments) {
        if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
            return [];
        }
        const processedAttachments = [];
        for (const file of attachments) {
            let buffer;
            let filename;
            let mimetype;
            // Handle File objects (browser)
            if (typeof File !== 'undefined' && file instanceof File) {
                if (file.size > config_1.MAX_FILE_SIZE) {
                    throw new MetiganError(`File ${file.name} exceeds the maximum size of 7MB`);
                }
                buffer = await file.arrayBuffer();
                filename = file.name;
                mimetype = file.type || this._getMimeType(file.name);
            }
            // Handle Buffer objects (Node.js)
            else if ('buffer' in file && 'originalname' in file) {
                const nodeFile = file;
                if (nodeFile.buffer.length > config_1.MAX_FILE_SIZE) {
                    throw new MetiganError(`File ${nodeFile.originalname} exceeds the maximum size of 7MB`);
                }
                buffer = nodeFile.buffer;
                filename = nodeFile.originalname;
                mimetype = nodeFile.mimetype || this._getMimeType(nodeFile.originalname);
            }
            // Handle custom objects
            else if ('content' in file && 'filename' in file) {
                const customFile = file;
                // Check size for different types of content
                let contentSize = 0;
                if (customFile.content instanceof ArrayBuffer) {
                    contentSize = customFile.content.byteLength;
                }
                else if (customFile.content instanceof Buffer || customFile.content instanceof Uint8Array) {
                    contentSize = customFile.content.length;
                }
                else if (typeof customFile.content === 'string') {
                    contentSize = Buffer.from(customFile.content).length;
                }
                if (contentSize > config_1.MAX_FILE_SIZE) {
                    throw new MetiganError(`File ${customFile.filename} exceeds the maximum size of 7MB`);
                }
                buffer = customFile.content;
                filename = customFile.filename;
                mimetype = customFile.contentType || this._getMimeType(customFile.filename);
            }
            else {
                throw new MetiganError('Invalid attachment format');
            }
            // Convert buffer to base64 if needed
            let content = buffer;
            // In browser environments, convert to base64
            if (typeof window !== 'undefined') {
                if (buffer instanceof ArrayBuffer) {
                    const uint8Array = new Uint8Array(buffer);
                    const binary = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
                    content = btoa(binary);
                }
                else if (buffer instanceof Uint8Array) {
                    const binary = Array.from(buffer).map(b => String.fromCharCode(b)).join('');
                    content = btoa(binary);
                }
            }
            processedAttachments.push({
                filename,
                content,
                contentType: mimetype,
                encoding: 'base64',
                disposition: 'attachment'
            });
        }
        return processedAttachments;
    }
    /**
     * Validate attachments for security
     * @param attachments - Array of attachments to validate
     * @throws MetiganError if validation fails
     * @private
     */
    async _validateAttachments(attachments) {
        for (const file of attachments) {
            let filename;
            let mimetype;
            // Get filename and mimetype based on file type
            if (typeof File !== 'undefined' && file instanceof File) {
                filename = file.name;
                mimetype = file.type;
            }
            else if ('buffer' in file && 'originalname' in file) {
                const nodeFile = file;
                filename = nodeFile.originalname;
                mimetype = nodeFile.mimetype;
            }
            else if ('content' in file && 'filename' in file) {
                const customFile = file;
                filename = customFile.filename;
                mimetype = customFile.contentType;
            }
            else {
                throw new MetiganError('Invalid attachment format');
            }
            // Validate file extension
            if (!(0, security_1.isSafeFileExtension)(filename)) {
                throw new MetiganError(`File extension not allowed for security reasons: ${filename}`);
            }
            // Validate MIME type
            if (mimetype && !(0, security_1.isAllowedMimeType)(mimetype)) {
                this.debug.warn(`MIME type not in allowlist: ${mimetype} for ${filename}`);
                // We don't block by MIME type alone, just log warning
                // The file extension check is the main security gate
            }
        }
    }
    /**
     * Get MIME type based on file extension
     * @param filename - File name
     * @returns MIME type
     * @private
     */
    _getMimeType(filename) {
        var _a;
        const ext = (_a = filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        // Basic mapping of extensions to MIME types
        const mimeMap = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            'tar': 'application/x-tar',
            'mp3': 'audio/mpeg',
            'mp4': 'video/mp4',
            'wav': 'audio/wav',
            'avi': 'video/x-msvideo',
            'csv': 'text/csv'
        };
        return ext && mimeMap[ext] ? mimeMap[ext] : 'application/octet-stream';
    }
    /**
     * Attempts HTTP request with retry system
     * @param url - Request URL
     * @param data - Data to send
     * @param headers - Request headers
     * @param method - HTTP method
     * @private
     */
    async _makeRequestWithRetry(url, data, headers, method = 'POST') {
        let lastError;
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            try {
                if (method === 'GET') {
                    return await http.get(url, headers);
                }
                else {
                    return await http.post(url, data, headers);
                }
            }
            catch (error) {
                lastError = error;
                // If authentication error (401/403), we can retry a limited number of times
                if (error.status === 401 || error.status === 403) {
                    this.debug.warn(`Attempt ${attempt + 1}/${this.retryCount}: Authentication error (${error.status})`);
                }
                // If server error (5xx), retry after waiting
                else if (error.status >= 500) {
                    this.debug.warn(`Attempt ${attempt + 1}/${this.retryCount}: Server error (${error.status})`);
                }
                // If network error, also retry
                else if (!error.status) {
                    this.debug.warn(`Attempt ${attempt + 1}/${this.retryCount}: Network error or timeout`);
                }
                // If not last retry, wait before trying again
                if (attempt < this.retryCount - 1) {
                    // Exponential backoff with jitter
                    const delay = this.retryDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                else {
                    // On last attempt, propagate the error
                    throw error;
                }
            }
        }
        // Should never reach here, but just in case
        throw lastError;
    }
    /**
     * Send an email
     * @param options - Email options
     * @returns Response from the API
     */
    async sendEmail(options) {
        var _a, _b;
        // Check rate limit
        if (this.rateLimiter && !this.rateLimiter.tryRequest()) {
            const waitTime = this.rateLimiter.getTimeUntilNextRequest();
            throw new MetiganError(`Rate limit exceeded. Please wait ${waitTime}ms before making another request.`);
        }
        // Start monitoring
        const startTime = Date.now();
        let statusCode = 500; // Default error status
        try {
            // Validate message data
            const validation = this._validateMessageData(options);
            if (!validation.isValid) {
                throw new MetiganError(validation.error || 'Invalid email data');
            }
            // Sanitize inputs for security
            const sanitizedOptions = {
                ...options,
                from: (0, security_1.sanitizeEmail)(options.from),
                recipients: options.recipients.map(r => (0, security_1.sanitizeEmail)(r)),
                subject: (0, security_1.sanitizeSubject)(options.subject),
                content: this.shouldSanitizeHtml ? (0, security_1.sanitizeHtml)(options.content) : options.content,
                cc: (_a = options.cc) === null || _a === void 0 ? void 0 : _a.map(c => (0, security_1.sanitizeEmail)(c)),
                bcc: (_b = options.bcc) === null || _b === void 0 ? void 0 : _b.map(b => (0, security_1.sanitizeEmail)(b)),
                replyTo: options.replyTo ? (0, security_1.sanitizeEmail)(options.replyTo) : undefined
            };
            this.debug.log('Email sanitized and validated');
            // Process attachments if present
            let formData;
            let headers = {
                'x-api-key': this.apiKey,
                'User-Agent': 'SDK'
            };
            if (options.attachments && options.attachments.length > 0) {
                // Validate attachments for security
                await this._validateAttachments(options.attachments);
                // If we're in a browser environment
                if (typeof FormData !== 'undefined') {
                    formData = new FormData();
                    formData.append('from', sanitizedOptions.from);
                    formData.append('recipients', JSON.stringify(sanitizedOptions.recipients));
                    formData.append('subject', sanitizedOptions.subject);
                    formData.append('content', sanitizedOptions.content);
                    // Add CC if provided
                    if (sanitizedOptions.cc && sanitizedOptions.cc.length > 0) {
                        formData.append('cc', JSON.stringify(sanitizedOptions.cc));
                    }
                    // Add BCC if provided
                    if (sanitizedOptions.bcc && sanitizedOptions.bcc.length > 0) {
                        formData.append('bcc', JSON.stringify(sanitizedOptions.bcc));
                    }
                    // Add reply-to if provided
                    if (sanitizedOptions.replyTo) {
                        formData.append('replyTo', sanitizedOptions.replyTo);
                    }
                    // Append files directly for browser
                    for (const file of options.attachments) {
                        if (file instanceof File) {
                            formData.append('files', file);
                        }
                        else {
                            throw new MetiganError('In browser environments, attachments must be File objects');
                        }
                    }
                }
                // Node.js environment
                else {
                    const processedAttachments = await this._processAttachments(options.attachments);
                    formData = {
                        from: sanitizedOptions.from,
                        recipients: sanitizedOptions.recipients,
                        subject: sanitizedOptions.subject,
                        content: sanitizedOptions.content,
                        attachments: processedAttachments
                    };
                    // Add CC if provided
                    if (sanitizedOptions.cc && sanitizedOptions.cc.length > 0) {
                        formData.cc = sanitizedOptions.cc;
                    }
                    // Add BCC if provided
                    if (sanitizedOptions.bcc && sanitizedOptions.bcc.length > 0) {
                        formData.bcc = sanitizedOptions.bcc;
                    }
                    // Add reply-to if provided
                    if (sanitizedOptions.replyTo) {
                        formData.replyTo = sanitizedOptions.replyTo;
                    }
                    headers['Content-Type'] = 'application/json';
                }
            }
            // No attachments
            else {
                formData = {
                    from: sanitizedOptions.from,
                    recipients: sanitizedOptions.recipients,
                    subject: sanitizedOptions.subject,
                    content: sanitizedOptions.content,
                };
                // Add CC if provided
                if (sanitizedOptions.cc && sanitizedOptions.cc.length > 0) {
                    formData.cc = sanitizedOptions.cc;
                }
                // Add BCC if provided
                if (sanitizedOptions.bcc && sanitizedOptions.bcc.length > 0) {
                    formData.bcc = sanitizedOptions.bcc;
                }
                // Add reply-to if provided
                if (sanitizedOptions.replyTo) {
                    formData.replyTo = sanitizedOptions.replyTo;
                }
                headers['Content-Type'] = 'application/json';
            }
            // Make the API request with retry
            try {
                const response = await this._makeRequestWithRetry(`${config_1.API_URL}/api/email/send`, formData, headers);
                statusCode = 200; // Sucesso
                // Log successful operation
                await this.logger.log(`/email/send`, statusCode, 'POST');
                return response;
            }
            catch (httpError) {
                // Captura o status code do erro
                if (httpError.status) {
                    statusCode = httpError.status;
                }
                // Log failed operation
                await this.logger.log(`/email/send`, statusCode, 'POST');
                // Handle HTTP errors without exposing implementation details
                if (httpError.status) {
                    if (httpError.data && httpError.data.error) {
                        throw new MetiganError(httpError.data.message || httpError.data.error);
                    }
                    else {
                        throw new MetiganError(`Request failed with status ${httpError.status}`);
                    }
                }
                throw new MetiganError('Failed to connect to the email service');
            }
        }
        catch (error) {
            // Log error operation
            await this.logger.log(`/email/send/error`, statusCode, 'POST');
            // Rethrow MetiganErrors directly
            if (error instanceof MetiganError) {
                throw error;
            }
            // Wrap other errors
            throw new MetiganError('An unexpected error occurred while sending email');
        }
    } /**
     * Generates a unique tracking ID for email analytics
     * @returns A unique tracking ID string
     * @private
     */
    _generateTrackingId() {
        // Generate a timestamp-based tracking ID with random component
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `mtg-${timestamp}-${random}`;
    }
    /**
     * Enable debug mode
     */
    enableDebug() {
        this.debug.enable();
    }
    /**
     * Disable debug mode
     */
    disableDebug() {
        this.debug.disable();
    }
    /**
     * Reset rate limiter (useful for testing)
     */
    resetRateLimit() {
        if (this.rateLimiter) {
            this.rateLimiter.reset();
        }
    }
    /**
     * Check if rate limit allows a request
     * @returns True if request is allowed
     */
    canMakeRequest() {
        if (!this.rateLimiter)
            return true;
        return this.rateLimiter.canMakeRequest();
    }
    /**
     * Get time until next request is allowed (in ms)
     * @returns Milliseconds until next request is allowed, or 0 if allowed now
     */
    getTimeUntilNextRequest() {
        if (!this.rateLimiter)
            return 0;
        return this.rateLimiter.getTimeUntilNextRequest();
    }
}
exports.Metigan = Metigan;
// Export security utilities for advanced users
var security_2 = require("./security");
Object.defineProperty(exports, "sanitizeHtml", { enumerable: true, get: function () { return security_2.sanitizeHtml; } });
Object.defineProperty(exports, "sanitizeEmail", { enumerable: true, get: function () { return security_2.sanitizeEmail; } });
Object.defineProperty(exports, "sanitizeSubject", { enumerable: true, get: function () { return security_2.sanitizeSubject; } });
Object.defineProperty(exports, "isAllowedMimeType", { enumerable: true, get: function () { return security_2.isAllowedMimeType; } });
Object.defineProperty(exports, "isSafeFileExtension", { enumerable: true, get: function () { return security_2.isSafeFileExtension; } });
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return security_2.RateLimiter; } });
Object.defineProperty(exports, "DebugLogger", { enumerable: true, get: function () { return security_2.DebugLogger; } });
Object.defineProperty(exports, "ALLOWED_MIME_TYPES", { enumerable: true, get: function () { return security_2.ALLOWED_MIME_TYPES; } });
Object.defineProperty(exports, "BLOCKED_MIME_TYPES", { enumerable: true, get: function () { return security_2.BLOCKED_MIME_TYPES; } });
// Default export
exports.default = Metigan;
