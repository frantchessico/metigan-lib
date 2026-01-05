/**
 * Metigan Audiences Module
 * Handles audience/list management
 * @version 2.0.0
 */
import type { Audience, CreateAudienceOptions, UpdateAudienceOptions, AudienceListResponse, AudienceStats, PaginationOptions } from './types';
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
export declare class MetiganAudiences {
    private apiKey;
    private timeout;
    private retryCount;
    private retryDelay;
    /**
     * Create a new MetiganAudiences instance
     * @param options - Audiences module options
     */
    constructor(options: AudiencesModuleOptions);
    /**
     * Get default headers for API requests
     */
    private getHeaders;
    /**
     * Make request with retry logic
     */
    private makeRequest;
    /**
     * Create a new audience
     * @param options - Audience creation options
     * @returns Created audience
     */
    create(options: CreateAudienceOptions): Promise<Audience>;
    /**
     * Get an audience by ID
     * @param audienceId - Audience ID
     * @returns Audience data
     */
    get(audienceId: string): Promise<Audience>;
    /**
     * Update an audience
     * @param audienceId - Audience ID
     * @param options - Update options
     * @returns Updated audience
     */
    update(audienceId: string, options: UpdateAudienceOptions): Promise<Audience>;
    /**
     * Delete an audience
     * @param audienceId - Audience ID
     * @returns Success status
     */
    delete(audienceId: string): Promise<{
        success: boolean;
    }>;
    /**
     * List all audiences
     * @param options - Pagination options
     * @returns Audience list
     */
    list(options?: PaginationOptions): Promise<AudienceListResponse>;
    /**
     * Get audience statistics
     * @param audienceId - Audience ID
     * @returns Audience statistics
     */
    getStats(audienceId: string): Promise<AudienceStats>;
    /**
     * Get total count of contacts in an audience
     * @param audienceId - Audience ID
     * @returns Contact count
     */
    getCount(audienceId: string): Promise<number>;
    /**
     * Merge two audiences
     * @param sourceAudienceId - Source audience ID (will be deleted)
     * @param targetAudienceId - Target audience ID (will receive contacts)
     * @returns Merged audience
     */
    merge(sourceAudienceId: string, targetAudienceId: string): Promise<Audience>;
    /**
     * Duplicate an audience
     * @param audienceId - Audience ID to duplicate
     * @param newName - Name for the new audience
     * @returns New duplicated audience
     */
    duplicate(audienceId: string, newName: string): Promise<Audience>;
    /**
     * Clean audience (remove bounced and unsubscribed contacts)
     * @param audienceId - Audience ID
     * @returns Cleanup result
     */
    clean(audienceId: string): Promise<{
        removed: number;
    }>;
    /**
     * Search audiences by name
     * @param query - Search query
     * @returns Matching audiences
     */
    search(query: string): Promise<Audience[]>;
}
export default MetiganAudiences;
