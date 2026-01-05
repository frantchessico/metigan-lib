/**
 * Metigan - Complete Marketing Automation Library
 * Email, Forms, Contacts, and Audiences management
 * @version 2.0.0
 */
export { default as MetiganEmail, Metigan as MetiganEmailClient } from './lib/metigan';
export { MetiganForms } from './lib/forms';
export { MetiganContacts } from './lib/contacts';
export { MetiganAudiences } from './lib/audiences';
export { MetiganError, ValidationError, ApiError } from './lib/errors';
export { API_URL, SDK_VERSION, DEFAULT_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY, MAX_FILE_SIZE } from './lib/config';
export { sanitizeHtml, sanitizeEmail, sanitizeSubject, isAllowedMimeType, isSafeFileExtension, RateLimiter, DebugLogger, ALLOWED_MIME_TYPES, BLOCKED_MIME_TYPES } from './lib/security';
export type { RateLimiterConfig } from './lib/security';
export type { EmailOptions, EmailSuccessResponse, EmailErrorResponse, ApiKeyErrorResponse, EmailApiResponse, NodeAttachment, CustomAttachment, ProcessedAttachment, TemplateVariables, TemplateFunction, ValidationResult, FormFieldType, FormFieldValidation, FormFieldConfig, ButtonCustomization, FormAppearance, FormSettings, FormAnalytics, FormConfig, FormSubmissionData, FormSubmissionOptions, FormSubmissionResponse, FormListResponse, ContactStatus, Contact, CreateContactOptions, UpdateContactOptions, ContactListFilters, ContactListResponse, BulkContactResult, Audience, CreateAudienceOptions, UpdateAudienceOptions, AudienceListResponse, AudienceStats, PaginationOptions, ApiResponse, MetiganClientOptions } from './lib/types';
import { Metigan as MetiganEmailClientInternal } from './lib/metigan';
import { MetiganForms } from './lib/forms';
import { MetiganContacts } from './lib/contacts';
import { MetiganAudiences } from './lib/audiences';
import type { MetiganClientOptions } from './lib/types';
/**
 * Unified Metigan Client
 * Provides access to all Metigan services
 */
export declare class Metigan {
    /** Email module for sending emails */
    email: MetiganEmailClientInternal;
    /** Forms module for form management */
    forms: MetiganForms;
    /** Contacts module for contact management */
    contacts: MetiganContacts;
    /** Audiences module for audience management */
    audiences: MetiganAudiences;
    /**
     * Create a new Metigan client
     * @param options - Client options
     */
    constructor(options: MetiganClientOptions);
}
export default Metigan;
