/**
 * Type definitions for Metigan library
 * @version 2.0.0
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
  /** Email content (HTML supported) */
  content: string;
  /** Optional file attachments */
  attachments?: Array<File | NodeAttachment | CustomAttachment>;
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
  successfulEmails: {
    success: true;
    recipient: string;
    messageId: string;
    trackingId?: string;
  }[];
  failedEmails: {
    success: false;
    recipient: string;
    error: string;
  }[];
  recipientCount: number;
  hasAttachments: boolean;
  attachmentsCount: number;
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
export type ContactStatus = 'subscribed' | 'unsubscribed' | 'pending' | 'bounced' | 'complained';

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
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}
