/**
 * Metigan - Email Sending Library
 * A simple library for sending emails through the Metigan API
 * @version 2.4.0
 */

import { HttpClient, newIdempotencyKey } from '../core/client';
import { ApiError, MetiganError } from './errors';
import { MAX_FILE_SIZE } from './config';
import {
  sanitizeHtml, 
  sanitizeEmail, 
  sanitizeSubject, 
  isAllowedMimeType, 
  isSafeFileExtension,
  RateLimiter,
  DebugLogger
} from './security';
import type {
  OtpSendOptions,
  TransactionalSendOptions,
  OtpSendResponse,
  TransactionalSendResponse,
  EmailOptions,
  EmailApiResponse,
  EmailStatus,
} from './types';

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

// Global debug logger instance
let debugLogger: DebugLogger | null = null;

/**
 * Get or create debug logger instance
 */
function getDebugLogger(enabled: boolean = false): DebugLogger {
  if (!debugLogger) {
    debugLogger = new DebugLogger(enabled, '[Metigan]');
  }
  return debugLogger;
}

/**
 * Logger for Metigan library monitoring
 */
class MetiganLogger {
  private http: HttpClient;
  private userId: string;
  private disabled: boolean = false;
  private pendingLogs: Array<{endpoint: string, status: number, method: string}> = [];
  private isBatchProcessing: boolean = false;
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private debug: DebugLogger;

  // The API key authenticates the request (x-api-key); it is never put in
  // the log body (it used to be, in plaintext, on every batch).
  constructor(http: HttpClient, userId: string, debugEnabled: boolean = false) {
    this.http = http;
    this.userId = userId;
    this.debug = getDebugLogger(debugEnabled);
  }

  /**
   * Disables the logger
   */
  disable(): void {
    this.disabled = true;
    this.clearPendingLogs();
  }

  /**
   * Enables the logger
   */
  enable(): void {
    this.disabled = false;
  }

  /**
   * Clears pending logs
   */
  private clearPendingLogs(): void {
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
  private _validateStatus(status: number): { code: string, label: string } {
    // Convert to string and check if it's in the valid status list
    const statusStr = status.toString();
    const validStatus = STATUS_OPTIONS.find(option => option.value === statusStr);
    
    if (validStatus) {
      return { 
        code: statusStr, 
        label: validStatus.label 
      };
    } else {
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
  private _getUserAgent(): string {
    // In our case, we always use SDK
    return 'SDK';
  }

  /**
   * Processes the pending logs batch
   */
  private async processBatch(): Promise<void> {
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
          endpoint: log.endpoint,
          status: validatedStatus.code,
          statusLabel: validatedStatus.label,
          method: log.method,
          userAgent,
          timestamp: new Date().toISOString()
        };
      });

      // Send batch (best-effort telemetry: never throws to the caller).
      await this.http
        .request('POST', '/api/logs', { body: { logs: batchData }, timeout: 5000 })
        .catch((err: unknown) => {
          this.debug.warn('Warning processing logs batch:', (err as Error)?.message || 'Unknown error');
        });
    } catch (error: any) {
      this.debug.warn('Error processing logs batch:', error.message || 'Unknown error');
    } finally {
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
  private scheduleBatchProcessing(): void {
    if (!this.batchTimeout && !this.disabled) {
      this.batchTimeout = setTimeout(() => this.processBatch(), 1000); // Process every 1 second
    }
  }

  /**
   * Logs an operation to be sent in batch to the logs API
   */
  async log(endpoint: string, status: number, method: string): Promise<void> {
    if (this.disabled) return;

    // Add log to queue
    this.pendingLogs.push({ endpoint, status, method });
    
    // Schedule batch processing if needed
    this.scheduleBatchProcessing();
  }
}

// One error hierarchy for the whole SDK: `instanceof MetiganError` (and
// ApiError for HTTP failures) works for errors of every module.
export { MetiganError } from './errors';

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
 * Processed attachment interface for internal use
 */
interface ProcessedAttachment {
  filename: string;
  content: any;
  contentType: string;
  encoding: string;
  disposition: string;
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export type { EmailOptions, EmailSuccessResponse, EmailErrorResponse, ApiKeyErrorResponse, EmailApiResponse } from './types';


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
  /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
  baseUrl?: string;
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
export class Metigan {
  private http: HttpClient;
  private logger: MetiganLogger;
  private debug: DebugLogger;
  private shouldSanitizeHtml: boolean;
  private rateLimiter: RateLimiter | null;

