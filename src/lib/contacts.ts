/**
 * Metigan Contacts Module
 * Handles contact/subscriber management
 * @version 2.4.0
 */

import { HttpClient, type HttpMethod } from '../core/client';
import { withId, withIds } from '../core/normalize';
import { ValidationError } from './errors';
import type {
  Contact,
  CreateContactOptions,
  UpdateContactOptions,
  ContactListFilters,
  ContactListResponse,
  BulkContactResult,
} from './types';

/**
 * Contacts module options
 */
export interface ContactsModuleOptions {
  apiKey: string;
  /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
  baseUrl?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * MetiganContacts class for contact operations
 */
export class MetiganContacts {
  private http: HttpClient;

  /**
   * Create a new MetiganContacts instance
   * @param options - Contacts module options
   */
  constructor(options: ContactsModuleOptions) {
    this.http = new HttpClient(options);
  }

  /** Validate email format (local, before hitting the API). */
  private validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    if (parts[0].length === 0) return false;
    const domainParts = parts[1].split('.');
    if (domainParts.length < 2) return false;
    if (domainParts.some((part) => part.length === 0)) return false;
    return true;
  }

  private request<T>(method: HttpMethod, endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.http.request<T>(method, endpoint, { body: data, query: params });
  }

  /**
   * Create a new contact
   * @param options - Contact creation options
   * @returns Created contact
   */
  async create(options: CreateContactOptions): Promise<Contact> {
    if (!options.email) {
      throw new ValidationError('Email is required');
    }
    if (!this.validateEmail(options.email)) {
      throw new ValidationError('Invalid email format');
    }
    if (!options.audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.request<Contact>('POST', '/api/contacts', {
      email: options.email.toLowerCase().trim(),
      firstName: options.firstName,
      lastName: options.lastName,
      phone: options.phone,
      audienceId: options.audienceId,
      tags: options.tags || [],
      customFields: options.customFields || {},
      status: options.status || 'subscribed',
    });
    return withId(response);
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
    return withId(await this.request<Contact>('GET', `/api/contacts/${encodeURIComponent(contactId)}`));
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
    return withId(
      await this.request<Contact>('GET', `/api/contacts/email/${encodeURIComponent(email)}`, undefined, { audienceId }),
    );
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
    return withId(await this.request<Contact>('PATCH', `/api/contacts/${encodeURIComponent(contactId)}`, options));
  }

  /**
   * Delete a contact
   * @param contactId - Contact ID
   * @param audienceId - Audience ID (required by the server)
   * @returns Success status
   */
  async delete(contactId: string, audienceId?: string): Promise<{ success: boolean }> {
    if (!contactId) {
      throw new ValidationError('Contact ID is required');
    }
    return this.request<{ success: boolean }>(
      'DELETE',
      `/api/contacts/${encodeURIComponent(contactId)}`,
      undefined,
      audienceId ? { audienceId } : undefined,
    );
  }

  /**
   * List contacts with filters
   * @param filters - List filters
   * @returns Contact list
   */
  async list(filters?: ContactListFilters): Promise<ContactListResponse> {
    const response = await this.request<ContactListResponse>('GET', '/api/contacts', undefined, {
      audienceId: filters?.audienceId,
      status: filters?.status,
      tag: filters?.tag,
      search: filters?.search,
      page: filters?.page,
      limit: filters?.limit,
    });
    if (response && Array.isArray(response.contacts)) {
      response.contacts = withIds(response.contacts);
    }
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
    return withId(await this.request<Contact>('POST', `/api/contacts/${encodeURIComponent(contactId)}/tags`, { tags }));
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
    return withId(await this.request<Contact>('DELETE', `/api/contacts/${encodeURIComponent(contactId)}/tags`, { tags }));
  }

  /**
   * Bulk import contacts into an audience
   * @param contacts - Array of contacts to import
   * @param audienceId - Target audience ID
   * @returns Import result
   */
  async bulkImport(
    contacts: Array<{ email: string; firstName?: string; lastName?: string; tags?: string[] }>,
    audienceId: string,
  ): Promise<BulkContactResult> {
    if (!contacts || contacts.length === 0) {
      throw new ValidationError('At least one contact is required');
    }
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }
    const invalidEmails = contacts.filter((c) => !this.validateEmail(c.email));
    if (invalidEmails.length > 0) {
      throw new ValidationError(`Invalid email format for: ${invalidEmails.map((c) => c.email).join(', ')}`);
    }

    return this.request<BulkContactResult>('POST', '/api/contacts/bulk', {
      contacts: contacts.map((c) => ({ ...c, email: c.email.toLowerCase().trim() })),
      audienceId,
    });
  }

  /**
   * Export contacts from an audience.
   * - `format: 'csv'` resolves the raw CSV text.
   * - `format: 'json'` resolves the contacts array.
   * @param audienceId - Audience ID
   * @param format - Export format (csv or json)
   */
  async export(audienceId: string, format: 'csv'): Promise<string>;
  async export(audienceId: string, format?: 'json'): Promise<Contact[]>;
  async export(audienceId: string, format: 'csv' | 'json' = 'json'): Promise<string | Contact[]> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }
    if (format === 'csv') {
      // The API streams raw CSV (text/csv) with no JSON envelope.
      return this.request<string>('GET', '/api/contacts/export', undefined, { audienceId, format: 'csv' });
    }
    const response = await this.request<{ data: Contact[] }>('GET', '/api/contacts/export', undefined, {
      audienceId,
      format: 'json',
    });
    return withIds(response?.data ?? []);
  }

  /**
   * Search contacts
   * @param query - Search query (min 2 characters)
   * @param audienceId - Optional audience ID to filter
   * @returns Matching contacts
   */
  async search(query: string, audienceId?: string): Promise<Contact[]> {
    if (!query || query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }
    const response = await this.request<{ contacts: Contact[] }>('GET', '/api/contacts/search', undefined, {
      q: query,
      audienceId,
    });
    return withIds(response?.contacts ?? []);
  }
}

export default MetiganContacts;
