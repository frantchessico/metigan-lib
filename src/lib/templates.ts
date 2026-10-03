/**
 * Metigan Templates Module
 * Manage email templates created in the Metigan dashboard
 * @version 2.4.0
 */

import { HttpClient, type HttpMethod } from '../core/client';
import { MetiganError } from './errors';
import type {
  EmailTemplate, 
  EmailTemplateListResponse, 
  PaginationOptions,
  TemplateModuleOptions 
} from './types';

/**
 * MetiganTemplates - Manage email templates
 */
export class MetiganTemplates {
  private http: HttpClient;

  constructor(options: TemplateModuleOptions) {
    this.http = new HttpClient(options);
  }

  private makeRequest<T>(method: HttpMethod, endpoint: string, data?: unknown): Promise<T> {
    return this.http.request<T>(method, endpoint, { body: data });
  }

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
  async list(options: PaginationOptions = {}): Promise<EmailTemplateListResponse> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    
    const queryString = params.toString();
    const url = `/api/templates${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<EmailTemplateListResponse>('GET', url);
  }

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
  async get(templateId: string): Promise<EmailTemplate> {
    if (!templateId) {
      throw new MetiganError('Template ID is required');
    }
    
    const url = `/api/templates/${templateId}`;
    return this.makeRequest<EmailTemplate>('GET', url);
  }

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
  async exists(templateId: string): Promise<boolean> {
    try {
      await this.get(templateId);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default MetiganTemplates;

