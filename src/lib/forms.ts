/**
 * Metigan Forms Module
 * Handles form submissions and form data retrieval
 * @version 2.4.0
 */

import { HttpClient, type HttpMethod } from '../core/client';
import { ValidationError } from './errors';
import type {
  FormConfig,
  FormSubmissionOptions,
  FormSubmissionResponse,
  FormListResponse,
  FormAnalytics,
  PaginationOptions
} from './types';

/**
 * Forms module options
 */
export interface FormsModuleOptions {
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
export class MetiganForms {
  private http: HttpClient;

  /**
   * Create a new MetiganForms instance
   * @param options - Forms module options
   */
  constructor(options: FormsModuleOptions) {
    this.http = new HttpClient(options);
  }

  private makeRequest<T>(method: HttpMethod, endpoint: string, data?: unknown): Promise<T> {
    return this.http.request<T>(method, endpoint, { body: data });
  }

  /**
   * Submit data to a form
   * @param options - Submission options
   * @returns Submission response
   */
  async submit(options: FormSubmissionOptions): Promise<FormSubmissionResponse> {
    // Validate required fields
    if (!options.formId) {
      throw new ValidationError('Form ID is required');
    }

    if (!options.data || Object.keys(options.data).length === 0) {
      throw new ValidationError('Submission data is required');
    }

    const response = await this.makeRequest<FormSubmissionResponse>(
      'POST',
      '/api/submissions',
      {
        formId: options.formId,
        data: options.data
      }
    );

    return response;
  }

  /**
   * Get form by ID or slug
   * @param formIdOrSlug - Form ID or slug
   * @returns Form configuration
   */
  async getForm(formIdOrSlug: string): Promise<FormConfig> {
    if (!formIdOrSlug) {
      throw new ValidationError('Form ID or slug is required');
    }

    const response = await this.makeRequest<FormConfig>(
      'GET',
      `/api/forms/${formIdOrSlug}`
    );

    return response;
  }

  /**
   * Get form by slug (public)
   * @param slug - Form slug
   * @returns Form configuration for public display
   */
  async getPublicForm(slug: string): Promise<FormConfig> {
    if (!slug) {
      throw new ValidationError('Form slug is required');
    }

    const response = await this.makeRequest<FormConfig>(
      'GET',
      `/f/${slug}/api`
    );

    return response;
  }

  /**
   * List all forms
   * @param options - Pagination options
   * @returns List of forms
   */
  async listForms(options?: PaginationOptions): Promise<FormListResponse> {
    const params = new URLSearchParams();
    
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/forms?${queryString}` : '/api/forms';

    const response = await this.makeRequest<FormListResponse>('GET', endpoint);
    return response;
  }

  /**
   * Get form analytics
   * @param formId - Form ID
   * @returns Form analytics data
   */
  async getAnalytics(formId: string): Promise<FormAnalytics> {
    if (!formId) {
      throw new ValidationError('Form ID is required');
    }

    const response = await this.makeRequest<FormAnalytics>(
      'GET',
      `/api/forms/${formId}/analytics`
    );

    return response;
  }

  /**
   * Create a new form
   * @param config - Form configuration
   * @returns Created form
   */
  async createForm(config: Omit<FormConfig, 'id'>): Promise<FormConfig> {
    if (!config.title) {
      throw new ValidationError('Form title is required');
    }

    if (!config.fields || config.fields.length === 0) {
      throw new ValidationError('At least one field is required');
    }

    const response = await this.makeRequest<FormConfig>('POST', '/api/forms', config);
    return response;
  }

  /**
   * Update an existing form
   * @param formId - Form ID
   * @param config - Updated form configuration
   * @returns Updated form
   */
  async updateForm(formId: string, config: Partial<FormConfig>): Promise<FormConfig> {
    if (!formId) {
      throw new ValidationError('Form ID is required');
    }

    const response = await this.makeRequest<FormConfig>(
      'PUT',
      `/api/forms/${formId}`,
      config
    );

    return response;
  }

  /**
   * Delete a form
   * @param formId - Form ID
   * @returns Success status
   */
  async deleteForm(formId: string): Promise<{ success: boolean }> {
    if (!formId) {
      throw new ValidationError('Form ID is required');
    }

    const response = await this.makeRequest<{ success: boolean }>(
      'DELETE',
      `/api/forms/${formId}`
    );

    return response;
  }

  /**
   * Publish a form
   * @param formId - Form ID
   * @param slug - Optional custom slug
   * @returns Published form URL
   */
  async publishForm(formId: string, slug?: string): Promise<{ publishedUrl: string; slug: string }> {
    if (!formId) {
      throw new ValidationError('Form ID is required');
    }

    const response = await this.makeRequest<{ publishedUrl: string; slug: string }>(
      'POST',
      `/api/forms/${formId}/publish`,
      { slug }
    );

    return response;
  }

  /**
   * Unpublish a form
   * @param formId - Form ID
   * @returns Success status
   */
  async unpublishForm(formId: string): Promise<{ success: boolean }> {
    if (!formId) {
      throw new ValidationError('Form ID is required');
    }

    const response = await this.makeRequest<{ success: boolean }>(
      'DELETE',
      `/api/forms/${formId}/publish`
    );

    return response;
  }

  /**
   * Get form submissions
   * @param formId - Form ID
   * @param options - Pagination options
   * @returns List of submissions
   */
  async getSubmissions(
    formId: string, 
    options?: PaginationOptions
  ): Promise<{ submissions: any[]; pagination: any }> {
    if (!formId) {
      throw new ValidationError('Form ID is required');
    }

    const params = new URLSearchParams();
    params.append('formId', formId);
    
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const response = await this.makeRequest<{ submissions: any[]; pagination: any }>(
      'GET',
      `/api/submissions?${params.toString()}`
    );

    return response;
  }
}

export default MetiganForms;

