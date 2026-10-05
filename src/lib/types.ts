/**
 * Type definitions for Metigan library
 * @version 2.4.0
 */

// ============================================
// EMAIL TYPES
// ============================================

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
export interface ProcessedAttachment {
  filename: string;
  content: any;
  contentType: string;
  encoding: string;
  disposition: string;
}

/** Delivery options shared by every send method. */
export interface DeliveryOptions {
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
export interface EmailOptions extends DeliveryOptions {
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
export interface OtpSendOptions extends DeliveryOptions {
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
export interface TransactionalSendOptions extends DeliveryOptions {
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
export interface QuickSendResponse {
  success: boolean;
  queued: boolean;
  status: 'queued';
  /** Id of the email: pass it to getEmailStatus. */
  emailId: string;
  trackingId: string;
}

/** OTP send response */
export type OtpSendResponse = QuickSendResponse;

/** Transactional send response */
export type TransactionalSendResponse = QuickSendResponse;

/** Where an email is now (getEmailStatus). */
export interface EmailStatus {
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
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * API response interface for successful email
 */
export interface EmailSuccessResponse {
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

// ============================================
// FORM TYPES
// ============================================

/**
 * Form field types
 */
export type FormFieldType = 
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'phone'
  | 'url'
  | 'file'
  | 'step'
  | 'password'
  | 'rating'
  | 'slider'
  | 'heading'
  | 'image-choice'
  | 'matrix';

/**
 * Form field validation rules
 */
export interface FormFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  step?: number;
  options?: string[]; // For matrix columns
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
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
export interface ButtonCustomization {
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
export interface FormAppearance {
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
export interface FormSettings {
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
export interface FormAnalytics {
  views: number;
  submissions: number;
  uniqueVisitors?: number;
  averageCompletionTime?: number;
  conversionRate?: number;
}

/**
 * Complete form configuration
 */
export interface FormConfig {
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
export interface FormSubmissionData {
  [fieldId: string]: any;
}

/**
 * Form submission options
 */
export interface FormSubmissionOptions {
  /** Form ID or slug */
  formId: string;
  /** Submission data */
  data: FormSubmissionData;
}

/**
 * Form submission response
 */
export interface FormSubmissionResponse {
  success: boolean;
  message: string;
  submissionId?: string;
}

/**
 * Form list response
 */
export interface FormListResponse {
  forms: FormConfig[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ============================================
// CONTACT TYPES
// ============================================

/**
 * Contact status
 */
export type ContactStatus = 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';

/**
 * Contact data
 */
export interface Contact {
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
export interface CreateContactOptions {
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
export interface UpdateContactOptions {
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
export interface ContactListFilters {
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
export interface ContactListResponse {
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
export interface BulkContactResult {
  success: boolean;
  imported: number;
  failed: number;
  errors?: { email: string; error: string }[];
}

// ============================================
// AUDIENCE TYPES
// ============================================

/**
 * Audience data
 */
export interface Audience {
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
export interface CreateAudienceOptions {
  name: string;
  description?: string;
}

/**
 * Audience update options
 */
export interface UpdateAudienceOptions {
  name?: string;
  description?: string;
}

/**
 * Audience list response
 */
export interface AudienceListResponse {
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
export interface AudienceStats {
  total: number;
  subscribed: number;
  unsubscribed: number;
  pending: number;
  bounced: number;
  complained: number;
  growthRate?: number;
}

// ============================================
// COMMON TYPES
// ============================================

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Client options for Metigan
 */
export interface MetiganClientOptions {
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

// ============================================
// TEMPLATE TYPES
// ============================================

/**
 * Email template component style
 */
export interface TemplateComponentStyle {
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
export interface TemplateComponent {
  id: string;
  type: string;
  label?: string;
  content?: string;
  url?: string;
  title?: string;
  styles?: TemplateComponentStyle;
  [key: string]: any; // Allow additional properties
}

/**
 * Email template styles
 */
export interface TemplateStyles {
  backgroundColor?: string;
  width?: number;
  padding?: number;
}

/**
 * Email template data
 */
export interface EmailTemplate {
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
export interface EmailTemplateListResponse {
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
export interface TemplateModuleOptions {
  apiKey: string;
  /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
  baseUrl?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}
