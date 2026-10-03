/**
 * Type definitions for Metigan library
 * @version 2.4.0
 */
/**
 * Interface for email attachment in Node.js environment
 */
interface NodeAttachment$1 {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}
/**
 * Interface for email attachment in any environment
 */
interface CustomAttachment$1 {
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
 * Email options interface
 */
interface EmailOptions$1 {
    /** Sender email address (or Name <email>) */
    from: string;
    /** List of recipient email addresses */
    recipients: string[];
    /** Email subject */
    subject: string;
    /** Email content (HTML supported) */
    content: string;
    /** Optional file attachments */
    attachments?: Array<File | NodeAttachment$1 | CustomAttachment$1>;
    /** Optional CC recipients */
    cc?: string[];
    /** Optional BCC recipients */
    bcc?: string[];
    /** Optional reply-to address */
    replyTo?: string;
    /** Optional tracking ID for email analytics */
    trackingId?: string;
}
/**
 * OTP send options
 */
interface OtpSendOptions {
    /** Recipient email */
    to?: string;
    /** Recipient email (alias) */
    email?: string;
    /** Sender email address */
    from: string;
    /** OTP code */
    code: string;
    /** Optional app name */
    appName?: string;
    /** Optional expiration in minutes */
    expiresInMinutes?: number;
    /** Optional subject */
    subject?: string;
    /** Optional idempotency key */
    idempotencyKey?: string;
}
/**
 * Transactional send options
 */
interface TransactionalSendOptions {
    /** Recipient email */
    to?: string;
    /** Recipient email (alias) */
    email?: string;
    /** Sender email address */
    from: string;
    /** Subject */
    subject: string;
    /** HTML content */
    content?: string;
    /** HTML content (alias) */
    html?: string;
    /** Optional idempotency key */
    idempotencyKey?: string;
}
/**
 * OTP send response
 */
interface OtpSendResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}
/**
 * Transactional send response
 */
interface TransactionalSendResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
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
interface EmailSuccessResponse$1 {
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
interface EmailErrorResponse$1 {
    error: string;
    message: string;
}
/**
 * API key error response
 */
interface ApiKeyErrorResponse$1 {
    error: string;
}
/**
 * Union type for all possible API responses
 */
type EmailApiResponse$1 = EmailSuccessResponse$1 | EmailErrorResponse$1 | ApiKeyErrorResponse$1;
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
 * Email options interface
 */
interface EmailOptions {
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
interface EmailSuccessResponse {
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
    sendEmail(options: EmailOptions): Promise<EmailApiResponse>; /**
     * Generates a unique tracking ID for email analytics
     * @returns A unique tracking ID string
     * @private
     */
    /**
     * Send OTP email (fast lane)
     * @param options - OTP send options
     */
    sendOtp(options: OtpSendOptions): Promise<OtpSendResponse>;
    /**
     * Send transactional email (fast lane)
     * @param options - Transactional send options
     */
    sendTransactional(options: TransactionalSendOptions): Promise<TransactionalSendResponse>;
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
declare const SDK_VERSION = "2.4.0";
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
 * @version 2.4.0
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
    /**
     * Create a new Metigan client
     * @param options - Client options
     */
    constructor(options: MetiganClientOptions);
}

// @ts-ignore
export = Metigan;
export { ALLOWED_MIME_TYPES, API_URL, ApiError, type ApiKeyErrorResponse$1 as ApiKeyErrorResponse, type ApiResponse, type Audience, type AudienceListResponse, type AudienceStats, BLOCKED_MIME_TYPES, type BulkContactResult, type ButtonCustomization, type Contact, type ContactListFilters, type ContactListResponse, type ContactStatus, type CreateAudienceOptions, type CreateContactOptions, type CustomAttachment$1 as CustomAttachment, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY, DEFAULT_TIMEOUT, DebugLogger, type EmailApiResponse$1 as EmailApiResponse, type EmailErrorResponse$1 as EmailErrorResponse, type EmailOptions$1 as EmailOptions, type EmailSuccessResponse$1 as EmailSuccessResponse, type EmailTemplate, type EmailTemplateListResponse, type FormAnalytics, type FormAppearance, type FormConfig, type FormFieldConfig, type FormFieldType, type FormFieldValidation, type FormListResponse, type FormSettings, type FormSubmissionData, type FormSubmissionOptions, type FormSubmissionResponse, MAX_FILE_SIZE, Metigan, MetiganAudiences, type MetiganClientOptions, MetiganContacts, Metigan$1 as MetiganEmail, Metigan$1 as MetiganEmailClient, MetiganError, MetiganForms, MetiganTemplates, type NodeAttachment$1 as NodeAttachment, type OtpSendOptions, type OtpSendResponse, type PaginationOptions, type ProcessedAttachment, RateLimiter, type RateLimiterConfig, SDK_VERSION, type TemplateComponent, type TemplateComponentStyle, type TemplateFunction, type TemplateModuleOptions, type TemplateStyles, type TemplateVariables, type TransactionalSendOptions, type TransactionalSendResponse, type UpdateAudienceOptions, type UpdateContactOptions, ValidationError, type ValidationResult, isAllowedMimeType, isSafeFileExtension, sanitizeEmail, sanitizeHtml, sanitizeSubject };
