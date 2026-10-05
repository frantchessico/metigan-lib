import { afterEach, describe, expect, it, vi } from 'vitest';
import Metigan, { ApiError, isSuppressionPolicyError } from '../src/index';

const KEY = 'mtg_live_testkey000000000000000000';
const BASE = 'https://api.example.test';

type Call = { url: string; method: string; body: any };

function mockFetch(responder: (c: Call) => { status: number; body: unknown }) {
  const calls: Call[] = [];
  (globalThis as any).fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    const call = { url, method: (init.method as string) || 'GET', body: init.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const { status, body } = responder(call);
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  });
  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).fetch;
});

describe('suppressions', () => {
  const m = () => new Metigan({ apiKey: KEY, baseUrl: BASE, retryCount: 0 });

  it('lists with filters', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { success: true, data: [], pagination: {}, summary: { total: 0, byReason: {} } } }));
    await m().suppressions.list({ reason: 'hard_bounce', search: '@acme.com', page: 2, limit: 10, sort: 'oldest', from: '2026-10-01' });
    const u = new URL(calls[0].url);
    expect(u.pathname).toBe('/api/suppressions');
    expect(Object.fromEntries(u.searchParams)).toEqual({ reason: 'hard_bounce', search: '@acme.com', page: '2', limit: '10', sort: 'oldest', from: '2026-10-01' });
  });

  it('adds in batches of 1000 and merges the results', async () => {
    const calls = mockFetch((c) => ({
      status: 201,
      body: { success: true, data: { added: c.body.emails.slice(0, 1), alreadySuppressed: { [c.body.emails[1]]: 'complaint' }, invalid: [] } },
    }));
    const emails = Array.from({ length: 2500 }, (_, i) => `u${i}@x.com`);
    const r = await m().suppressions.add(emails, { reason: 'unsubscribe', note: 'crm sync' });
    expect(calls).toHaveLength(3);
    expect(calls[0].body).toMatchObject({ reason: 'unsubscribe', note: 'crm sync' });
    expect(calls[0].body.emails).toHaveLength(1000);
    expect(calls[2].body.emails).toHaveLength(500);
    expect(r.added).toEqual(['u0@x.com', 'u1000@x.com', 'u2000@x.com']);
    expect(Object.keys(r.alreadySuppressed)).toHaveLength(3);
  });

  it('checks and removes with consent; policy errors are recognisable', async () => {
    const calls = mockFetch((c) => {
      if (c.method === 'GET') return { status: 200, body: { success: true, data: { email: 'a@x.com', suppressed: true, history: [] } } };
      if (c.url.includes('consent=true')) return { status: 200, body: { success: true, data: { email: 'a@x.com', reason: 'unsubscribe' } } };
      return { status: 409, body: { success: false, code: 'consent_required', error: 'consent required' } };
    });
    expect(await m().suppressions.isSuppressed('a@x.com')).toBe(true);
    expect(calls[0].url).toBe(`${BASE}/api/suppressions/a%40x.com`);
    const err = await m().suppressions.remove('a@x.com').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(isSuppressionPolicyError(err)).toBe(true);
    const removed = await m().suppressions.remove('a@x.com', { consent: true, note: 'opted in' });
    expect(removed.reason).toBe('unsubscribe');
    expect(calls.at(-1)!.url).toContain('consent=true&note=opted+in');
  });

  it('removeMany merges every batch', async () => {
    mockFetch((c) => ({ status: 200, body: { success: true, data: { removed: c.body.emails, notFound: [], supportOnly: [], consentRequired: [], invalid: [] } } }));
    const r = await m().suppressions.removeMany(Array.from({ length: 1001 }, (_, i) => `r${i}@x.com`));
    expect(r.removed).toHaveLength(1001);
  });

  it('validates input', async () => {
    await expect(m().suppressions.add([])).rejects.toThrow('At least one email');
    await expect(m().suppressions.get('')).rejects.toThrow('Email is required');
  });
});
