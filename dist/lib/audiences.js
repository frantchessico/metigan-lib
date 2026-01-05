"use strict";
/**
 * Metigan Audiences Module
 * Handles audience/list management
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
exports.MetiganAudiences = void 0;
const http = __importStar(require("../utils/http"));
const errors_1 = require("./errors");
const config_1 = require("./config");
/**
 * MetiganAudiences class for audience operations
 */
class MetiganAudiences {
    /**
     * Create a new MetiganAudiences instance
     * @param options - Audiences module options
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
     * Create a new audience
     * @param options - Audience creation options
     * @returns Created audience
     */
    async create(options) {
        var _a;
        if (!options.name) {
            throw new errors_1.ValidationError('Audience name is required');
        }
        if (options.name.length < 2) {
            throw new errors_1.ValidationError('Audience name must be at least 2 characters');
        }
        const response = await this.makeRequest('POST', '/api/audiences', {
            name: options.name.trim(),
            description: (_a = options.description) === null || _a === void 0 ? void 0 : _a.trim()
        });
        return response;
    }
    /**
     * Get an audience by ID
     * @param audienceId - Audience ID
     * @returns Audience data
     */
    async get(audienceId) {
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('GET', `/api/audiences/${audienceId}`);
        return response;
    }
    /**
     * Update an audience
     * @param audienceId - Audience ID
     * @param options - Update options
     * @returns Updated audience
     */
    async update(audienceId, options) {
        var _a, _b;
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        if (options.name && options.name.length < 2) {
            throw new errors_1.ValidationError('Audience name must be at least 2 characters');
        }
        const response = await this.makeRequest('PATCH', `/api/audiences/${audienceId}`, {
            name: (_a = options.name) === null || _a === void 0 ? void 0 : _a.trim(),
            description: (_b = options.description) === null || _b === void 0 ? void 0 : _b.trim()
        });
        return response;
    }
    /**
     * Delete an audience
     * @param audienceId - Audience ID
     * @returns Success status
     */
    async delete(audienceId) {
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('DELETE', `/api/audiences/${audienceId}`);
        return response;
    }
    /**
     * List all audiences
     * @param options - Pagination options
     * @returns Audience list
     */
    async list(options) {
        const params = new URLSearchParams();
        if (options === null || options === void 0 ? void 0 : options.page) {
            params.append('page', options.page.toString());
        }
        if (options === null || options === void 0 ? void 0 : options.limit) {
            params.append('limit', options.limit.toString());
        }
        const queryString = params.toString();
        const endpoint = queryString ? `/api/audiences?${queryString}` : '/api/audiences';
        const response = await this.makeRequest('GET', endpoint);
        return response;
    }
    /**
     * Get audience statistics
     * @param audienceId - Audience ID
     * @returns Audience statistics
     */
    async getStats(audienceId) {
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('GET', `/api/audiences/${audienceId}/stats`);
        return response;
    }
    /**
     * Get total count of contacts in an audience
     * @param audienceId - Audience ID
     * @returns Contact count
     */
    async getCount(audienceId) {
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('GET', `/api/audiences/${audienceId}/count`);
        return response.count;
    }
    /**
     * Merge two audiences
     * @param sourceAudienceId - Source audience ID (will be deleted)
     * @param targetAudienceId - Target audience ID (will receive contacts)
     * @returns Merged audience
     */
    async merge(sourceAudienceId, targetAudienceId) {
        if (!sourceAudienceId) {
            throw new errors_1.ValidationError('Source audience ID is required');
        }
        if (!targetAudienceId) {
            throw new errors_1.ValidationError('Target audience ID is required');
        }
        if (sourceAudienceId === targetAudienceId) {
            throw new errors_1.ValidationError('Source and target audiences must be different');
        }
        const response = await this.makeRequest('POST', '/api/audiences/merge', {
            sourceAudienceId,
            targetAudienceId
        });
        return response;
    }
    /**
     * Duplicate an audience
     * @param audienceId - Audience ID to duplicate
     * @param newName - Name for the new audience
     * @returns New duplicated audience
     */
    async duplicate(audienceId, newName) {
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        if (!newName || newName.length < 2) {
            throw new errors_1.ValidationError('New audience name must be at least 2 characters');
        }
        const response = await this.makeRequest('POST', `/api/audiences/${audienceId}/duplicate`, { name: newName.trim() });
        return response;
    }
    /**
     * Clean audience (remove bounced and unsubscribed contacts)
     * @param audienceId - Audience ID
     * @returns Cleanup result
     */
    async clean(audienceId) {
        if (!audienceId) {
            throw new errors_1.ValidationError('Audience ID is required');
        }
        const response = await this.makeRequest('POST', `/api/audiences/${audienceId}/clean`);
        return response;
    }
    /**
     * Search audiences by name
     * @param query - Search query
     * @returns Matching audiences
     */
    async search(query) {
        if (!query || query.length < 2) {
            throw new errors_1.ValidationError('Search query must be at least 2 characters');
        }
        const response = await this.makeRequest('GET', '/api/audiences/search', undefined, { q: query });
        return response.audiences;
    }
}
exports.MetiganAudiences = MetiganAudiences;
exports.default = MetiganAudiences;
