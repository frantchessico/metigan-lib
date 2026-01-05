"use strict";
/**
 * Metigan Forms Module
 * Handles form submissions and form data retrieval
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
exports.MetiganForms = void 0;
const http = __importStar(require("../utils/http"));
const errors_1 = require("./errors");
const config_1 = require("./config");
/**
 * MetiganForms class for form operations
 */
class MetiganForms {
    /**
     * Create a new MetiganForms instance
     * @param options - Forms module options
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
     * Make request with retry logic
     */
    async makeRequest(method, endpoint, data) {
        var _a, _b, _c;
        const url = `${config_1.API_URL}${endpoint}`;
        const headers = this.getHeaders();
        let lastError;
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            try {
                switch (method) {
                    case 'GET':
                        return await http.get(url, headers, { timeout: this.timeout });
                    case 'POST':
                        return await http.post(url, data, headers, { timeout: this.timeout });
                    case 'PUT':
                        return await http.put(url, data, headers, { timeout: this.timeout });
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
     * Submit data to a form
     * @param options - Submission options
     * @returns Submission response
     */
    async submit(options) {
        // Validate required fields
        if (!options.formId) {
            throw new errors_1.ValidationError('Form ID is required');
        }
        if (!options.data || Object.keys(options.data).length === 0) {
            throw new errors_1.ValidationError('Submission data is required');
        }
        const response = await this.makeRequest('POST', '/api/submissions', {
            formId: options.formId,
            data: options.data
        });
        return response;
    }
    /**
     * Get form by ID or slug
     * @param formIdOrSlug - Form ID or slug
     * @returns Form configuration
     */
    async getForm(formIdOrSlug) {
        if (!formIdOrSlug) {
            throw new errors_1.ValidationError('Form ID or slug is required');
        }
        const response = await this.makeRequest('GET', `/api/forms/${formIdOrSlug}`);
        return response;
    }
    /**
     * Get form by slug (public)
     * @param slug - Form slug
     * @returns Form configuration for public display
     */
    async getPublicForm(slug) {
        if (!slug) {
            throw new errors_1.ValidationError('Form slug is required');
        }
        const response = await this.makeRequest('GET', `/f/${slug}/api`);
        return response;
    }
    /**
     * List all forms
     * @param options - Pagination options
     * @returns List of forms
     */
    async listForms(options) {
        const params = new URLSearchParams();
        if (options === null || options === void 0 ? void 0 : options.page) {
            params.append('page', options.page.toString());
        }
        if (options === null || options === void 0 ? void 0 : options.limit) {
            params.append('limit', options.limit.toString());
        }
        const queryString = params.toString();
        const endpoint = queryString ? `/api/forms?${queryString}` : '/api/forms';
        const response = await this.makeRequest('GET', endpoint);
        return response;
    }
    /**
     * Get form analytics
     * @param formId - Form ID
     * @returns Form analytics data
     */
    async getAnalytics(formId) {
        if (!formId) {
            throw new errors_1.ValidationError('Form ID is required');
        }
        const response = await this.makeRequest('GET', `/api/forms/${formId}/analytics`);
        return response;
    }
    /**
     * Create a new form
     * @param config - Form configuration
     * @returns Created form
     */
    async createForm(config) {
        if (!config.title) {
            throw new errors_1.ValidationError('Form title is required');
        }
        if (!config.fields || config.fields.length === 0) {
            throw new errors_1.ValidationError('At least one field is required');
        }
        const response = await this.makeRequest('POST', '/api/forms', config);
        return response;
    }
    /**
     * Update an existing form
     * @param formId - Form ID
     * @param config - Updated form configuration
     * @returns Updated form
     */
    async updateForm(formId, config) {
        if (!formId) {
            throw new errors_1.ValidationError('Form ID is required');
        }
        const response = await this.makeRequest('PUT', `/api/forms/${formId}`, config);
        return response;
    }
    /**
     * Delete a form
     * @param formId - Form ID
     * @returns Success status
     */
    async deleteForm(formId) {
        if (!formId) {
            throw new errors_1.ValidationError('Form ID is required');
        }
        const response = await this.makeRequest('DELETE', `/api/forms/${formId}`);
        return response;
    }
    /**
     * Publish a form
     * @param formId - Form ID
     * @param slug - Optional custom slug
     * @returns Published form URL
     */
    async publishForm(formId, slug) {
        if (!formId) {
            throw new errors_1.ValidationError('Form ID is required');
        }
        const response = await this.makeRequest('POST', `/api/forms/${formId}/publish`, { slug });
        return response;
    }
    /**
     * Unpublish a form
     * @param formId - Form ID
     * @returns Success status
     */
    async unpublishForm(formId) {
        if (!formId) {
            throw new errors_1.ValidationError('Form ID is required');
        }
        const response = await this.makeRequest('DELETE', `/api/forms/${formId}/publish`);
        return response;
    }
    /**
     * Get form submissions
     * @param formId - Form ID
     * @param options - Pagination options
     * @returns List of submissions
     */
    async getSubmissions(formId, options) {
        if (!formId) {
            throw new errors_1.ValidationError('Form ID is required');
        }
        const params = new URLSearchParams();
        params.append('formId', formId);
        if (options === null || options === void 0 ? void 0 : options.page) {
            params.append('page', options.page.toString());
        }
        if (options === null || options === void 0 ? void 0 : options.limit) {
            params.append('limit', options.limit.toString());
        }
        const response = await this.makeRequest('GET', `/api/submissions?${params.toString()}`);
        return response;
    }
}
exports.MetiganForms = MetiganForms;
exports.default = MetiganForms;
