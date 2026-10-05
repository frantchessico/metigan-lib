/**
 * Core HTTP client — zero runtime dependencies.
 *
 * Uses the platform `fetch` (Node.js >= 18 and all modern browsers) with
 * `AbortController` for timeouts, exponential-backoff retries for transient
 * failures, and typed error mapping. Shared by every module so request
 * behaviour (auth header, retries, timeouts, error shapes) is identical
 * across the SDK.
 */

import { ApiError, MetiganError } from '../lib/errors';
import {
  API_URL,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
  SDK_VERSION,
} from '../lib/config';

/** HTTP methods the SDK uses. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Options accepted by every module and the unified client. */
export interface HttpClientOptions {
  /** API key. Sent as the `x-api-key` header. */
  apiKey: string;
  /**
   * Base URL of the Metigan API. Defaults to the `METIGAN_API_URL`
   * environment variable, then `https://api.metigan.io`.
   */
  baseUrl?: string;
  /** Per-request timeout in milliseconds (default 30000). */
  timeout?: number;
  /**
   * Retries after the first attempt for transient failures — network
   * errors, timeouts, 5xx, a short 429 (`Retry-After` ≤ 10 s) and an
   * idempotent request still in progress (default 3, so up to 4 attempts).
   */
  retryCount?: number;
  /** Base delay between retries in milliseconds; grows exponentially (default 1000). */
  retryDelay?: number;
}

/** Per-call request options. */
export interface RequestOptions {
  /** Query-string parameters. `undefined`/`null` values are skipped. */
  query?: Record<string, unknown>;
  /** JSON body. Ignored when `form` is set. */
  body?: unknown;
  /** Multipart body. Takes precedence over `body`; the runtime sets the boundary. */
  form?: FormData;
  /** Override the client timeout for this call. */
  timeout?: number;
  /** Caller abort signal, combined with the timeout. */
  signal?: AbortSignal;
  /** Extra request headers (e.g. `Idempotency-Key`). */
  headers?: Record<string, string>;
}

/** Longest `Retry-After` the client waits for by itself. */
const MAX_RETRY_AFTER_MS = 10_000;

function ensureFetch(): void {
  if (typeof fetch === 'undefined') {
    throw new MetiganError(
      'Global fetch is not available. Metigan requires Node.js 18+ or a modern browser. ' +
        'On older runtimes, provide a fetch polyfill (e.g. `globalThis.fetch = require("undici").fetch`).',
    );
  }
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
  const url = baseUrl.replace(/\/+$/, '') + path;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    qs.append(key, String(value));
  }
  const s = qs.toString();
  return s ? `${url}${url.includes('?') ? '&' : '?'}${s}` : url;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Shared HTTP client. One instance is reused across a client's modules.
 */
export class HttpClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retryCount: number;
  private readonly retryDelay: number;

  constructor(options: HttpClientOptions) {
    if (!options.apiKey) {
      throw new MetiganError('API key is required');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || API_URL).replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retryCount = Math.max(0, options.retryCount ?? DEFAULT_RETRY_COUNT);
    this.retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;
  }

  private headers(hasJsonBody: boolean): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/json',
      'x-api-key': this.apiKey,
      'X-Metigan-Client': `metigan-js/${SDK_VERSION}`,
    };
    if (hasJsonBody) h['Content-Type'] = 'application/json';
    return h;
  }

  /**
   * Perform a request with retries, timeout and typed errors.
   * Resolves the parsed JSON body (or `undefined` for an empty 2xx).
   * @throws {ApiError} on a non-2xx response (carries `status` and `data`)
   * @throws {MetiganError} on network failure or timeout
   */
  async request<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
    ensureFetch();
    const url = buildUrl(this.baseUrl, path, opts.query);
    const isForm = opts.form !== undefined;
    const init: RequestInit = { method, headers: { ...this.headers(!isForm && opts.body !== undefined), ...opts.headers } };
    if (isForm) init.body = opts.form as BodyInit;
    else if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    const timeout = opts.timeout ?? this.timeout;
    let lastError: unknown;

    const attempts = this.retryCount + 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      let wait = this.retryDelay * Math.pow(2, attempt);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const onAbort = () => controller.abort();
      if (opts.signal) {
        if (opts.signal.aborted) controller.abort();
        else opts.signal.addEventListener('abort', onAbort, { once: true });
      }
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        const payload = await parseBody(res);
        if (res.ok) return payload as T;

        const retryAfter = retryAfterMs(res.headers.get('retry-after'));
        const code = (payload as { code?: unknown } | undefined)?.code;
        // A short rate-limit window, or the same idempotent request still
        // running on the server: wait and try again.
        if ((res.status === 429 && retryAfter !== null && retryAfter <= MAX_RETRY_AFTER_MS) ||
            (res.status === 409 && code === 'idempotency_in_progress')) {
          lastError = apiError(res.status, payload);
          wait = Math.max(retryAfter ?? 1000, 250);
          if (attempt < attempts - 1) await sleep(wait);
          continue;
        }

        // 4xx: a client error — do not retry, surface immediately.
        if (res.status < 500) throw apiError(res.status, payload);

        // 5xx: transient — retry unless this was the last attempt.
        lastError = apiError(res.status, payload);
      } catch (err) {
        if (err instanceof ApiError && err.status !== undefined && err.status < 500) throw err;
        lastError = toMetiganError(err, opts.signal);
        // A caller-initiated abort is not retryable.
        if (opts.signal?.aborted) throw lastError;
      } finally {
        clearTimeout(timer);
        opts.signal?.removeEventListener('abort', onAbort);
      }
      if (attempt < attempts - 1) await sleep(wait);
    }
    throw lastError instanceof Error
      ? lastError
      : new MetiganError('Request failed after multiple attempts');
  }
}

function retryAfterMs(v: string | null): number | null {
  if (!v) return null;
  const s = Number(v);
  if (Number.isFinite(s)) return Math.max(0, s * 1000);
  const at = Date.parse(v);
  return Number.isNaN(at) ? null : Math.max(0, at - Date.now());
}

/** A random idempotency key (one per logical send, reused by its retries). */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function apiError(status: number, payload: unknown): ApiError {
  const data = (payload ?? {}) as Record<string, unknown>;
  const message =
    (typeof data.message === 'string' && data.message) ||
    (typeof data.error === 'string' && data.error) ||
    `Request failed with status ${status}`;
  const err = new ApiError(message, status);
  err.data = data;
  return err;
}

function toMetiganError(err: unknown, signal?: AbortSignal): MetiganError {
  if (err instanceof MetiganError) return err;
  const aborted = (err as { name?: string })?.name === 'AbortError';
  if (aborted) {
    return new MetiganError(
      signal?.aborted ? 'Request was aborted' : 'Request timed out',
    );
  }
  const message = (err as { message?: string })?.message || 'Unknown error';
  return new MetiganError(`Failed to connect to the Metigan API: ${message}`);
}
