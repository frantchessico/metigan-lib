/**
 * Metigan Forms Module
 * Handles form submissions and form data retrieval
 * @version 2.0.0
 */

import * as http from '../utils/http';
import { MetiganError, ApiError, ValidationError } from './errors';
import { API_URL, DEFAULT_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY } from './config';
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
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * MetiganForms class for form operations
 */
export class MetiganForms {
  private apiKey: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  /**
   * Create a new MetiganForms instance
   * @param options - Forms module options
   */
  constructor(options: FormsModuleOptions) {
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
      'User-Agent': 'MetiganSDK/2.0'
    };
  }

  /**
   * Make request with retry logic
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers = this.getHeaders();
    let lastError: any;

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        switch (method) {
          case 'GET':
            return await http.get<T>(url, headers, { timeout: this.timeout });
          case 'POST':
            return await http.post<T>(url, data, headers, { timeout: this.timeout });
          case 'PUT':
            return await http.put<T>(url, data, headers, { timeout: this.timeout });
          case 'DELETE':
            return await http.del<T>(url, headers, { timeout: this.timeout });
        }
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          throw new ApiError(
            error.data?.message || error.data?.error || `Request failed with status ${error.status}`,
            error.status
          );
        }

        // Wait before retrying
        if (attempt < this.retryCount - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new ApiError(
      lastError?.data?.message || 'Request failed after multiple attempts',
      lastError?.status
    );
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

