/**
 * Metigan Suppressions Module
 * Read and manage the account's suppression list: the addresses Metigan
 * does not send to (bounces, spam complaints, unsubscribes and the ones you
 * block). The list applies to every send; keep it in sync with your CRM.
 * @version 2.5.0
 */

import { HttpClient, type HttpMethod } from '../core/client';
import { ApiError, MetiganError } from './errors';
import type { TemplateModuleOptions } from './types';

/** Why an address is suppressed. */
export type SuppressionReason = 'hard_bounce' | 'soft_bounce' | 'complaint' | 'unsubscribe' | 'manual' | 'invalid_format';

/**
 * What its owner may do with a suppression:
 * - `allowed`: remove freely (bounces, manual, invalid);
 * - `consent_required`: an unsubscribe, removed only with `consent: true`;
 * - `support_only`: a spam complaint, removed only by Metigan support.
 */
export type SuppressionPolicy = 'allowed' | 'consent_required' | 'support_only';

export interface Suppression {
  email: string;
  reason: SuppressionReason;
  /** Where it came from: bounce_handler, complaint_handler, unsubscribe_link, api, dashboard… */
  source: string;
  createdAt: string;
  updatedAt: string;
  /** Temporary suppressions (soft bounces) end here. */
  expiresAt?: string;
  /** DSN status of the bounce, e.g. "5.1.1". */
  bounceCode?: string;
  /** The receiving server's response. */
  diagnostic?: string;
  messageId?: string;
  /** The email that caused it, while its tracking is kept. */
  message?: { messageId: string; emailId: string; subject: string; sentAt: string };
  policy: SuppressionPolicy;
}

export interface SuppressionListOptions {
  page?: number;
  /** 1–200 (default 50). */
  limit?: number;
  reason?: SuppressionReason;
  source?: string;
  /** Substring of the address; "@company.com" matches a whole domain. */
  search?: string;
  /** Date suppressed, from (inclusive), YYYY-MM-DD or ISO 8601. */
  from?: string | Date;
  /** Date suppressed, to (inclusive day), YYYY-MM-DD or ISO 8601. */
  to?: string | Date;
  sort?: 'newest' | 'oldest' | 'email';
}

