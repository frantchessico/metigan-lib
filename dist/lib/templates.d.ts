/**
 * Metigan Templates Module
 * Manage email templates created in the Metigan dashboard
 * @version 2.2.0
 */
import type { EmailTemplate, EmailTemplateListResponse, PaginationOptions, TemplateModuleOptions } from './types';
/**
 * MetiganTemplates - Manage email templates
 */
export declare class MetiganTemplates {
    private apiKey;
    private timeout;
    private retryCount;
    private retryDelay;
    constructor(options: TemplateModuleOptions);
    /**
     * Get default headers for API requests
     */
    private getHeaders;
    /**
     * Make HTTP request with retry logic
     */
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
export default MetiganTemplates;
