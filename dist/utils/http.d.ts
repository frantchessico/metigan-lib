/**
 * HTTP utility for making API requests
 * Abstracts the actual HTTP client implementation
 */
/**
 * HTTP error interface
 */
export interface HttpError {
    status: number;
    data: any;
    message: string;
}
/**
 * Request options
 */
export interface RequestOptions {
    timeout?: number;
    params?: Record<string, any>;
}
/**
 * Make a POST request to the specified URL
 * @param url - The URL to make the request to
 * @param data - The data to send in the request body
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export declare function post<T>(url: string, data: any, headers: Record<string, string>, options?: RequestOptions): Promise<T>;
/**
 * Make a GET request to the specified URL
 * @param url - The URL to make the request to
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export declare function get<T>(url: string, headers: Record<string, string>, options?: RequestOptions): Promise<T>;
/**
 * Make a PUT request to the specified URL
 * @param url - The URL to make the request to
 * @param data - The data to send in the request body
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export declare function put<T>(url: string, data: any, headers: Record<string, string>, options?: RequestOptions): Promise<T>;
/**
 * Make a PATCH request to the specified URL
 * @param url - The URL to make the request to
 * @param data - The data to send in the request body
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export declare function patch<T>(url: string, data: any, headers: Record<string, string>, options?: RequestOptions): Promise<T>;
/**
 * Make a DELETE request to the specified URL
 * @param url - The URL to make the request to
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export declare function del<T>(url: string, headers: Record<string, string>, options?: RequestOptions): Promise<T>;