export interface SuppressionListResponse {
  success: boolean;
  data: Suppression[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
  summary: { total: number; byReason: Record<SuppressionReason, number> };
}

export interface SuppressionHistoryEntry {
  id: string;
  email: string;
  action: 'added' | 'removed';
  reason: SuppressionReason;
  source?: string;
  actor: string;
  consent?: boolean;
  note?: string;
  at: string;
}

export interface SuppressionDetail {
  email: string;
  suppressed: boolean;
  suppression?: Suppression;
  history: SuppressionHistoryEntry[];
}

export interface AddSuppressionsOptions {
  /** `manual` (never send, default) or `unsubscribe` (blocks campaigns, keeps transactional email). */
  reason?: 'manual' | 'unsubscribe';
  /** Kept in the suppression history (≤ 500 characters). */
  note?: string;
}

export interface AddSuppressionsResult {
  added: string[];
  /** Addresses already suppressed, with the reason they keep. */
  alreadySuppressed: Record<string, SuppressionReason>;
  invalid: string[];
}

export interface RemoveSuppressionOptions {
  /** Required to remove an unsubscribe: the recipient opted in again. */
  consent?: boolean;
  note?: string;
}

export interface RemoveSuppressionsResult {
  removed: string[];
  notFound: string[];
  supportOnly: string[];
  consentRequired: string[];
  invalid: string[];
}

/** Addresses per request accepted by the API; larger inputs are split. */
const BATCH = 1000;

function day(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * MetiganSuppressions - Manage the suppression list
 */
export class MetiganSuppressions {
  private http: HttpClient;

  constructor(options: TemplateModuleOptions) {
    this.http = new HttpClient(options);
  }

  private request<T>(method: HttpMethod, endpoint: string, data?: unknown): Promise<T> {
    return this.http.request<T>(method, endpoint, { body: data });
  }

  /**
   * List suppressed addresses.
   *
   * @example
   * ```typescript
   * const { data, summary } = await metigan.suppressions.list({ reason: 'hard_bounce', search: '@acme.com' });
   * ```
   */
  async list(options: SuppressionListOptions = {}): Promise<SuppressionListResponse> {
    const p = new URLSearchParams();
    if (options.page) p.set('page', String(options.page));
    if (options.limit) p.set('limit', String(options.limit));
    if (options.reason) p.set('reason', options.reason);
    if (options.source) p.set('source', options.source);
    if (options.search) p.set('search', options.search);
    if (options.from) p.set('from', day(options.from));
    if (options.to) p.set('to', day(options.to));
    if (options.sort) p.set('sort', options.sort);
    const qs = p.toString();
    return this.request<SuppressionListResponse>('GET', `/api/suppressions${qs ? `?${qs}` : ''}`);
  }

  /**
   * Look an address up: whether it is suppressed, why, and the changes made to it.
   */
  async get(email: string): Promise<SuppressionDetail> {
    if (!email) throw new MetiganError('Email is required');
    const res = await this.request<{ success: boolean; data: SuppressionDetail }>('GET', `/api/suppressions/${encodeURIComponent(email)}`);
    return res.data;
  }

  /**
   * Whether Metigan would refuse to send to `email`.
   *
   * @example
   * ```typescript
   * if (await metigan.suppressions.isSuppressed('ana@example.com')) { … }
   * ```
   */
  async isSuppressed(email: string): Promise<boolean> {
    return (await this.get(email)).suppressed;
  }

  /**
   * Suppress addresses (any number: sent in batches of 1000). Addresses
   * already suppressed keep their reason.
   *
   * @example
   * ```typescript
   * // Opt-outs recorded in your CRM:
   * await metigan.suppressions.add(['ana@example.com'], { reason: 'unsubscribe' });
   * ```
   */
  async add(emails: string | string[], options: AddSuppressionsOptions = {}): Promise<AddSuppressionsResult> {
    const list = (Array.isArray(emails) ? emails : [emails]).filter((e) => typeof e === 'string' && e.trim() !== '');
    if (list.length === 0) throw new MetiganError('At least one email is required');
    const out: AddSuppressionsResult = { added: [], alreadySuppressed: {}, invalid: [] };
    for (let i = 0; i < list.length; i += BATCH) {
      const res = await this.request<{ success: boolean; data: AddSuppressionsResult }>('POST', '/api/suppressions', {
        emails: list.slice(i, i + BATCH),
        reason: options.reason ?? 'manual',
        note: options.note,
      });
      out.added.push(...res.data.added);
      Object.assign(out.alreadySuppressed, res.data.alreadySuppressed);
      out.invalid.push(...res.data.invalid);
    }
    return out;
  }

  /**
   * Remove one address from the list. Throws an ApiError with status 409
   * (`consent_required`) for an unsubscribe without `consent: true`, 403
   * (`support_only`) for a spam complaint and 404 when not suppressed.
   */
  async remove(email: string, options: RemoveSuppressionOptions = {}): Promise<Suppression> {
    if (!email) throw new MetiganError('Email is required');
    const p = new URLSearchParams();
    if (options.consent) p.set('consent', 'true');
    if (options.note) p.set('note', options.note);
    const qs = p.toString();
    const res = await this.request<{ success: boolean; data: Suppression }>(
      'DELETE',
      `/api/suppressions/${encodeURIComponent(email)}${qs ? `?${qs}` : ''}`,
    );
    return res.data;
  }

  /**
   * Remove several addresses; each follows its removal policy and the
   * result says what happened to every one (never throws for policy).
   */
  async removeMany(emails: string[], options: RemoveSuppressionOptions = {}): Promise<RemoveSuppressionsResult> {
    const list = emails.filter((e) => typeof e === 'string' && e.trim() !== '');
    const out: RemoveSuppressionsResult = { removed: [], notFound: [], supportOnly: [], consentRequired: [], invalid: [] };
    for (let i = 0; i < list.length; i += BATCH) {
      const res = await this.request<{ success: boolean; data: RemoveSuppressionsResult }>('POST', '/api/suppressions/remove', {
        emails: list.slice(i, i + BATCH),
        consent: options.consent ?? false,
        note: options.note,
      });
      for (const k of Object.keys(out) as (keyof RemoveSuppressionsResult)[]) out[k].push(...res.data[k]);
    }
    return out;
  }
}

/** True when `err` is the API refusing to remove a suppression for policy. */
export function isSuppressionPolicyError(err: unknown): err is ApiError {
  return err instanceof ApiError && (err.status === 403 || err.status === 409);
}
