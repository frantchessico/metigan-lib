/**
 * Metigan Templates Module
 * Manage email templates created in the Metigan dashboard
 * @version 2.2.0
 */

import * as http from '../utils/http';
import { API_URL, DEFAULT_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY } from './config';
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
  private apiKey: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  constructor(options: TemplateModuleOptions) {
    if (!options.apiKey) {
      throw new MetiganError('API key is required');
    }

    this.apiKey = options.apiKey;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.retryCount = options.retryCount || DEFAULT_RETRY_COUNT;
    this.retryDelay = options.retryDelay || DEFAULT_RETRY_DELAY;
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'User-Agent': 'SDK'
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    data?: any
  ): Promise<T> {
    let lastError;
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        switch (method) {
          case 'GET':
            return await http.get<T>(url, this.getHeaders());
          case 'POST':
            return await http.post<T>(url, data, this.getHeaders());
          case 'PATCH':
            return await http.patch<T>(url, data, this.getHeaders());
          case 'DELETE':
            return await http.del<T>(url, this.getHeaders());
        }
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw new MetiganError(error.data?.error || error.message || 'Request failed');
        }
        
        // Wait before retrying
        if (attempt < this.retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError;
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
    const url = `${API_URL}/api/templates${queryString ? `?${queryString}` : ''}`;
    
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
    
    const url = `${API_URL}/api/templates/${templateId}`;
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

