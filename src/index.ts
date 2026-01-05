/**
 * Metigan - Complete Marketing Automation Library
 * Email, Forms, Contacts, and Audiences management
 * @version 2.0.0
 */

// Export main email class
export { default as MetiganEmail, Metigan as MetiganEmailClient } from './lib/metigan';

// Export modules
export { MetiganForms } from './lib/forms';
export { MetiganContacts } from './lib/contacts';
export { MetiganAudiences } from './lib/audiences';

// Export errors
export { MetiganError, ValidationError, ApiError } from './lib/errors';

// Export configuration constants
export { API_URL, SDK_VERSION, DEFAULT_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY, MAX_FILE_SIZE } from './lib/config';

// Export security utilities
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
} from './lib/security';
export type { RateLimiterConfig } from './lib/security';

// Export all types
export type {
  // Email types
  EmailOptions,
  EmailSuccessResponse,
  EmailErrorResponse,
  ApiKeyErrorResponse,
  EmailApiResponse,
  NodeAttachment,
  CustomAttachment,
  ProcessedAttachment,
  TemplateVariables,
  TemplateFunction,
  ValidationResult,
  
  // Form types
  FormFieldType,
  FormFieldValidation,
  FormFieldConfig,
  ButtonCustomization,
  FormAppearance,
  FormSettings,
  FormAnalytics,
  FormConfig,
  FormSubmissionData,
  FormSubmissionOptions,
  FormSubmissionResponse,
  FormListResponse,
  
  // Contact types
  ContactStatus,
  Contact,
  CreateContactOptions,
  UpdateContactOptions,
  ContactListFilters,
  ContactListResponse,
  BulkContactResult,
  
  // Audience types
  Audience,
  CreateAudienceOptions,
  UpdateAudienceOptions,
  AudienceListResponse,
  AudienceStats,
  
  // Common types
  PaginationOptions,
  ApiResponse,
  MetiganClientOptions
} from './lib/types';

// Import modules for unified client
import { Metigan as MetiganEmailClientInternal } from './lib/metigan';
import { MetiganForms } from './lib/forms';
import { MetiganContacts } from './lib/contacts';
import { MetiganAudiences } from './lib/audiences';
import { MetiganError } from './lib/errors';
import type { MetiganClientOptions } from './lib/types';

/**
 * Unified Metigan Client
 * Provides access to all Metigan services
 */
export class Metigan {
  /** Email module for sending emails */
  public email: MetiganEmailClientInternal;
  
  /** Forms module for form management */
  public forms: MetiganForms;
  
  /** Contacts module for contact management */
  public contacts: MetiganContacts;
  
  /** Audiences module for audience management */
  public audiences: MetiganAudiences;

  /**
   * Create a new Metigan client
   * @param options - Client options
   */
  constructor(options: MetiganClientOptions) {
    if (!options.apiKey) {
      throw new MetiganError('API key is required');
    }

    // Initialize all modules with security options
    this.email = new MetiganEmailClientInternal(options.apiKey, {
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

    this.forms = new MetiganForms({
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });

    this.contacts = new MetiganContacts({
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });

    this.audiences = new MetiganAudiences({
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });
  }
}

// Default export
export default Metigan;
