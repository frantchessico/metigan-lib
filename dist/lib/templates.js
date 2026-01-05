"use strict";
/**
 * Metigan Templates Module
 * Manage email templates created in the Metigan dashboard
 * @version 2.2.0
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
exports.MetiganTemplates = void 0;
const http = __importStar(require("../utils/http"));
const config_1 = require("./config");
const errors_1 = require("./errors");
/**
 * MetiganTemplates - Manage email templates
 */
class MetiganTemplates {
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
            'User-Agent': 'SDK'
        };
    }
    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(method, url, data) {
        var _a;
        let lastError;
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            try {
                switch (method) {
                    case 'GET':
                        return await http.get(url, this.getHeaders());
                    case 'POST':
                        return await http.post(url, data, this.getHeaders());
                    case 'PATCH':
                        return await http.patch(url, data, this.getHeaders());
                    case 'DELETE':
                        return await http.del(url, this.getHeaders());
                }
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx)
                if (error.status >= 400 && error.status < 500) {
                    throw new errors_1.MetiganError(((_a = error.data) === null || _a === void 0 ? void 0 : _a.error) || error.message || 'Request failed');
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
    async list(options = {}) {
        const params = new URLSearchParams();
        if (options.page)
            params.append('page', options.page.toString());
        if (options.limit)
            params.append('limit', options.limit.toString());
        const queryString = params.toString();
        const url = `${config_1.API_URL}/api/templates${queryString ? `?${queryString}` : ''}`;
        return this.makeRequest('GET', url);
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
    async get(templateId) {
        if (!templateId) {
            throw new errors_1.MetiganError('Template ID is required');
        }
        const url = `${config_1.API_URL}/api/templates/${templateId}`;
        return this.makeRequest('GET', url);
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
    async exists(templateId) {
        try {
            await this.get(templateId);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.MetiganTemplates = MetiganTemplates;
exports.default = MetiganTemplates;
