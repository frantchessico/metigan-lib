/**
 * Metigan Audiences Module
 * Handles audience/list management
 * @version 2.0.0
 */

import * as http from '../utils/http';
import { MetiganError, ApiError, ValidationError } from './errors';
import { API_URL, DEFAULT_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY } from './config';
import type {
  Audience,
  CreateAudienceOptions,
  UpdateAudienceOptions,
  AudienceListResponse,
  AudienceStats,
  PaginationOptions
} from './types';

/**
 * Audiences module options
 */
export interface AudiencesModuleOptions {
  apiKey: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * MetiganAudiences class for audience operations
 */
export class MetiganAudiences {
  private apiKey: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  /**
   * Create a new MetiganAudiences instance
   * @param options - Audiences module options
   */
  constructor(options: AudiencesModuleOptions) {
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
   * Create a new audience
   * @param options - Audience creation options
   * @returns Created audience
   */
  async create(options: CreateAudienceOptions): Promise<Audience> {
    if (!options.name) {
      throw new ValidationError('Audience name is required');
    }

    if (options.name.length < 2) {
      throw new ValidationError('Audience name must be at least 2 characters');
    }

    const response = await this.makeRequest<Audience>('POST', '/api/audiences', {
      name: options.name.trim(),
      description: options.description?.trim()
    });

    return response;
  }

  /**
   * Get an audience by ID
   * @param audienceId - Audience ID
   * @returns Audience data
   */
  async get(audienceId: string): Promise<Audience> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<Audience>('GET', `/api/audiences/${audienceId}`);
    return response;
  }

  /**
   * Update an audience
   * @param audienceId - Audience ID
   * @param options - Update options
   * @returns Updated audience
   */
  async update(audienceId: string, options: UpdateAudienceOptions): Promise<Audience> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    if (options.name && options.name.length < 2) {
      throw new ValidationError('Audience name must be at least 2 characters');
    }

    const response = await this.makeRequest<Audience>(
      'PATCH',
      `/api/audiences/${audienceId}`,
      {
        name: options.name?.trim(),
        description: options.description?.trim()
      }
    );

    return response;
  }

  /**
   * Delete an audience
   * @param audienceId - Audience ID
   * @returns Success status
   */
  async delete(audienceId: string): Promise<{ success: boolean }> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<{ success: boolean }>(
      'DELETE',
      `/api/audiences/${audienceId}`
    );

    return response;
  }

  /**
   * List all audiences
   * @param options - Pagination options
   * @returns Audience list
   */
  async list(options?: PaginationOptions): Promise<AudienceListResponse> {
    const params = new URLSearchParams();

    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/audiences?${queryString}` : '/api/audiences';

    const response = await this.makeRequest<AudienceListResponse>('GET', endpoint);
    return response;
  }

  /**
   * Get audience statistics
   * @param audienceId - Audience ID
   * @returns Audience statistics
   */
  async getStats(audienceId: string): Promise<AudienceStats> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<AudienceStats>(
      'GET',
      `/api/audiences/${audienceId}/stats`
    );

    return response;
  }

  /**
   * Get total count of contacts in an audience
   * @param audienceId - Audience ID
   * @returns Contact count
   */
  async getCount(audienceId: string): Promise<number> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<{ count: number }>(
      'GET',
      `/api/audiences/${audienceId}/count`
    );

    return response.count;
  }

  /**
   * Merge two audiences
   * @param sourceAudienceId - Source audience ID (will be deleted)
   * @param targetAudienceId - Target audience ID (will receive contacts)
   * @returns Merged audience
   */
  async merge(sourceAudienceId: string, targetAudienceId: string): Promise<Audience> {
    if (!sourceAudienceId) {
      throw new ValidationError('Source audience ID is required');
    }

    if (!targetAudienceId) {
      throw new ValidationError('Target audience ID is required');
    }

    if (sourceAudienceId === targetAudienceId) {
      throw new ValidationError('Source and target audiences must be different');
    }

    const response = await this.makeRequest<Audience>(
      'POST',
      '/api/audiences/merge',
      {
        sourceAudienceId,
        targetAudienceId
      }
    );

    return response;
  }

  /**
   * Duplicate an audience
   * @param audienceId - Audience ID to duplicate
   * @param newName - Name for the new audience
   * @returns New duplicated audience
   */
  async duplicate(audienceId: string, newName: string): Promise<Audience> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    if (!newName || newName.length < 2) {
      throw new ValidationError('New audience name must be at least 2 characters');
    }

    const response = await this.makeRequest<Audience>(
      'POST',
      `/api/audiences/${audienceId}/duplicate`,
      { name: newName.trim() }
    );

    return response;
  }

  /**
   * Clean audience (remove bounced and unsubscribed contacts)
   * @param audienceId - Audience ID
   * @returns Cleanup result
   */
  async clean(audienceId: string): Promise<{ removed: number }> {
    if (!audienceId) {
      throw new ValidationError('Audience ID is required');
    }

    const response = await this.makeRequest<{ removed: number }>(
      'POST',
      `/api/audiences/${audienceId}/clean`
    );

    return response;
  }

  /**
   * Search audiences by name
   * @param query - Search query
   * @returns Matching audiences
   */
  async search(query: string): Promise<Audience[]> {
    if (!query || query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    const response = await this.makeRequest<{ audiences: Audience[] }>(
      'GET',
      '/api/audiences/search',
      undefined,
      { q: query }
    );

    return response.audiences;
  }
}

export default MetiganAudiences;

