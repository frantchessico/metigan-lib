"use strict";
/**
 * HTTP utility for making API requests
 * Abstracts the actual HTTP client implementation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.post = post;
exports.get = get;
exports.put = put;
exports.patch = patch;
exports.del = del;
const axios_1 = __importDefault(require("axios"));
/**
 * Make a POST request to the specified URL
 * @param url - The URL to make the request to
 * @param data - The data to send in the request body
 * @param headers - The headers to include in the request
 * @param options - Additional request options
 * @returns The response data
 * @throws HttpError if the request fails
 */
async function post(url, data, headers, options) {
    var _a, _b;
    try {
        const config = {
            headers,
            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000
        };
        const response = await axios_1.default.post(url, data, config);
        return response.data;
    }
    catch (error) {
        const httpError = {
            status: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || 0,
            data: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || {},
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
async function get(url, headers, options) {
    var _a, _b;
    try {
        const config = {
            headers,
            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000,
            params: options === null || options === void 0 ? void 0 : options.params
        };
        const response = await axios_1.default.get(url, config);
        return response.data;
    }
    catch (error) {
        const httpError = {
            status: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || 0,
            data: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || {},
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
async function put(url, data, headers, options) {
    var _a, _b;
    try {
        const config = {
            headers,
            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000
        };
        const response = await axios_1.default.put(url, data, config);
        return response.data;
    }
    catch (error) {
        const httpError = {
            status: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || 0,
            data: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || {},
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
async function patch(url, data, headers, options) {
    var _a, _b;
    try {
        const config = {
            headers,
            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000
        };
        const response = await axios_1.default.patch(url, data, config);
        return response.data;
    }
    catch (error) {
        const httpError = {
            status: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || 0,
            data: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || {},
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
async function del(url, headers, options) {
    var _a, _b;
    try {
        const config = {
            headers,
            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000
        };
        const response = await axios_1.default.delete(url, config);
        return response.data;
    }
    catch (error) {
        const httpError = {
            status: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || 0,
            data: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || {},
            message: error.message || 'Unknown error'
        };
        throw httpError;
    }
}