  /**
   * Create a new Metigan client
   * @param apiKey - Your API key
   * @param options - Client options
   */
  constructor(apiKey: string, options: MetiganOptions = {}) {
    if (!apiKey) {
      throw new MetiganError('API key is required');
    }
    
    // Validate API key format (basic check)
    if (apiKey.length < 10) {
      throw new MetiganError('Invalid API key format');
    }

    // Shared zero-dependency HTTP core (timeout, retries, typed errors).
    this.http = new HttpClient({
      apiKey,
      baseUrl: options.baseUrl,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay,
    });

    // Security options
    this.debug = getDebugLogger(options.debug || false);
    this.shouldSanitizeHtml = options.sanitizeHtml !== false; // Default: true
    
    // Rate limiting (default: enabled, 10 req/sec)
    if (options.enableRateLimit !== false) {
      this.rateLimiter = new RateLimiter({
        maxRequests: options.maxRequestsPerSecond || 10,
        windowMs: 1000
      });
    } else {
      this.rateLimiter = null;
    }
    
    // Initialize logger
    const userId = options.userId || 'anonymous';
    this.logger = new MetiganLogger(this.http, userId, options.debug || false);
    
    // Disable logs if requested
    if (options.disableLogs) {
      this.logger.disable();
    }
    
    this.debug.log('Metigan client initialized');
  }

  /**
   * Enables logging
   */
  enableLogging(): void {
    this.logger.enable();
  }

  /**
   * Disables logging
   */
  disableLogging(): void {
    this.logger.disable();
  }

  /**
   * Validates an email address format
   * @param email - The email to validate
   * @returns True if email is valid
   * @private
   */
  private _validateEmail(email: string): boolean {
    // More comprehensive email validation
    if (!email || typeof email !== 'string') return false;
    
    // Simple email validation - check for @ and at least one dot after it
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    if (parts[0].length === 0) return false;
    
    // Verify domain part
    const domainParts = parts[1].split('.');
    if (domainParts.length < 2) return false;
    if (domainParts.some(part => part.length === 0)) return false;
    
    return true;
  }

