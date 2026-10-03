/**
 * Metigan Audiences Module
 * Handles audience/list management
 * @version 2.4.0
 */

import { HttpClient, type HttpMethod } from '../core/client';
import { withId, withIds } from '../core/normalize';
import { ValidationError } from './errors';
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
  /** Override the API base URL (defaults to METIGAN_API_URL or https://api.metigan.io). */
  baseUrl?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * MetiganAudiences class for audience operations
 */
export class MetiganAudiences {
  private http: HttpClient;

  /**
   * Create a new MetiganAudiences instance
   * @param options - Audiences module options
   */
  constructor(options: AudiencesModuleOptions) {
    this.http = new HttpClient(options);
  }

  private makeRequest<T>(method: HttpMethod, endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.http.request<T>(method, endpoint, { body: data, query: params });
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

    return withId(response);
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

    const response = await this.makeRequest<Audience>('GET', `/api/audiences/${encodeURIComponent(audienceId)}`);
    return withId(response);
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
      `/api/audiences/${encodeURIComponent(audienceId)}`,
      {
        name: options.name?.trim(),
        description: options.description?.trim()
      }
    );

    return withId(response);
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
    if (response && Array.isArray(response.audiences)) {
      response.audiences = withIds(response.audiences);
    }
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

    return withId(response);
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
      `/api/audiences/${encodeURIComponent(audienceId)}/duplicate`,
      { name: newName.trim() }
    );

    return withId(response);
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

    return withIds(response.audiences);
  }
}

export default MetiganAudiences;

