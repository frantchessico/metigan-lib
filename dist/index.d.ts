/**
 * Type definitions for Metigan library
 * @version 2.4.0
 */
/**
 * Interface for email attachment in Node.js environment
 */
interface NodeAttachment {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}
/**
 * Interface for email attachment in any environment
 */
interface CustomAttachment {
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
/** Delivery options shared by every send method. */
interface DeliveryOptions {
    /**
     * Makes the send safe to retry: the API answers a repeated key with the
     * first response, without sending again. The SDK generates one per call
     * (reused by its own retries) when you omit it; pass your own to also
     * cover retries of your code (e.g. `reset:${userId}:${requestId}`).
     */
    idempotencyKey?: string;
    /** Your own `X-` headers (at most 10, printable ASCII; not `X-Metigan-*`). */
    headers?: Record<string, string>;
}
/**
 * Email options interface
 */
interface EmailOptions extends DeliveryOptions {
    /** Sender email address (or Name <email>) */
    from: string;
    /** List of recipient email addresses */
    recipients: string[];
    /** Email subject (optional with a templateId: the template's subject is used) */
    subject?: string;
    /** Email content (HTML supported) - Required if not using templateId */
    content?: string;
    /** Plain-text part (derived from the HTML for transactional sends when omitted) */
    text?: string;
    /** Template ID for using pre-created templates (optional) */
    templateId?: string;
    /**
     * Values for `{{name}}` in the subject, content and template. In HTML,
     * `{{name}}` is escaped; use `{{{name}}}` for trusted HTML.
     */
    variables?: Record<string, string | number | boolean>;
    /**
     * `transactional` (codes, resets, receipts: realtime queue, no
     * List-Unsubscribe, links not tracked) or `marketing`. Omitted: one
     * recipient is transactional, several are marketing.
     */
    type?: 'transactional' | 'marketing';
    /** Track opens (default true). */
    trackOpens?: boolean;
    /** Track clicks (default true; false for `type: 'transactional'`). */
    trackClicks?: boolean;
    /** Add List-Unsubscribe (default true; false for `type: 'transactional'`). */
    unsubscribe?: boolean;
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
 * OTP send options. OTPs go through a dedicated queue and worker pool
 * (never behind campaigns), without tracking or List-Unsubscribe.
 */
interface OtpSendOptions extends DeliveryOptions {
    /** Recipient email */
    to?: string;
    /** Recipient email (alias) */
    email?: string;
    /** Sender email address */
    from: string;
    /** Reply-to address */
    replyTo?: string;
    /** OTP code (a string keeps leading zeros) */
    code: string | number;
    /** App name shown in the default email */
    appName?: string;
    /** Expiration shown in the default email (minutes, default 10) */
    expiresInMinutes?: number;
    /** Language of the default email: `pt` (default), `en` or `es` */
    locale?: string;
    /** Optional subject */
    subject?: string;
    /** Your own template; it gets `{{code}}`, `{{appName}}`, `{{expiresInMinutes}}` and `variables` */
    templateId?: string;
    /** Extra template variables */
    variables?: Record<string, string | number | boolean>;
    /** Plain-text part (a localized one is sent by default) */
    text?: string;
}
/**
 * Transactional send options (password resets, verifications, receipts):
 * realtime queue, opens tracked, links not tracked by default.
 */
interface TransactionalSendOptions extends DeliveryOptions {
    /** Recipient email */
    to?: string;
    /** Recipient email (alias) */
    email?: string;
    /** Sender email address */
    from: string;
    /** Reply-to address */
    replyTo?: string;
    /** Subject (optional with a templateId) */
    subject?: string;
    /** HTML content */
    content?: string;
    /** HTML content (alias) */
    html?: string;
    /** Plain-text part (derived from the HTML when omitted) */
    text?: string;
    /** Template ID (instead of content) */
    templateId?: string;
    /** Values for `{{name}}` (escaped in HTML) and `{{{name}}}` (raw) */
    variables?: Record<string, string | number | boolean>;
    /** Track opens (default true) */
    trackOpens?: boolean;
    /**
     * Track clicks (default false: a reset or verification link rewritten
     * through a tracker can be opened by a mail scanner and burn the token).
     * Mark single links with `data-metigan-notrack` to keep them untracked.
     */
    trackClicks?: boolean;
}
/** Response of sendOtp and sendTransactional. */
interface QuickSendResponse {
    success: boolean;
    queued: boolean;
    status: 'queued';
    /** Id of the email: pass it to getEmailStatus. */
    emailId: string;
    trackingId: string;
}
/** OTP send response */
type OtpSendResponse = QuickSendResponse;
/** Transactional send response */
type TransactionalSendResponse = QuickSendResponse;
/** Where an email is now (getEmailStatus). */
interface EmailStatus {
    emailId: string;
    trackingId: string;
    messageId?: string;
    status: 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed' | 'skipped' | string;
    kind?: 'otp' | 'transactional' | 'campaign' | string;
    recipient: string;
    subject: string;
    queuedAt?: string;
    sentAt?: string;
    deliveredAt?: string;
    firstOpenedAt?: string;
    openCount: number;
    clickCount: number;
    bounceReason?: string;
    failureReason?: string;
    /** Last temporary error while it is still being retried. */
    lastError?: string;
}
/**
 * Validation result interface
 */
interface ValidationResult {
    isValid: boolean;
    error?: string;
}
/**
 * API response interface for successful email
 */
interface EmailSuccessResponse {
    success: true;
    message: string;
    /** `transactional` or `marketing`. */
    type?: 'transactional' | 'marketing';
    successfulEmails: {
        recipient: string;
        /** Pass it to getEmailStatus. */
        emailId: string;
        trackingId: string;
        jobId?: string;
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
interface EmailErrorResponse {
    error: string;
    message: string;
}
/**
 * API key error response
 */
interface ApiKeyErrorResponse {
    error: string;
}
/**
 * Union type for all possible API responses
 */
type EmailApiResponse = EmailSuccessResponse | EmailErrorResponse | ApiKeyErrorResponse;
/**
 * Template variables type
 */
type TemplateVariables = Record<string, string | number | boolean>;
/**
 * Template function type
 */
type TemplateFunction = (variables?: TemplateVariables) => string;
/**
 * Form field types
 */
type FormFieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'phone' | 'url' | 'file' | 'step' | 'password' | 'rating' | 'slider' | 'heading' | 'image-choice' | 'matrix';
/**
 * Form field validation rules
 */
interface FormFieldValidation {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    step?: number;
    options?: string[];
}
/**
 * Form field configuration
 */
interface FormFieldConfig {
    /** Unique field ID */
    id: string;
    /** Field type */
    type: FormFieldType;
    /** Field label */
    label: string;
    /** Placeholder text */
    placeholder?: string;
    /** Whether field is required */
    required?: boolean;
    /** Help text shown below field */
    helpText?: string;
    /** Options for select, checkbox, radio, image-choice */
    options?: string[];
    /** Image URLs for image-choice field */
    imageUrls?: string[];
    /** Validation rules */
    validation?: FormFieldValidation;
    /** Default value */
    defaultValue?: string | number | boolean;
}
/**
 * Button customization options
 */
interface ButtonCustomization {
    text?: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    fullWidth?: boolean;
    rounded?: boolean;
    position?: 'left' | 'center' | 'right';
}
/**
 * Form appearance settings
 */
interface FormAppearance {
    backgroundType?: 'color' | 'image' | 'none';
    backgroundColor?: string;
    backgroundImage?: string;
    inputStyle?: 'default' | 'underlined' | 'filled' | 'bordered';
    fontFamily?: string;
    primaryColor?: string;
}
/**
 * Form settings
 */
interface FormSettings {
    successMessage?: string;
    processingMessage?: string;
    redirectUrl?: string;
    notifyEmail?: string;
    enableCaptcha?: boolean;
    storeResponses?: boolean;
    allowMultipleSubmissions?: boolean;
    showProgressBar?: boolean;
}
/**
 * Form analytics data
 */
interface FormAnalytics {
    views: number;
    submissions: number;
    uniqueVisitors?: number;
    averageCompletionTime?: number;
    conversionRate?: number;
}
/**
 * Complete form configuration
 */
interface FormConfig {
    id?: string;
    title: string;
    description?: string;
    coverImage?: string;
    fields: FormFieldConfig[];
    audienceId?: string;
    buttonCustomization?: ButtonCustomization;
    appearance?: FormAppearance;
    settings?: FormSettings;
    published?: boolean;
    publishedUrl?: string;
    slug?: string;
    customDomain?: string;
    analytics?: FormAnalytics;
    createdAt?: Date;
    updatedAt?: Date;
}
/**
 * Form submission data
 */
interface FormSubmissionData {
    [fieldId: string]: any;
}
/**
 * Form submission options
 */
interface FormSubmissionOptions {
    /** Form ID or slug */
    formId: string;
    /** Submission data */
    data: FormSubmissionData;
}
/**
 * Form submission response
 */
interface FormSubmissionResponse {
    success: boolean;
    message: string;
    submissionId?: string;
}
/**
 * Form list response
 */
interface FormListResponse {
    forms: FormConfig[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
/**
 * Contact status
 */
type ContactStatus = 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
/**
 * Contact data
 */
interface Contact {
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    status: ContactStatus;
    audienceId: string;
    tags?: string[];
    customFields?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
    lastActivityAt?: Date;
}
/**
 * Contact creation options
 */
interface CreateContactOptions {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    audienceId: string;
    tags?: string[];
    customFields?: Record<string, any>;
    status?: ContactStatus;
}
/**
 * Contact update options
 */
interface UpdateContactOptions {
    firstName?: string;
    lastName?: string;
    phone?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    status?: ContactStatus;
}
/**
 * Contact list filters
 */
interface ContactListFilters {
    audienceId?: string;
    status?: ContactStatus;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
}
/**
 * Contact list response
 */
interface ContactListResponse {
    contacts: Contact[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
/**
 * Bulk contact operation result
 */
interface BulkContactResult {
    success: boolean;
    imported: number;
    failed: number;
    errors?: {
        email: string;
        error: string;
    }[];
}
/**
 * Audience data
 */
interface Audience {
    id?: string;
    name: string;
    description?: string;
    count: number;
    createdAt?: Date;
    updatedAt?: Date;
}
/**
 * Audience creation options
 */
interface CreateAudienceOptions {
    name: string;
    description?: string;
}
/**
 * Audience update options
 */
interface UpdateAudienceOptions {
    name?: string;
    description?: string;
}
/**
 * Audience list response
 */
interface AudienceListResponse {
    audiences: Audience[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
/**
 * Audience statistics
 */
interface AudienceStats {
    total: number;
    subscribed: number;
    unsubscribed: number;
    pending: number;
    bounced: number;
    complained: number;
    growthRate?: number;
}
/**
 * Pagination options
 */
interface PaginationOptions {
    page?: number;
    limit?: number;
}
/**
 * API response wrapper
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
/**
 * Client options for Metigan
 */
interface MetiganClientOptions {
    /** API Key */
    apiKey: string;
    /**
     * Override the API base URL. Defaults to the `METIGAN_API_URL` environment
     * variable, then `https://api.metigan.io`.
     */
    baseUrl?: string;
    /** User ID for logging */
    userId?: string;
    /** Disable logging */
    disableLogs?: boolean;
    /** Request timeout in ms */
    timeout?: number;
    /** Number of retries */
    retryCount?: number;
    /** Delay between retries in ms */
    retryDelay?: number;
    /** Enable debug mode (shows internal logs) */
    debug?: boolean;
    /** Enable HTML sanitization for email content (default: true) */
    sanitizeHtml?: boolean;
    /** Enable client-side rate limiting (default: true) */
    enableRateLimit?: boolean;
    /** Max requests per second for rate limiting (default: 10) */
    maxRequestsPerSecond?: number;
    /**
     * Default webhook signing secret (`whsec_…`) used by `client.webhooks.verify`.
     * Optional; the secret can also be passed per `verify()` call.
     */
    webhookSecret?: string;
}
/**
 * Email template component style
 */
interface TemplateComponentStyle {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: string;
    borderRadius?: number;
    padding?: string | number;
    width?: number | string;
    align?: string;
    borderColor?: string;
    spacing?: number;
}
/**
 * Email template component
 */
interface TemplateComponent {
    id: string;
    type: string;
    label?: string;
    content?: string;
    url?: string;
    title?: string;
    styles?: TemplateComponentStyle;
    [key: string]: any;
}
/**
 * Email template styles
 */
interface TemplateStyles {
    backgroundColor?: string;
    width?: number;
    padding?: number;
}
/**
 * Email template data
 */
interface EmailTemplate {
    /** Template ID */
    id: string;
    /** Template name */
    name: string;
    /** Email subject line */
    subject: string;
    /** Template components (for advanced usage) */
    components?: TemplateComponent[];
    /** Template styles */
    styles?: TemplateStyles;
    /** Creation date */
    createdAt?: Date;
    /** Last update date */
    updatedAt?: Date;
}
/**
 * Email template list response
 */
interface EmailTemplateListResponse {
    templates: EmailTemplate[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
/**
 * Template module options
 */
interface TemplateModuleOptions {
    apiKey: string;
    /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}

/**
 * Custom error classes for Metigan
 */
/**
 * Base error class for Metigan-specific errors
 * Hides implementation details from stack traces
 */
declare class MetiganError extends Error {
    constructor(message: string);
}
/**
 * Error thrown when validation fails
 */
declare class ValidationError extends MetiganError {
    constructor(message: string);
}
/**
 * Error thrown when API request fails
 */
declare class ApiError extends MetiganError {
    /** HTTP status code of the failed response. */
    status?: number;
    /** Parsed response body of the failed response, when available. */
    data?: unknown;
    constructor(message: string, status?: number, data?: unknown);
}
/**
 * Error thrown when an incoming webhook cannot be verified.
 *
 * Every failure mode of {@link verifyWebhook} — a missing or malformed
 * signature header, a timestamp outside the tolerance window, a signature
 * that does not match, or a body that is not valid JSON — raises this
 * error. Treat it as "reject the request" (respond 400) and never trust the
 * payload.
 */
declare class WebhookSignatureError extends MetiganError {
    /** Machine-readable reason, for logging/metrics. */
    readonly reason: 'missing_secret' | 'missing_signature' | 'invalid_signature_format' | 'timestamp_out_of_tolerance' | 'no_signature_match' | 'invalid_payload' | 'crypto_unavailable';
    constructor(message: string, reason: WebhookSignatureError['reason']);
}

/**
 * Metigan Security Module
 * Security utilities for the Metigan SDK
 * @version 2.4.0
 */
/**
 * Allowed MIME types for attachments
 */
declare const ALLOWED_MIME_TYPES: string[];
/**
 * Blocked MIME types (executable content)
 */
declare const BLOCKED_MIME_TYPES: string[];
/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML
 */
declare function sanitizeHtml(html: string): string;
/**
 * Validate MIME type against allowed list
 * @param mimeType - MIME type to validate
 * @returns True if MIME type is allowed
 */
declare function isAllowedMimeType(mimeType: string): boolean;
/**
 * Validate file extension
 * @param filename - File name to check
 * @returns True if extension is safe
 */
declare function isSafeFileExtension(filename: string): boolean;
/**
 * Sanitize email address - remove potential injection characters
 * @param email - Email to sanitize
 * @returns Sanitized email
 */
declare function sanitizeEmail(email: string): string;
/**
 * Sanitize subject line
 * @param subject - Subject to sanitize
 * @returns Sanitized subject
 */
declare function sanitizeSubject(subject: string): string;
/**
 * Rate limiter configuration
 */
interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
}
/**
 * Simple in-memory rate limiter
 */
declare class RateLimiter {
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
declare class DebugLogger {
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

/**
 * Metigan - Email Sending Library
 * A simple library for sending emails through the Metigan API
 * @version 2.4.0
 */

/**
 * Metigan client options
 */
interface MetiganOptions {
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
declare class Metigan$1 {
    private http;
    private logger;
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
     * Send an email
     * @param options - Email options
     * @returns Response from the API
     */
    sendEmail(options: EmailOptions): Promise<EmailApiResponse>;
    /**
     * Send an OTP (one-time code) email: dedicated realtime queue and worker
     * pool, no tracking, no List-Unsubscribe. Safe to retry: one email per
     * idempotency key (generated per call when omitted).
     */
    sendOtp(options: OtpSendOptions): Promise<OtpSendResponse>;
    /**
     * Send a transactional email (password reset, account verification,
     * welcome, receipt): realtime queue, opens tracked, links not tracked by
     * default. Safe to retry: one email per idempotency key.
     */
    sendTransactional(options: TransactionalSendOptions): Promise<TransactionalSendResponse>;
    /**
     * Where an email is now: queued/sending, sent, delivered, opened,
     * clicked, bounced, failed… `emailId` comes from the send response.
     * A 404 right after sending means the worker has not picked it up yet.
     */
    getEmailStatus(emailId: string): Promise<EmailStatus>;
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

/**
 * Metigan Forms Module
 * Handles form submissions and form data retrieval
 * @version 2.4.0
 */

/**
 * Forms module options
 */
interface FormsModuleOptions {
    apiKey: string;
    /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}
/**
 * MetiganForms class for form operations
 */
declare class MetiganForms {
    private http;
    /**
     * Create a new MetiganForms instance
     * @param options - Forms module options
     */
    constructor(options: FormsModuleOptions);
    private makeRequest;
    /**
     * Submit data to a form
     * @param options - Submission options
     * @returns Submission response
     */
    submit(options: FormSubmissionOptions): Promise<FormSubmissionResponse>;
    /**
     * Get form by ID or slug
     * @param formIdOrSlug - Form ID or slug
     * @returns Form configuration
     */
    getForm(formIdOrSlug: string): Promise<FormConfig>;
    /**
     * Get form by slug (public)
     * @param slug - Form slug
     * @returns Form configuration for public display
     */
    getPublicForm(slug: string): Promise<FormConfig>;
    /**
     * List all forms
     * @param options - Pagination options
     * @returns List of forms
     */
    listForms(options?: PaginationOptions): Promise<FormListResponse>;
    /**
     * Get form analytics
     * @param formId - Form ID
     * @returns Form analytics data
     */
    getAnalytics(formId: string): Promise<FormAnalytics>;
    /**
     * Create a new form
     * @param config - Form configuration
     * @returns Created form
     */
    createForm(config: Omit<FormConfig, 'id'>): Promise<FormConfig>;
    /**
     * Update an existing form
     * @param formId - Form ID
     * @param config - Updated form configuration
     * @returns Updated form
     */
    updateForm(formId: string, config: Partial<FormConfig>): Promise<FormConfig>;
    /**
     * Delete a form
     * @param formId - Form ID
     * @returns Success status
     */
    deleteForm(formId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Publish a form
     * @param formId - Form ID
     * @param slug - Optional custom slug
     * @returns Published form URL
     */
    publishForm(formId: string, slug?: string): Promise<{
        publishedUrl: string;
        slug: string;
    }>;
    /**
     * Unpublish a form
     * @param formId - Form ID
     * @returns Success status
     */
    unpublishForm(formId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Get form submissions
     * @param formId - Form ID
     * @param options - Pagination options
     * @returns List of submissions
     */
    getSubmissions(formId: string, options?: PaginationOptions): Promise<{
        submissions: any[];
        pagination: any;
    }>;
}

/**
 * Metigan Contacts Module
 * Handles contact/subscriber management
 * @version 2.4.0
 */

/**
 * Contacts module options
 */
interface ContactsModuleOptions {
    apiKey: string;
    /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}
/**
 * MetiganContacts class for contact operations
 */
declare class MetiganContacts {
    private http;
    /**
     * Create a new MetiganContacts instance
     * @param options - Contacts module options
     */
    constructor(options: ContactsModuleOptions);
    /** Validate email format (local, before hitting the API). */
    private validateEmail;
    private request;
    /**
     * Create a new contact
     * @param options - Contact creation options
     * @returns Created contact
     */
    create(options: CreateContactOptions): Promise<Contact>;
    /**
     * Get a contact by ID
     * @param contactId - Contact ID
     * @returns Contact data
     */
    get(contactId: string): Promise<Contact>;
    /**
     * Get a contact by email
     * @param email - Contact email
     * @param audienceId - Audience ID
     * @returns Contact data
     */
    getByEmail(email: string, audienceId: string): Promise<Contact>;
    /**
     * Update a contact
     * @param contactId - Contact ID
     * @param options - Update options
     * @returns Updated contact
     */
    update(contactId: string, options: UpdateContactOptions): Promise<Contact>;
    /**
     * Delete a contact
     * @param contactId - Contact ID
     * @param audienceId - Audience ID (required by the server)
     * @returns Success status
     */
    delete(contactId: string, audienceId?: string): Promise<{
        success: boolean;
    }>;
    /**
     * List contacts with filters
     * @param filters - List filters
     * @returns Contact list
     */
    list(filters?: ContactListFilters): Promise<ContactListResponse>;
    /**
     * Subscribe a contact (set status to subscribed)
     * @param contactId - Contact ID
     * @returns Updated contact
     */
    subscribe(contactId: string): Promise<Contact>;
    /**
     * Unsubscribe a contact
     * @param contactId - Contact ID
     * @returns Updated contact
     */
    unsubscribe(contactId: string): Promise<Contact>;
    /**
     * Add tags to a contact
     * @param contactId - Contact ID
     * @param tags - Tags to add
     * @returns Updated contact
     */
    addTags(contactId: string, tags: string[]): Promise<Contact>;
    /**
     * Remove tags from a contact
     * @param contactId - Contact ID
     * @param tags - Tags to remove
     * @returns Updated contact
     */
    removeTags(contactId: string, tags: string[]): Promise<Contact>;
    /**
     * Bulk import contacts into an audience
     * @param contacts - Array of contacts to import
     * @param audienceId - Target audience ID
     * @returns Import result
     */
    bulkImport(contacts: Array<{
        email: string;
        firstName?: string;
        lastName?: string;
        tags?: string[];
    }>, audienceId: string): Promise<BulkContactResult>;
    /**
     * Export contacts from an audience.
     * - `format: 'csv'` resolves the raw CSV text.
     * - `format: 'json'` resolves the contacts array.
     * @param audienceId - Audience ID
     * @param format - Export format (csv or json)
     */
    export(audienceId: string, format: 'csv'): Promise<string>;
    export(audienceId: string, format?: 'json'): Promise<Contact[]>;
    /**
     * Search contacts
     * @param query - Search query (min 2 characters)
     * @param audienceId - Optional audience ID to filter
     * @returns Matching contacts
     */
    search(query: string, audienceId?: string): Promise<Contact[]>;
}

/**
 * Metigan Audiences Module
 * Handles audience/list management
 * @version 2.4.0
 */

/**
 * Audiences module options
 */
interface AudiencesModuleOptions {
    apiKey: string;
    /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}
/**
 * MetiganAudiences class for audience operations
 */
declare class MetiganAudiences {
    private http;
    /**
     * Create a new MetiganAudiences instance
     * @param options - Audiences module options
     */
    constructor(options: AudiencesModuleOptions);
    private makeRequest;
    /**
     * Create a new audience
     * @param options - Audience creation options
     * @returns Created audience
     */
    create(options: CreateAudienceOptions): Promise<Audience>;
    /**
     * Get an audience by ID
     * @param audienceId - Audience ID
     * @returns Audience data
     */
    get(audienceId: string): Promise<Audience>;
    /**
     * Update an audience
     * @param audienceId - Audience ID
     * @param options - Update options
     * @returns Updated audience
     */
    update(audienceId: string, options: UpdateAudienceOptions): Promise<Audience>;
    /**
     * Delete an audience
     * @param audienceId - Audience ID
     * @returns Success status
     */
    delete(audienceId: string): Promise<{
        success: boolean;
    }>;
    /**
     * List all audiences
     * @param options - Pagination options
     * @returns Audience list
     */
    list(options?: PaginationOptions): Promise<AudienceListResponse>;
    /**
     * Get audience statistics
     * @param audienceId - Audience ID
     * @returns Audience statistics
     */
    getStats(audienceId: string): Promise<AudienceStats>;
    /**
     * Get total count of contacts in an audience
     * @param audienceId - Audience ID
     * @returns Contact count
     */
    getCount(audienceId: string): Promise<number>;
    /**
     * Merge two audiences
     * @param sourceAudienceId - Source audience ID (will be deleted)
     * @param targetAudienceId - Target audience ID (will receive contacts)
     * @returns Merged audience
     */
    merge(sourceAudienceId: string, targetAudienceId: string): Promise<Audience>;
    /**
     * Duplicate an audience
     * @param audienceId - Audience ID to duplicate
     * @param newName - Name for the new audience
     * @returns New duplicated audience
     */
    duplicate(audienceId: string, newName: string): Promise<Audience>;
    /**
     * Clean audience (remove bounced and unsubscribed contacts)
     * @param audienceId - Audience ID
     * @returns Cleanup result
     */
    clean(audienceId: string): Promise<{
        removed: number;
    }>;
    /**
     * Search audiences by name
     * @param query - Search query
     * @returns Matching audiences
     */
    search(query: string): Promise<Audience[]>;
}

/**
 * Metigan Templates Module
 * Manage email templates created in the Metigan dashboard
 * @version 2.4.0
 */

/**
 * MetiganTemplates - Manage email templates
 */
declare class MetiganTemplates {
    private http;
    constructor(options: TemplateModuleOptions);
    private makeRequest;
    /**
     * List all templates
     * @param options - Pagination options
     * @returns List of templates with pagination info
     *
     * @example
     * ```typescript
     * const templates = await metigan.templates.list();
     * console.log(templates.templates); // Array of templates
     * ```
     */
    list(options?: PaginationOptions): Promise<EmailTemplateListResponse>;
    /**
     * Get a specific template by ID
     * @param templateId - The template ID
     * @returns Template details
     *
     * @example
     * ```typescript
     * const template = await metigan.templates.get('template-id');
     * console.log(template.name, template.subject);
     * ```
     */
    get(templateId: string): Promise<EmailTemplate>;
    /**
     * Check if a template exists
     * @param templateId - The template ID to check
     * @returns True if template exists
     *
     * @example
     * ```typescript
     * const exists = await metigan.templates.exists('template-id');
     * if (exists) {
     *   // Template is valid, can use it for sending
     * }
     * ```
     */
    exists(templateId: string): Promise<boolean>;
}

/**
 * Metigan Suppressions Module
 * Read and manage the account's suppression list: the addresses Metigan
 * does not send to (bounces, spam complaints, unsubscribes and the ones you
 * block). The list applies to every send; keep it in sync with your CRM.
 * @version 2.5.0
 */

/** Why an address is suppressed. */
type SuppressionReason = 'hard_bounce' | 'soft_bounce' | 'complaint' | 'unsubscribe' | 'manual' | 'invalid_format';
/**
 * What its owner may do with a suppression:
 * - `allowed`: remove freely (bounces, manual, invalid);
 * - `consent_required`: an unsubscribe, removed only with `consent: true`;
 * - `support_only`: a spam complaint, removed only by Metigan support.
 */
type SuppressionPolicy = 'allowed' | 'consent_required' | 'support_only';
interface Suppression {
    email: string;
    reason: SuppressionReason;
    /** Where it came from: bounce_handler, complaint_handler, unsubscribe_link, api, dashboard… */
    source: string;
    createdAt: string;
    updatedAt: string;
    /** Temporary suppressions (soft bounces) end here. */
    expiresAt?: string;
    /** DSN status of the bounce, e.g. "5.1.1". */
    bounceCode?: string;
    /** The receiving server's response. */
    diagnostic?: string;
    messageId?: string;
    /** The email that caused it, while its tracking is kept. */
    message?: {
        messageId: string;
        emailId: string;
        subject: string;
        sentAt: string;
    };
    policy: SuppressionPolicy;
}
interface SuppressionListOptions {
    page?: number;
    /** 1–200 (default 50). */
    limit?: number;
    reason?: SuppressionReason;
    source?: string;
    /** Substring of the address; "@company.com" matches a whole domain. */
    search?: string;
    /** Date suppressed, from (inclusive), YYYY-MM-DD or ISO 8601. */
    from?: string | Date;
    /** Date suppressed, to (inclusive day), YYYY-MM-DD or ISO 8601. */
    to?: string | Date;
    sort?: 'newest' | 'oldest' | 'email';
}
interface SuppressionListResponse {
    success: boolean;
    data: Suppression[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
    summary: {
        total: number;
        byReason: Record<SuppressionReason, number>;
    };
}
interface SuppressionHistoryEntry {
    id: string;
    email: string;
    action: 'added' | 'removed';
    reason: SuppressionReason;
    source?: string;
    actor: string;
    consent?: boolean;
    note?: string;
    at: string;
}
interface SuppressionDetail {
    email: string;
    suppressed: boolean;
    suppression?: Suppression;
    history: SuppressionHistoryEntry[];
}
interface AddSuppressionsOptions {
    /** `manual` (never send, default) or `unsubscribe` (blocks campaigns, keeps transactional email). */
    reason?: 'manual' | 'unsubscribe';
    /** Kept in the suppression history (≤ 500 characters). */
    note?: string;
}
interface AddSuppressionsResult {
    added: string[];
    /** Addresses already suppressed, with the reason they keep. */
    alreadySuppressed: Record<string, SuppressionReason>;
    invalid: string[];
}
interface RemoveSuppressionOptions {
    /** Required to remove an unsubscribe: the recipient opted in again. */
    consent?: boolean;
    note?: string;
}
interface RemoveSuppressionsResult {
    removed: string[];
    notFound: string[];
    supportOnly: string[];
    consentRequired: string[];
    invalid: string[];
}
/**
 * MetiganSuppressions - Manage the suppression list
 */
declare class MetiganSuppressions {
    private http;
    constructor(options: TemplateModuleOptions);
    private request;
    /**
     * List suppressed addresses.
     *
     * @example
     * ```typescript
     * const { data, summary } = await metigan.suppressions.list({ reason: 'hard_bounce', search: '@acme.com' });
     * ```
     */
    list(options?: SuppressionListOptions): Promise<SuppressionListResponse>;
    /**
     * Look an address up: whether it is suppressed, why, and the changes made to it.
     */
    get(email: string): Promise<SuppressionDetail>;
    /**
     * Whether Metigan would refuse to send to `email`.
     *
     * @example
     * ```typescript
     * if (await metigan.suppressions.isSuppressed('ana@example.com')) { … }
     * ```
     */
    isSuppressed(email: string): Promise<boolean>;
    /**
     * Suppress addresses (any number: sent in batches of 1000). Addresses
     * already suppressed keep their reason.
     *
     * @example
     * ```typescript
     * // Opt-outs recorded in your CRM:
     * await metigan.suppressions.add(['ana@example.com'], { reason: 'unsubscribe' });
     * ```
     */
    add(emails: string | string[], options?: AddSuppressionsOptions): Promise<AddSuppressionsResult>;
    /**
     * Remove one address from the list. Throws an ApiError with status 409
     * (`consent_required`) for an unsubscribe without `consent: true`, 403
     * (`support_only`) for a spam complaint and 404 when not suppressed.
     */
    remove(email: string, options?: RemoveSuppressionOptions): Promise<Suppression>;
    /**
     * Remove several addresses; each follows its removal policy and the
     * result says what happened to every one (never throws for policy).
     */
    removeMany(emails: string[], options?: RemoveSuppressionOptions): Promise<RemoveSuppressionsResult>;
}
/** True when `err` is the API refusing to remove a suppression for policy. */
declare function isSuppressionPolicyError(err: unknown): err is ApiError;

/**
 * Webhook signature verification.
 *
 * Metigan signs every webhook delivery so you can prove it came from us and
 * was not tampered with. This module verifies that signature and returns the
 * typed event — with **zero runtime dependencies**, using the Web Crypto API
 * so it runs identically in Node.js (18+), edge runtimes and the browser.
 *
 * The signature scheme (sent on every delivery):
 *
 *   X-Webhook-Signature: t=<unix-seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<rawBody>")>
 *   X-Webhook-Id:        <delivery id>
 *   X-Webhook-Timestamp: <unix-seconds>
 *
 * The HMAC key is the signing secret **verbatim** (the literal `whsec_…`
 * string), and the signed message is the exact bytes of the request body with
 * the timestamp and a dot prepended. Always verify against the **raw** body:
 * re-serialising the parsed JSON can change bytes (key order, spacing) and
 * break the signature.
 *
 * @example
 * ```ts
 * import { verifyWebhook, WebhookSignatureError } from 'metigan';
 *
 * // Express — note express.raw() so req.body is the raw Buffer
 * app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
 *   try {
 *     const event = await verifyWebhook(req.body, {
 *       headers: req.headers,
 *       secret: process.env.METIGAN_WEBHOOK_SECRET!,
 *     });
 *     if (event.event === 'email.bounced') {
 *       console.log('bounced:', event.data.recipient);
 *     }
 *     res.sendStatus(204);
 *   } catch (err) {
 *     if (err instanceof WebhookSignatureError) return res.sendStatus(400);
 *     throw err;
 *   }
 * });
 * ```
 */
/** Metadata attached to email engagement events; keys depend on the event. */
interface EmailEventMetadata {
    ip?: string;
    userAgent?: string;
    device?: string;
    /** Clicked URL (`email.clicked`). */
    url?: string;
    /** Bounce detail (`email.bounced`). */
    bounceReason?: string;
    /** Delivery-status fields (`email.delivered`). */
    dsn?: string;
    queueId?: string;
    statusDetail?: string;
    [key: string]: unknown;
}
/** `data` for `email.sent`. */
interface EmailSentData {
    to: string;
    from: string;
    subject: string;
    emailId: string;
    messageId: string;
    trackingId: string;
    hasAttachments: boolean;
    attachmentsCount: number;
    timestamp: string;
}
/** `data` for `email.delivered`, `.opened`, `.clicked`, `.bounced`, `.complained`. */
interface EmailDeliveryData {
    recipient: string;
    subject: string;
    /** Mirrors the event name without the `email.` prefix (e.g. `"opened"`). */
    status: string;
    timestamp: string;
    metadata: EmailEventMetadata;
}
/** `data` for `email.unsubscribed`. */
interface EmailUnsubscribedData {
    email: string;
    timestamp: string;
}
/** `data` for `email.failed`. */
interface EmailFailedData {
    to: string;
    emailId: string;
    reason: string;
}
/** `data` for `contact.created`. */
interface ContactCreatedData {
    contactId: string;
    email: string;
    audienceId: string;
    userId: string;
}
/**
 * `data` for dashboard-reported events (`audience.*`, `contact.deleted`).
 * These carry the object the dashboard acted on, so the shape is best-effort
 * (only `userId` is guaranteed to be the account that owns the webhook).
 */
interface DashboardObjectData {
    _id?: string;
    name?: string;
    userId?: string;
    [key: string]: unknown;
}
/** Maps each event name to the type of its `data` field. */
interface WebhookEventDataMap {
    'email.sent': EmailSentData;
    'email.delivered': EmailDeliveryData;
    'email.opened': EmailDeliveryData;
    'email.clicked': EmailDeliveryData;
    'email.bounced': EmailDeliveryData;
    'email.complained': EmailDeliveryData;
    'email.unsubscribed': EmailUnsubscribedData;
    'email.failed': EmailFailedData;
    'contact.created': ContactCreatedData;
    'contact.deleted': DashboardObjectData;
    'audience.created': DashboardObjectData;
    'audience.updated': DashboardObjectData;
    'audience.deleted': DashboardObjectData;
}
/** Every event name Metigan can deliver. */
type WebhookEventName = keyof WebhookEventDataMap;
/** The names as a runtime array (handy for subscribing to "all" events). */
declare const WEBHOOK_EVENT_NAMES: readonly WebhookEventName[];
/** A delivered webhook body, parsed. */
interface WebhookEvent<K extends WebhookEventName = WebhookEventName> {
    /** Event name, e.g. `"email.delivered"`. */
    event: K;
    /** The message/entity the event is about. */
    messageId: string;
    /** Event-specific payload (see {@link WebhookEventDataMap}). */
    data: WebhookEventDataMap[K];
    /** When Metigan emitted the event, in **milliseconds** since the epoch. */
    timestamp: number;
}
/** The discriminated union of all known events; narrow it on `event`. */
type AnyWebhookEvent = {
    [K in WebhookEventName]: WebhookEvent<K>;
}[WebhookEventName];
/**
 * Type guard that narrows a verified event to a specific name.
 *
 * @example
 * ```ts
 * if (isWebhookEvent(event, 'email.clicked')) {
 *   console.log(event.data.metadata.url); // fully typed
 * }
 * ```
 */
declare function isWebhookEvent<K extends WebhookEventName>(event: WebhookEvent, name: K): event is WebhookEvent<K>;
/** Anything a raw request body can arrive as. */
type RawBody = string | Uint8Array | ArrayBuffer | ArrayBufferView;
/** A `Headers`-like object: a `fetch` Headers, a Node `req.headers`, or a Map. */
type HeadersLike = {
    get(name: string): string | null | undefined;
} | Record<string, string | string[] | undefined> | Map<string, string>;
/** Options for {@link verifyWebhook}. */
interface VerifyWebhookOptions {
    /** The signing secret (`whsec_…`) shown once when the webhook was created. */
    secret?: string;
    /**
     * The headers of the incoming request. Lookups are case-insensitive, so a
     * raw Node `req.headers`, a `fetch` `Headers`, or a plain object all work.
     * Provide this, or pass {@link signature} directly.
     */
    headers?: HeadersLike;
    /** The `X-Webhook-Signature` value, if you are not passing {@link headers}. */
    signature?: string;
    /** The `X-Webhook-Timestamp` value; only needed if the signature omits `t=`. */
    timestamp?: string | number;
    /**
     * Reject events whose timestamp differs from now by more than this many
     * seconds (replay protection). Default `300` (5 minutes). Set `0` to skip
     * the timestamp check.
     */
    toleranceSeconds?: number;
    /** Override "now" (unix seconds), for testing. */
    nowSeconds?: number;
}
/**
 * Verify a webhook signature and return the typed event.
 *
 * Throws {@link WebhookSignatureError} for every failure mode (missing/invalid
 * signature, stale timestamp, mismatch, non-JSON body) — reject the request
 * when it throws and never read the payload.
 *
 * @param rawBody The **exact** request body bytes. Do not re-serialise.
 * @param options Secret, headers (or raw signature), and tolerance.
 * @returns The parsed, verified event.
 */
declare function verifyWebhook(rawBody: RawBody, options: VerifyWebhookOptions): Promise<AnyWebhookEvent>;
/** Options for a {@link MetiganWebhooks} instance. */
interface MetiganWebhooksOptions {
    /** Default signing secret, overridable per {@link MetiganWebhooks.verify}. */
    secret?: string;
    /** Default timestamp tolerance in seconds (default 300). */
    toleranceSeconds?: number;
}
/**
 * Webhook helpers, exposed as `metigan.webhooks` on the unified client.
 *
 * @example
 * ```ts
 * const metigan = new Metigan({ apiKey, webhookSecret: process.env.WH_SECRET });
 * const event = await metigan.webhooks.verify(rawBody, { headers });
 * ```
 */
declare class MetiganWebhooks {
    private readonly options;
    /** Every event name Metigan can deliver. */
    readonly events: readonly WebhookEventName[];
    constructor(options?: MetiganWebhooksOptions);
    /**
     * Verify a webhook signature and return the typed event. The secret and
     * tolerance fall back to the ones this client was created with.
     */
    verify(rawBody: RawBody, options?: Omit<VerifyWebhookOptions, 'secret'> & {
        secret?: string;
    }): Promise<AnyWebhookEvent>;
    /** Narrow a verified event to a specific name (re-export of {@link isWebhookEvent}). */
    is<K extends WebhookEventName>(event: WebhookEvent, name: K): event is WebhookEvent<K>;
}

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
declare const API_URL: string;
/**
 * SDK Version
 */
declare const SDK_VERSION = "2.6.0";
/**
 * Default timeout for API requests (in milliseconds)
 */
declare const DEFAULT_TIMEOUT = 30000;
/**
 * Default retry configuration
 */
declare const DEFAULT_RETRY_COUNT = 3;
declare const DEFAULT_RETRY_DELAY = 1000;
/**
 * Maximum file size for attachments (7MB)
 */
declare const MAX_FILE_SIZE: number;

/**
 * Metigan - Complete Marketing Automation Library
 * Email, Forms, Contacts, Audiences, and Templates management
 * @version 2.5.0
 */

/**
 * Unified Metigan Client
 * Provides access to all Metigan services
 */
declare class Metigan {
    /** Email module for sending emails */
    email: Metigan$1;
    /** Forms module for form management */
    forms: MetiganForms;
    /** Contacts module for contact management */
    contacts: MetiganContacts;
    /** Audiences module for audience management */
    audiences: MetiganAudiences;
    /** Templates module for managing email templates */
    templates: MetiganTemplates;
    /** Suppressions module: addresses Metigan does not send to */
    suppressions: MetiganSuppressions;
    /** Webhooks module for verifying incoming webhook signatures */
    webhooks: MetiganWebhooks;
    /**
     * Create a new Metigan client
     * @param options - Client options
     */
    constructor(options: MetiganClientOptions);
}

export { ALLOWED_MIME_TYPES, API_URL, type AddSuppressionsOptions, type AddSuppressionsResult, type AnyWebhookEvent, ApiError, type ApiKeyErrorResponse, type ApiResponse, type Audience, type AudienceListResponse, type AudienceStats, BLOCKED_MIME_TYPES, type BulkContactResult, type ButtonCustomization, type Contact, type ContactCreatedData, type ContactListFilters, type ContactListResponse, type ContactStatus, type CreateAudienceOptions, type CreateContactOptions, type CustomAttachment, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY, DEFAULT_TIMEOUT, type DashboardObjectData, DebugLogger, type DeliveryOptions, type EmailApiResponse, type EmailDeliveryData, type EmailErrorResponse, type EmailEventMetadata, type EmailFailedData, type EmailOptions, type EmailSentData, type EmailStatus, type EmailSuccessResponse, type EmailTemplate, type EmailTemplateListResponse, type EmailUnsubscribedData, type FormAnalytics, type FormAppearance, type FormConfig, type FormFieldConfig, type FormFieldType, type FormFieldValidation, type FormListResponse, type FormSettings, type FormSubmissionData, type FormSubmissionOptions, type FormSubmissionResponse, type HeadersLike, MAX_FILE_SIZE, Metigan, MetiganAudiences, type MetiganClientOptions, MetiganContacts, Metigan$1 as MetiganEmail, Metigan$1 as MetiganEmailClient, MetiganError, MetiganForms, MetiganSuppressions, MetiganTemplates, MetiganWebhooks, type MetiganWebhooksOptions, type NodeAttachment, type OtpSendOptions, type OtpSendResponse, type PaginationOptions, type ProcessedAttachment, type QuickSendResponse, RateLimiter, type RateLimiterConfig, type RawBody, type RemoveSuppressionOptions, type RemoveSuppressionsResult, SDK_VERSION, type Suppression, type SuppressionDetail, type SuppressionHistoryEntry, type SuppressionListOptions, type SuppressionListResponse, type SuppressionPolicy, type SuppressionReason, type TemplateComponent, type TemplateComponentStyle, type TemplateFunction, type TemplateModuleOptions, type TemplateStyles, type TemplateVariables, type TransactionalSendOptions, type TransactionalSendResponse, type UpdateAudienceOptions, type UpdateContactOptions, ValidationError, type ValidationResult, type VerifyWebhookOptions, WEBHOOK_EVENT_NAMES, type WebhookEvent, type WebhookEventDataMap, type WebhookEventName, WebhookSignatureError, Metigan as default, isAllowedMimeType, isSafeFileExtension, isSuppressionPolicyError, isWebhookEvent, sanitizeEmail, sanitizeHtml, sanitizeSubject, verifyWebhook };