  /**
   * Extracts email address from a format like "Name <email@example.com>"
   * @param from - The from field which might include a name
   * @returns The extracted email address
   * @private
   */
  private _extractEmailAddress(from: string): string {
    if (!from) return '';
    
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
  private _validateMessageData(messageData: EmailOptions): ValidationResult {
    // Check required fields
    if (!messageData.from) {
      return { isValid: false, error: 'Sender email (from) is required' };
    }
    
    if (!messageData.recipients || !Array.isArray(messageData.recipients) || messageData.recipients.length === 0) {
      return { isValid: false, error: 'Recipients must be a non-empty array' };
    }
    
    if (!messageData.subject && !messageData.templateId) {
      return { isValid: false, error: 'Subject is required (or a templateId whose subject is used)' };
    }
    
    // Either content or templateId is required
    if (!messageData.content && !messageData.templateId) {
      return { isValid: false, error: 'Either content or templateId is required' };
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
  private async _processAttachments(
    attachments: Array<File | NodeAttachment | CustomAttachment>
  ): Promise<ProcessedAttachment[]> {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return [];
    }

    const processedAttachments: ProcessedAttachment[] = [];

    for (const file of attachments) {
      let buffer: ArrayBuffer | Buffer | Uint8Array | string;
      let filename: string;
      let mimetype: string;

      // Handle File objects (browser)
      if (typeof File !== 'undefined' && file instanceof File) {
        if (file.size > MAX_FILE_SIZE) {
          throw new MetiganError(`File ${file.name} exceeds the maximum size of 7MB`);
        }
        
        buffer = await file.arrayBuffer();
        filename = file.name;
        mimetype = file.type || this._getMimeType(file.name);
      } 
      // Handle Buffer objects (Node.js)
      else if ('buffer' in file && 'originalname' in file) {
        const nodeFile = file as NodeAttachment;
        
        if (nodeFile.buffer.length > MAX_FILE_SIZE) {
          throw new MetiganError(`File ${nodeFile.originalname} exceeds the maximum size of 7MB`);
        }
        
        buffer = nodeFile.buffer;
        filename = nodeFile.originalname;
        mimetype = nodeFile.mimetype || this._getMimeType(nodeFile.originalname);
      }
      // Handle custom objects
      else if ('content' in file && 'filename' in file) {
        const customFile = file as CustomAttachment;
        
        // Check size for different types of content
        let contentSize = 0;
        if (customFile.content instanceof ArrayBuffer) {
          contentSize = customFile.content.byteLength;
        } else if (customFile.content instanceof Buffer || customFile.content instanceof Uint8Array) {
          contentSize = customFile.content.length;
        } else if (typeof customFile.content === 'string') {
          contentSize = Buffer.from(customFile.content).length;
        }
        
        if (contentSize > MAX_FILE_SIZE) {
          throw new MetiganError(`File ${customFile.filename} exceeds the maximum size of 7MB`);
        }
        
        buffer = customFile.content;
        filename = customFile.filename;
        mimetype = customFile.contentType || this._getMimeType(customFile.filename);
      } else {
        throw new MetiganError('Invalid attachment format');
      }

      // Convert buffer to base64 if needed
      let content: any = buffer;
      
      // In browser environments, convert to base64
      if (typeof window !== 'undefined') {
        if (buffer instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(buffer);
          const binary = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
          content = btoa(binary);
        } else if (buffer instanceof Uint8Array) {
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
  private async _validateAttachments(
    attachments: Array<File | NodeAttachment | CustomAttachment>
  ): Promise<void> {
    for (const file of attachments) {
      let filename: string;
      let mimetype: string;

      // Get filename and mimetype based on file type
      if (typeof File !== 'undefined' && file instanceof File) {
        filename = file.name;
        mimetype = file.type;
      } else if ('buffer' in file && 'originalname' in file) {
        const nodeFile = file as NodeAttachment;
        filename = nodeFile.originalname;
        mimetype = nodeFile.mimetype;
      } else if ('content' in file && 'filename' in file) {
        const customFile = file as CustomAttachment;
        filename = customFile.filename;
        mimetype = customFile.contentType;
      } else {
        throw new MetiganError('Invalid attachment format');
      }

      // Validate file extension
      if (!isSafeFileExtension(filename)) {
        throw new MetiganError(`File extension not allowed for security reasons: ${filename}`);
      }

      // Validate MIME type
      if (mimetype && !isAllowedMimeType(mimetype)) {
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
  private _getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    // Basic mapping of extensions to MIME types
    const mimeMap: Record<string, string> = {
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
   * Send an email
   * @param options - Email options
   * @returns Response from the API
   */
  async sendEmail(options: EmailOptions): Promise<EmailApiResponse> {
    // Check rate limit
    if (this.rateLimiter && !this.rateLimiter.tryRequest()) {
      const waitTime = this.rateLimiter.getTimeUntilNextRequest();
      throw new MetiganError(`Rate limit exceeded. Please wait ${waitTime}ms before making another request.`);
    }

    const validation = this._validateMessageData(options);
    if (!validation.isValid) {
      throw new MetiganError(validation.error || 'Invalid email data');
    }

    // Fields sent as JSON or as multipart form fields (strings).
    const fields: Record<string, unknown> = {
      from: sanitizeEmail(options.from),
      recipients: options.recipients.map(r => sanitizeEmail(r)),
      subject: options.subject ? sanitizeSubject(options.subject) : undefined,
      cc: options.cc?.length ? options.cc.map(c => sanitizeEmail(c)) : undefined,
      bcc: options.bcc?.length ? options.bcc.map(b => sanitizeEmail(b)) : undefined,
      replyTo: options.replyTo ? sanitizeEmail(options.replyTo) : undefined,
      text: options.text,
      variables: options.variables,
      type: options.type,
      trackOpens: options.trackOpens,
      trackClicks: options.trackClicks,
      unsubscribe: options.unsubscribe,
      headers: options.headers,
    };
    if (options.templateId) {
      fields.useTemplate = 'true';
      fields.templateId = options.templateId;
    } else if (options.content) {
      fields.content = this.shouldSanitizeHtml ? sanitizeHtml(options.content) : options.content;
    }

    // One key per call, reused by the HTTP client's retries: a timeout
    // followed by a retry can never send the email twice.
    const idempotencyKey = options.idempotencyKey || newIdempotencyKey();
    const headers = { 'Idempotency-Key': idempotencyKey };

    let request: { form?: FormData; body?: unknown; headers: Record<string, string> } = { body: fields, headers };
    if (options.attachments && options.attachments.length > 0) {
      await this._validateAttachments(options.attachments);
      const fileLike = options.attachments.every(
        (a: any) => (typeof File !== 'undefined' && a instanceof File) || (typeof Blob !== 'undefined' && a instanceof Blob),
      );
      if (fileLike) {
        // File/Blob attachments go as multipart form-data (browser, Node 18+).
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) {
          if (v === undefined) continue;
          form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
        }
        for (const file of options.attachments as Array<File | Blob>) {
          form.append('files', file, (file as File).name);
        }
        request = { form, headers };
      } else {
        // Buffer/base64 attachments (Node) go as JSON.
        request = { body: { ...fields, attachments: await this._processAttachments(options.attachments) }, headers };
      }
    }

    try {
      const response = await this.http.request<EmailApiResponse>('POST', '/api/email/send', request);
      await this.logger.log('/email/send', 200, 'POST');
      return response;
    } catch (error: unknown) {
      await this.logger.log('/email/send', error instanceof ApiError && error.status ? error.status : 500, 'POST');
      // ApiError keeps status and data (429 vs 400 vs 403 matter to callers).
      if (error instanceof MetiganError) throw error;
      throw new MetiganError('An unexpected error occurred while sending email');
    }
  }

  /**
   * Send an OTP (one-time code) email: dedicated realtime queue and worker
   * pool, no tracking, no List-Unsubscribe. Safe to retry: one email per
   * idempotency key (generated per call when omitted).
   */
  async sendOtp(options: OtpSendOptions): Promise<OtpSendResponse> {
    const recipient = options.to || options.email;
    if (!recipient) {
      throw new MetiganError('Recipient email is required');
    }
    if (!options.from) {
      throw new MetiganError('Sender email (from) is required');
    }
    if (options.code === undefined || options.code === null || options.code === '') {
      throw new MetiganError('OTP code is required');
    }

    const payload = {
      to: sanitizeEmail(recipient),
      from: sanitizeEmail(options.from),
      replyTo: options.replyTo ? sanitizeEmail(options.replyTo) : undefined,
      code: typeof options.code === 'number' ? String(options.code) : options.code,
      appName: options.appName,
      expiresInMinutes: options.expiresInMinutes,
      locale: options.locale,
      subject: options.subject ? sanitizeSubject(options.subject) : undefined,
      templateId: options.templateId,
      variables: options.variables,
      text: options.text,
      headers: options.headers,
    };
    return this.http.request<OtpSendResponse>('POST', '/api/otp/send', {
      body: payload,
      headers: { 'Idempotency-Key': options.idempotencyKey || newIdempotencyKey() },
    });
  }

  /**
   * Send a transactional email (password reset, account verification,
   * welcome, receipt): realtime queue, opens tracked, links not tracked by
   * default. Safe to retry: one email per idempotency key.
   */
  async sendTransactional(options: TransactionalSendOptions): Promise<TransactionalSendResponse> {
    const recipient = options.to || options.email;
    if (!recipient) {
      throw new MetiganError('Recipient email is required');
    }
    if (!options.from) {
      throw new MetiganError('Sender email (from) is required');
    }
    const content = options.content || options.html;
    if (!content && !options.templateId) {
      throw new MetiganError('Content (html) or templateId is required');
    }
    if (!options.subject && !options.templateId) {
      throw new MetiganError('Subject is required');
    }

    const payload = {
      to: sanitizeEmail(recipient),
      from: sanitizeEmail(options.from),
      replyTo: options.replyTo ? sanitizeEmail(options.replyTo) : undefined,
      subject: options.subject ? sanitizeSubject(options.subject) : undefined,
      content: content ? (this.shouldSanitizeHtml ? sanitizeHtml(content) : content) : undefined,
      text: options.text,
      templateId: options.templateId,
      variables: options.variables,
      trackOpens: options.trackOpens,
      trackClicks: options.trackClicks,
      headers: options.headers,
    };
    return this.http.request<TransactionalSendResponse>('POST', '/api/transactional/send', {
      body: payload,
      headers: { 'Idempotency-Key': options.idempotencyKey || newIdempotencyKey() },
    });
  }

  /**
   * Where an email is now: queued/sending, sent, delivered, opened,
   * clicked, bounced, failed… `emailId` comes from the send response.
   * A 404 right after sending means the worker has not picked it up yet.
   */
  async getEmailStatus(emailId: string): Promise<EmailStatus> {
    if (!emailId) {
      throw new MetiganError('emailId is required');
    }
    const res = await this.http.request<{ success: boolean; data: EmailStatus }>('GET', `/api/email/${encodeURIComponent(emailId)}`);
    return res.data;
  }

  /**
   * Enable debug mode
   */
  enableDebug(): void {
    this.debug.enable();
  }

  /**
   * Disable debug mode
   */
  disableDebug(): void {
    this.debug.disable();
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  resetRateLimit(): void {
    if (this.rateLimiter) {
      this.rateLimiter.reset();
    }
  }

  /**
   * Check if rate limit allows a request
   * @returns True if request is allowed
   */
  canMakeRequest(): boolean {
    if (!this.rateLimiter) return true;
    return this.rateLimiter.canMakeRequest();
  }

  /**
   * Get time until next request is allowed (in ms)
   * @returns Milliseconds until next request is allowed, or 0 if allowed now
   */
  getTimeUntilNextRequest(): number {
    if (!this.rateLimiter) return 0;
    return this.rateLimiter.getTimeUntilNextRequest();
  }
}

// Export security utilities for advanced users
export { 
  sanitizeHtml, 
  sanitizeEmail, 
  sanitizeSubject, 
  isAllowedMimeType, 
  isSafeFileExtension,
  RateLimiter,
  DebugLogger,
  ALLOWED_MIME_TYPES,
  BLOCKED_MIME_TYPES
} from './security';

// Default export
export default Metigan;