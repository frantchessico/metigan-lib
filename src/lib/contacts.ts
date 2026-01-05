/**
 * Metigan Contacts Module
 * Handles contact/subscriber management
 * @version 2.0.0
 */

import * as http from '../utils/http';
import { MetiganError, ApiError, ValidationError } from './errors';
import { API_URL, DEFAULT_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY } from './config';
import type {
  Contact,
  CreateContactOptions,
  UpdateContactOptions,
  ContactListFilters,
  ContactListResponse,
  BulkContactResult
} from './types';

/**
 * Contacts module options
 */
export interface ContactsModuleOptions {
  apiKey: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * MetiganContacts class for contact operations
 */
export class MetiganContacts {
  private apiKey: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  /**
   * Create a new MetiganContacts instance
   * @param options - Contacts module options
   */
  constructor(options: ContactsModuleOptions) {
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
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    if (parts[0].length === 0) return false;
    const domainParts = parts[1].split('.');
    if (domainParts.length < 2) return false;
    if (domainParts.some(part => part.length === 0)) return false;
    return true;
  }

  /**
   * Make request with retry logic
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers = this.getHeaders();
    let lastError: any;

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        switch (method) {
          case 'GET':
            return await http.get<T>(url, headers, { timeout: this.timeout, params });
          case 'POST':
            return await http.post<T>(url, data, headers, { timeout: this.timeout });
          case 'PUT':
            return await http.put<T>(url, data, headers, { timeout: this.timeout });
          case 'PATCH':
            return await http.patch<T>(url, data, headers, { timeout: this.timeout });
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
   * Create a new contact
   * @param options - Contact creation options
   * @returns Created contact
   */
  async create(options: CreateContactOptions): Promise<Contact> {
    // Validate required fields
    if (!options.email) {
      throw new ValidationError('Email is required');
    }

    if (!this.validateEmail(options.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!options.audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<Contact>('POST', '/api/contacts', {
      email: options.email.toLowerCase().trim(),
      firstName: options.firstName,
      lastName: options.lastName,
      phone: options.phone,
      audienceId: options.audienceId,
      tags: options.tags || [],
      customFields: options.customFields || {},
      status: options.status || 'subscribed'
    });

    return response;
  }

  /**
   * Get a contact by ID
   * @param contactId - Contact ID
   * @returns Contact data
   */
  async get(contactId: string): Promise<Contact> {
    if (!contactId) {
      throw new ValidationError('Contact ID is required');
    }

    const response = await this.makeRequest<Contact>('GET', `/api/contacts/${contactId}`);
    return response;
  }

  /**
   * Get a contact by email
   * @param email - Contact email
   * @param audienceId - Audience ID
   * @returns Contact data
   */
  async getByEmail(email: string, audienceId: string): Promise<Contact> {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<Contact>(
      'GET',
      `/api/contacts/email/${encodeURIComponent(email)}`,
      undefined,
      { audienceId }
    );

    return response;
  }

  /**
   * Update a contact
   * @param contactId - Contact ID
   * @param options - Update options
   * @returns Updated contact
   */
  async update(contactId: string, options: UpdateContactOptions): Promise<Contact> {
    if (!contactId) {
      throw new ValidationError('Contact ID is required');
    }

    const response = await this.makeRequest<Contact>(
      'PATCH',
      `/api/contacts/${contactId}`,
      options
    );

    return response;
  }

  /**
   * Delete a contact
   * @param contactId - Contact ID
   * @param audienceId - Audience ID (required by server)
   * @returns Success status
   */
  async delete(contactId: string, audienceId?: string): Promise<{ success: boolean }> {
    if (!contactId) {
      throw new ValidationError('Contact ID is required');
    }

    const queryString = audienceId ? `?audienceId=${audienceId}` : '';
    const response = await this.makeRequest<{ success: boolean }>(
      'DELETE',
      `/api/contacts/${contactId}${queryString}`
    );

    return response;
  }

  /**
   * List contacts with filters
   * @param filters - List filters
   * @returns Contact list
   */
  async list(filters?: ContactListFilters): Promise<ContactListResponse> {
    const params = new URLSearchParams();

    if (filters?.audienceId) {
      params.append('audienceId', filters.audienceId);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.tag) {
      params.append('tag', filters.tag);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/contacts?${queryString}` : '/api/contacts';

    const response = await this.makeRequest<ContactListResponse>('GET', endpoint);
    return response;
  }

  /**
   * Subscribe a contact (set status to subscribed)
   * @param contactId - Contact ID
   * @returns Updated contact
   */
  async subscribe(contactId: string): Promise<Contact> {
    return this.update(contactId, { status: 'subscribed' });
  }

  /**
   * Unsubscribe a contact
   * @param contactId - Contact ID
   * @returns Updated contact
   */
  async unsubscribe(contactId: string): Promise<Contact> {
    return this.update(contactId, { status: 'unsubscribed' });
  }

  /**
   * Add tags to a contact
   * @param contactId - Contact ID
   * @param tags - Tags to add
   * @returns Updated contact
   */
  async addTags(contactId: string, tags: string[]): Promise<Contact> {
    if (!contactId) {
      throw new ValidationError('Contact ID is required');
    }

    if (!tags || tags.length === 0) {
      throw new ValidationError('At least one tag is required');
    }

    const response = await this.makeRequest<Contact>(
      'POST',
      `/api/contacts/${contactId}/tags`,
      { tags }
    );

    return response;
  }

  /**
   * Remove tags from a contact
   * @param contactId - Contact ID
   * @param tags - Tags to remove
   * @returns Updated contact
   */
  async removeTags(contactId: string, tags: string[]): Promise<Contact> {
    if (!contactId) {
      throw new ValidationError('Contact ID is required');
    }

    if (!tags || tags.length === 0) {
      throw new ValidationError('At least one tag is required');
    }

    const response = await this.makeRequest<Contact>(
      'DELETE',
      `/api/contacts/${contactId}/tags`,
      { tags }
    );

    return response;
  }

  /**
   * Bulk import contacts
   * @param contacts - Array of contacts to import
   * @param audienceId - Target audience ID
   * @returns Import result
   */
  async bulkImport(
    contacts: Array<{ email: string; firstName?: string; lastName?: string; tags?: string[] }>,
    audienceId: string
  ): Promise<BulkContactResult> {
    if (!contacts || contacts.length === 0) {
      throw new ValidationError('At least one contact is required');
    }

    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    // Validate all emails
    const invalidEmails = contacts.filter(c => !this.validateEmail(c.email));
    if (invalidEmails.length > 0) {
      throw new ValidationError(
        `Invalid email format for: ${invalidEmails.map(c => c.email).join(', ')}`
      );
    }

    const response = await this.makeRequest<BulkContactResult>(
      'POST',
      '/api/contacts/bulk',
      {
        contacts: contacts.map(c => ({
          ...c,
          email: c.email.toLowerCase().trim()
        })),
        audienceId
      }
    );

    return response;
  }

  /**
   * Export contacts from an audience
   * @param audienceId - Audience ID
   * @param format - Export format (csv or json)
   * @returns Export data
   */
  async export(
    audienceId: string,
    format: 'csv' | 'json' = 'json'
  ): Promise<string | Contact[]> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<{ data: string | Contact[] }>(
      'GET',
      `/api/contacts/export`,
      undefined,
      { audienceId, format }
    );

    return response.data;
  }

  /**
   * Search contacts
   * @param query - Search query
   * @param audienceId - Optional audience ID to filter
   * @returns Matching contacts
   */
  async search(query: string, audienceId?: string): Promise<Contact[]> {
    if (!query || query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    const params: Record<string, string> = { q: query };
    if (audienceId) {
      params.audienceId = audienceId;
    }

    const response = await this.makeRequest<{ contacts: Contact[] }>(
      'GET',
      '/api/contacts/search',
      undefined,
      params
    );

    return response.contacts;
  }
}

export default MetiganContacts;

