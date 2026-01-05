/**
 * Metigan Forms Module
 * Handles form submissions and form data retrieval
 * @version 2.0.0
 */
import type { FormConfig, FormSubmissionOptions, FormSubmissionResponse, FormListResponse, FormAnalytics, PaginationOptions } from './types';
/**
 * Forms module options
 */
export interface FormsModuleOptions {
    apiKey: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}
/**
 * MetiganForms class for form operations
 */
export declare class MetiganForms {
    private apiKey;
    private timeout;
    private retryCount;
    private retryDelay;
    /**
     * Create a new MetiganForms instance
     * @param options - Forms module options
     */
    constructor(options: FormsModuleOptions);
    /**
     * Get default headers for API requests
     */
    private getHeaders;
    /**
     * Make request with retry logic
     */
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
export default MetiganForms;
