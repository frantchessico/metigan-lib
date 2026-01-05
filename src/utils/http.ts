/**
 * HTTP utility for making API requests
 * Abstracts the actual HTTP client implementation
 */

import axios, { AxiosRequestConfig } from 'axios';

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
export async function post<T>(
  url: string, 
  data: any, 
  headers: Record<string, string>,
  options?: RequestOptions
): Promise<T> {
  try {
    const config: AxiosRequestConfig = { 
      headers,
      timeout: options?.timeout || 30000
    };
    const response = await axios.post(url, data, config);
    return response.data;
  } catch (error: any) {
    const httpError: HttpError = {
      status: error.response?.status || 0,
      data: error.response?.data || {},
      message: error.message || 'Unknown error'
    };
    throw httpError;
  }
}

/**
 * Make a GET request to the specified URL
 * @param url - The URL to make the request to
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export async function get<T>(
  url: string, 
  headers: Record<string, string>,
  options?: RequestOptions
): Promise<T> {
  try {
    const config: AxiosRequestConfig = { 
      headers,
      timeout: options?.timeout || 30000,
      params: options?.params
    };
    const response = await axios.get(url, config);
    return response.data;
  } catch (error: any) {
    const httpError: HttpError = {
      status: error.response?.status || 0,
      data: error.response?.data || {},
      message: error.message || 'Unknown error'
    };
    throw httpError;
  }
}

/**
 * Make a PUT request to the specified URL
 * @param url - The URL to make the request to
 * @param data - The data to send in the request body
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export async function put<T>(
  url: string, 
  data: any, 
  headers: Record<string, string>,
  options?: RequestOptions
): Promise<T> {
  try {
    const config: AxiosRequestConfig = { 
      headers,
      timeout: options?.timeout || 30000
    };
    const response = await axios.put(url, data, config);
    return response.data;
  } catch (error: any) {
    const httpError: HttpError = {
      status: error.response?.status || 0,
      data: error.response?.data || {},
      message: error.message || 'Unknown error'
    };
    throw httpError;
  }
}

/**
 * Make a PATCH request to the specified URL
 * @param url - The URL to make the request to
 * @param data - The data to send in the request body
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export async function patch<T>(
  url: string, 
  data: any, 
  headers: Record<string, string>,
  options?: RequestOptions
): Promise<T> {
  try {
    const config: AxiosRequestConfig = { 
      headers,
      timeout: options?.timeout || 30000
    };
    const response = await axios.patch(url, data, config);
    return response.data;
  } catch (error: any) {
    const httpError: HttpError = {
      status: error.response?.status || 0,
      data: error.response?.data || {},
      message: error.message || 'Unknown error'
    };
    throw httpError;
  }
}

/**
 * Make a DELETE request to the specified URL
 * @param url - The URL to make the request to
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
export async function del<T>(
  url: string, 
  headers: Record<string, string>,
  options?: RequestOptions
): Promise<T> {
  try {
    const config: AxiosRequestConfig = { 
      headers,
      timeout: options?.timeout || 30000
    };
    const response = await axios.delete(url, config);
    return response.data;
  } catch (error: any) {
    const httpError: HttpError = {
      status: error.response?.status || 0,
      data: error.response?.data || {},
      message: error.message || 'Unknown error'
    };
    throw httpError;
  }
}
