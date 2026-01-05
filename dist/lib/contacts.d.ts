/**
 * Metigan Contacts Module
 * Handles contact/subscriber management
 * @version 2.0.0
 */
import type { Contact, CreateContactOptions, UpdateContactOptions, ContactListFilters, ContactListResponse, BulkContactResult } from './types';
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
export declare class MetiganContacts {
    private apiKey;
    private timeout;
    private retryCount;
    private retryDelay;
    /**
     * Create a new MetiganContacts instance
     * @param options - Contacts module options
     */
    constructor(options: ContactsModuleOptions);
    /**
     * Get default headers for API requests
     */
    private getHeaders;
    /**
     * Validate email format
     */
    private validateEmail;
    /**
     * Make request with retry logic
     */
    private makeRequest;
    /**
     * Create a new contact
     * @param options - Contact creation options
     * @returns Created contact
     */
    create(options: CreateContactOptions): Promise<Contact>;
    /**
     * Get a contact by ID
     * @param contactId - Contact ID
     * @returns Contact data
     */
    get(contactId: string): Promise<Contact>;
    /**
     * Get a contact by email
     * @param email - Contact email
     * @param audienceId - Audience ID
     * @returns Contact data
     */
    getByEmail(email: string, audienceId: string): Promise<Contact>;
    /**
     * Update a contact
     * @param contactId - Contact ID
     * @param options - Update options
     * @returns Updated contact
     */
    update(contactId: string, options: UpdateContactOptions): Promise<Contact>;
    /**
     * Delete a contact
     * @param contactId - Contact ID
     * @param audienceId - Audience ID (required by server)
     * @returns Success status
     */
    delete(contactId: string, audienceId?: string): Promise<{
        success: boolean;
    }>;
    /**
     * List contacts with filters
     * @param filters - List filters
     * @returns Contact list
     */
    list(filters?: ContactListFilters): Promise<ContactListResponse>;
    /**
     * Subscribe a contact (set status to subscribed)
     * @param contactId - Contact ID
     * @returns Updated contact
     */
    subscribe(contactId: string): Promise<Contact>;
    /**
     * Unsubscribe a contact
     * @param contactId - Contact ID
     * @returns Updated contact
     */
    unsubscribe(contactId: string): Promise<Contact>;
    /**
     * Add tags to a contact
     * @param contactId - Contact ID
     * @param tags - Tags to add
     * @returns Updated contact
     */
    addTags(contactId: string, tags: string[]): Promise<Contact>;
    /**
     * Remove tags from a contact
     * @param contactId - Contact ID
     * @param tags - Tags to remove
     * @returns Updated contact
     */
    removeTags(contactId: string, tags: string[]): Promise<Contact>;
    /**
     * Bulk import contacts
     * @param contacts - Array of contacts to import
     * @param audienceId - Target audience ID
     * @returns Import result
     */
    bulkImport(contacts: Array<{
        email: string;
        firstName?: string;
        lastName?: string;
        tags?: string[];
    }>, audienceId: string): Promise<BulkContactResult>;
    /**
     * Export contacts from an audience
     * @param audienceId - Audience ID
     * @param format - Export format (csv or json)
     * @returns Export data
     */
    export(audienceId: string, format?: 'csv' | 'json'): Promise<string | Contact[]>;
    /**
     * Search contacts
     * @param query - Search query
     * @param audienceId - Optional audience ID to filter
     * @returns Matching contacts
     */
    search(query: string, audienceId?: string): Promise<Contact[]>;
}
export default MetiganContacts;
