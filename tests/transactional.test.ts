import { afterEach, describe, expect, it, vi } from 'vitest';
import Metigan, { ApiError } from '../src/index';

const KEY = 'mtg_live_testkey000000000000000000';
const BASE = 'https://api.example.test';

type Call = { url: string; method: string; headers: Record<string, string>; body: any };
type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

function mockFetch(responder: (req: Call, n: number) => Reply) {
  const calls: Call[] = [];
  (globalThis as any).fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    const headers: Record<string, string> = {};
    new Headers(init.headers as HeadersInit).forEach((v, k) => (headers[k] = v));
    const call: Call = {
      url,
      method: (init.method as string) || 'GET',
      headers,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    };
    calls.push(call);
    const r = responder(call, calls.length);
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json', ...r.headers },
    });
  });
  return calls;
}

const client = () => new Metigan({ apiKey: KEY, baseUrl: BASE, enableRateLimit: false, disableLogs: true, retryDelay: 1 });
const queued = { success: true, queued: true, status: 'queued', emailId: 'otp-1', trackingId: 'otp-t' };

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).fetch;
});

describe('transactional sends', () => {
  it('retries a timeout-like 5xx with the same idempotency key', async () => {
    const calls = mockFetch((_, n) => (n === 1 ? { status: 503, body: { error: 'down' } } : { status: 200, body: queued }));
    const res = await client().email.sendOtp({ from: 'auth@loja.co', to: 'ana@x.co', code: 482913, locale: 'en' });
    expect(res.emailId).toBe('otp-1');
    expect(calls).toHaveLength(2);
    const key = calls[0].headers['idempotency-key'];
    expect(key).toBeTruthy();
    expect(calls[1].headers['idempotency-key']).toBe(key);
    expect(calls[0].body).toMatchObject({ to: 'ana@x.co', code: '482913', locale: 'en' });
  });

  it('uses the caller key and a new key per call otherwise', async () => {
    const calls = mockFetch(() => ({ status: 200, body: queued }));
    const m = client();
    await m.email.sendTransactional({ from: 'a@b.co', to: 'x@y.co', subject: 'Reset', html: '<a href="https://x">r</a>', idempotencyKey: 'reset-42' });
    await m.email.sendTransactional({ from: 'a@b.co', to: 'x@y.co', subject: 'Reset', html: 'x' });
    await m.email.sendTransactional({ from: 'a@b.co', to: 'x@y.co', subject: 'Reset', html: 'x' });
    expect(calls[0].headers['idempotency-key']).toBe('reset-42');
    expect(calls[1].headers['idempotency-key']).not.toBe(calls[2].headers['idempotency-key']);
  });

  it('sends variables, text, type and tracking flags', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { success: true, successfulEmails: [] } }));
    await client().email.sendEmail({
      from: 'Loja <hi@loja.co>', recipients: ['a@x.co', 'b@x.co'], templateId: 'tpl1', variables: { name: 'Ana' },
      type: 'transactional', text: 'Oi', trackClicks: false, headers: { 'X-Req': '1' },
    });
    expect(calls[0].body).toMatchObject({
      useTemplate: 'true', templateId: 'tpl1', variables: { name: 'Ana' }, type: 'transactional', text: 'Oi',
      trackClicks: false, headers: { 'X-Req': '1' },
    });
    expect(calls[0].body.subject).toBeUndefined();
    expect(calls[0].headers['idempotency-key']).toBeTruthy();
  });

  it('keeps the status of API errors (429 vs 403)', async () => {
    mockFetch(() => ({ status: 403, body: { error: 'Domain not verified', code: 'domain_not_verified', message: 'Verify it' } }));
    const err = await client().email.sendEmail({ from: 'a@b.co', recipients: ['x@y.co'], subject: 's', content: 'c' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.data.code).toBe('domain_not_verified');
  });

  it('waits a short Retry-After, not a long one', async () => {
    let calls = mockFetch((_, n) => (n === 1 ? { status: 429, body: { error: 'slow' }, headers: { 'retry-after': '0' } } : { status: 200, body: queued }));
    await client().email.sendOtp({ from: 'a@b.co', to: 'x@y.co', code: '1' });
    expect(calls).toHaveLength(2);
    calls = mockFetch(() => ({ status: 429, body: { error: 'Too many OTP requests' }, headers: { 'retry-after': '300' } }));
    await expect(client().email.sendOtp({ from: 'a@b.co', to: 'x@y.co', code: '1' })).rejects.toMatchObject({ status: 429 });
    expect(calls).toHaveLength(1);
  });

  it('getEmailStatus reads the status route', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { success: true, data: { emailId: 'otp-1', status: 'delivered' } } }));
    const st = await client().email.getEmailStatus('otp-1');
    expect(calls[0].url).toBe(`${BASE}/api/email/otp-1`);
    expect(st.status).toBe('delivered');
  });

  it('never puts the API key in the log batch', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { success: true } }));
    const m = new Metigan({ apiKey: KEY, baseUrl: BASE, enableRateLimit: false, retryDelay: 1 });
    await m.email.sendEmail({ from: 'a@b.co', recipients: ['x@y.co'], subject: 's', content: 'c' });
    await new Promise((r) => setTimeout(r, 3500));
    const logs = calls.filter((c) => c.url.endsWith('/api/logs'));
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs.map((l) => l.body))).not.toContain(KEY);
  }, 10000);
});
