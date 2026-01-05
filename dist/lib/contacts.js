"use strict";
/**
 * Metigan Contacts Module
 * Handles contact/subscriber management
 * @version 2.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetiganContacts = void 0;
const http = __importStar(require("../utils/http"));
const errors_1 = require("./errors");
const config_1 = require("./config");
/**
 * MetiganContacts class for contact operations
 */
class MetiganContacts {
    /**
     * Create a new MetiganContacts instance
     * @param options - Contacts module options
     */
    constructor(options) {
        if (!options.apiKey) {
            throw new errors_1.MetiganError('API key is required');
        }
        this.apiKey = options.apiKey;
        this.timeout = options.timeout || config_1.DEFAULT_TIMEOUT;
        this.retryCount = options.retryCount || config_1.DEFAULT_RETRY_COUNT;
        this.retryDelay = options.retryDelay || config_1.DEFAULT_RETRY_DELAY;
    }
    /**
     * Get default headers for API requests
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'User-Agent': 'MetiganSDK/2.0'
        };
    }
    /**
     * Validate email format
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string')
            return false;
        const parts = email.split('@');
        if (parts.length !== 2)
            return false;
        if (parts[0].length === 0)
            return false;
        const domainParts = parts[1].split('.');
        if (domainParts.length < 2)
            return false;
        if (domainParts.some(part => part.length === 0))
            return false;
        return true;
    }
    /**
     * Make request with retry logic
     */
    async makeRequest(method, endpoint, data, params) {
        var _a, _b, _c;
        const url = `${config_1.API_URL}${endpoint}`;
        const headers = this.getHeaders();
        let lastError;
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            try {
                switch (method) {
                    case 'GET':
                        return await http.get(url, headers, { timeout: this.timeout, params });
                    case 'POST':
                        return await http.post(url, data, headers, { timeout: this.timeout });
                    case 'PUT':
                        return await http.put(url, data, headers, { timeout: this.timeout });
                    case 'PATCH':
                        return await http.patch(url, data, headers, { timeout: this.timeout });
                    case 'DELETE':
                        return await http.del(url, headers, { timeout: this.timeout });
                }
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx)
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw new errors_1.ApiError(((_a = error.data) === null || _a === void 0 ? void 0 : _a.message) || ((_b = error.data) === null || _b === void 0 ? void 0 : _b.error) || `Request failed with status ${error.status}`, error.status);
                }
                // Wait before retrying
                if (attempt < this.retryCount - 1) {
                    const delay = this.retryDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw new errors_1.ApiError(((_c = lastError === null || lastError === void 0 ? void 0 : lastError.data) === null || _c === void 0 ? void 0 : _c.message) || 'Request failed after multiple attempts', lastError === null || lastError === void 0 ? void 0 : lastError.status);
    }
    /**
     * Create a new contact
     * @param options - Contact creation options
     * @returns Created contact
     */
    async create(options) {
        // Validate required fields
        if (!options.email) {
            throw new errors_1.ValidationError('Email is required');
        }
        if (!this.validateEmail(options.email)) {
            throw new errors_1.ValidationError('Invalid email format');
        }
        if (!options.audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('POST', '/api/contacts', {
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
    async get(contactId) {
        if (!contactId) {
            throw new errors_1.ValidationError('Contact ID is required');
        }
        const response = await this.makeRequest('GET', `/api/contacts/${contactId}`);
        return response;
    }
    /**
     * Get a contact by email
     * @param email - Contact email
     * @param audienceId - Audience ID
     * @returns Contact data
     */
    async getByEmail(email, audienceId) {
        if (!email) {
            throw new errors_1.ValidationError('Email is required');
        }
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('GET', `/api/contacts/email/${encodeURIComponent(email)}`, undefined, { audienceId });
        return response;
    }
    /**
     * Update a contact
     * @param contactId - Contact ID
     * @param options - Update options
     * @returns Updated contact
     */
    async update(contactId, options) {
        if (!contactId) {
            throw new errors_1.ValidationError('Contact ID is required');
        }
        const response = await this.makeRequest('PATCH', `/api/contacts/${contactId}`, options);
        return response;
    }
    /**
     * Delete a contact
     * @param contactId - Contact ID
     * @param audienceId - Audience ID (required by server)
     * @returns Success status
     */
    async delete(contactId, audienceId) {
        if (!contactId) {
            throw new errors_1.ValidationError('Contact ID is required');
        }
        const queryString = audienceId ? `?audienceId=${audienceId}` : '';
        const response = await this.makeRequest('DELETE', `/api/contacts/${contactId}${queryString}`);
        return response;
    }
    /**
     * List contacts with filters
     * @param filters - List filters
     * @returns Contact list
     */
    async list(filters) {
        const params = new URLSearchParams();
        if (filters === null || filters === void 0 ? void 0 : filters.audienceId) {
            params.append('audienceId', filters.audienceId);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            params.append('status', filters.status);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.tag) {
            params.append('tag', filters.tag);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.search) {
            params.append('search', filters.search);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.page) {
            params.append('page', filters.page.toString());
        }
        if (filters === null || filters === void 0 ? void 0 : filters.limit) {
            params.append('limit', filters.limit.toString());
        }
        const queryString = params.toString();
        const endpoint = queryString ? `/api/contacts?${queryString}` : '/api/contacts';
        const response = await this.makeRequest('GET', endpoint);
        return response;
    }
    /**
     * Subscribe a contact (set status to subscribed)
     * @param contactId - Contact ID
     * @returns Updated contact
     */
    async subscribe(contactId) {
        return this.update(contactId, { status: 'subscribed' });
    }
    /**
     * Unsubscribe a contact
     * @param contactId - Contact ID
     * @returns Updated contact
     */
    async unsubscribe(contactId) {
        return this.update(contactId, { status: 'unsubscribed' });
    }
    /**
     * Add tags to a contact
     * @param contactId - Contact ID
     * @param tags - Tags to add
     * @returns Updated contact
     */
    async addTags(contactId, tags) {
        if (!contactId) {
            throw new errors_1.ValidationError('Contact ID is required');
        }
        if (!tags || tags.length === 0) {
            throw new errors_1.ValidationError('At least one tag is required');
        }
        const response = await this.makeRequest('POST', `/api/contacts/${contactId}/tags`, { tags });
        return response;
    }
    /**
     * Remove tags from a contact
     * @param contactId - Contact ID
     * @param tags - Tags to remove
     * @returns Updated contact
     */
    async removeTags(contactId, tags) {
        if (!contactId) {
            throw new errors_1.ValidationError('Contact ID is required');
        }
        if (!tags || tags.length === 0) {
            throw new errors_1.ValidationError('At least one tag is required');
        }
        const response = await this.makeRequest('DELETE', `/api/contacts/${contactId}/tags`, { tags });
        return response;
    }
    /**
     * Bulk import contacts
     * @param contacts - Array of contacts to import
     * @param audienceId - Target audience ID
     * @returns Import result
     */
    async bulkImport(contacts, audienceId) {
        if (!contacts || contacts.length === 0) {
            throw new errors_1.ValidationError('At least one contact is required');
        }
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        // Validate all emails
        const invalidEmails = contacts.filter(c => !this.validateEmail(c.email));
        if (invalidEmails.length > 0) {
            throw new errors_1.ValidationError(`Invalid email format for: ${invalidEmails.map(c => c.email).join(', ')}`);
        }
        const response = await this.makeRequest('POST', '/api/contacts/bulk', {
            contacts: contacts.map(c => ({
                ...c,
                email: c.email.toLowerCase().trim()
            })),
            audienceId
        });
        return response;
    }
    /**
     * Export contacts from an audience
     * @param audienceId - Audience ID
     * @param format - Export format (csv or json)
     * @returns Export data
     */
    async export(audienceId, format = 'json') {
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('GET', `/api/contacts/export`, undefined, { audienceId, format });
        return response.data;
    }
    /**
     * Search contacts
     * @param query - Search query
     * @param audienceId - Optional audience ID to filter
     * @returns Matching contacts
     */
    async search(query, audienceId) {
        if (!query || query.length < 2) {
            throw new errors_1.ValidationError('Search query must be at least 2 characters');
        }
        const params = { q: query };
        if (audienceId) {
            params.audienceId = audienceId;
        }
        const response = await this.makeRequest('GET', '/api/contacts/search', undefined, params);
        return response.contacts;
    }
}
exports.MetiganContacts = MetiganContacts;
exports.default = MetiganContacts;
