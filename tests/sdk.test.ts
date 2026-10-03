import { afterEach, describe, expect, it, vi } from 'vitest';
import Metigan, {
  MetiganContacts,
  MetiganAudiences,
  MetiganForms,
  Metigan as MetiganClass,
  ApiError,
  MetiganError,
} from '../src/index';

const KEY = 'mtg_live_testkey000000000000000000';
const BASE = 'https://api.example.test';

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

function mockFetch(responder: (req: Call) => { status: number; body?: unknown; contentType?: string }) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const headers: Record<string, string> = {};
    new Headers(init.headers as HeadersInit).forEach((v, k) => (headers[k] = v));
    const call: Call = { url, method: (init.method as string) || 'GET', headers, body: init.body };
    calls.push(call);
    const { status, body, contentType } = responder(call);
    const isJson = contentType ? contentType.includes('json') : typeof body === 'object';
    const text = body === undefined ? '' : isJson ? JSON.stringify(body) : String(body);
    return new Response(text, {
      status,
      headers: { 'content-type': contentType || (isJson ? 'application/json' : 'text/plain') },
    });
  });
  (globalThis as any).fetch = fn;
  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).fetch;
});

describe('client surface', () => {
  it('exposes every module from the unified client', () => {
    const m = new Metigan({ apiKey: KEY, baseUrl: BASE });
    expect(m.email).toBeDefined();
    expect(m.forms).toBeDefined();
    expect(m.contacts).toBeDefined();
    expect(m.audiences).toBeDefined();
    expect(m.templates).toBeDefined();
    expect(MetiganClass).toBe(Metigan);
  });

  it('requires an API key', () => {
    expect(() => new Metigan({ apiKey: '' })).toThrow(MetiganError);
  });
});

describe('HttpClient behaviour', () => {
  it('sends the api key header and honours baseUrl', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { contacts: [] } }));
    const contacts = new MetiganContacts({ apiKey: KEY, baseUrl: BASE });
    await contacts.list({ audienceId: 'a1' });
    expect(calls[0].url).toBe(`${BASE}/api/contacts?audienceId=a1`);
    expect(calls[0].headers['x-api-key']).toBe(KEY);
    expect(calls[0].method).toBe('GET');
  });

  it('throws ApiError with status+data on 4xx and does not retry', async () => {
    const calls = mockFetch(() => ({ status: 400, body: { error: 'bad', message: 'Invalid thing' } }));
    const contacts = new MetiganContacts({ apiKey: KEY, baseUrl: BASE });
    await expect(contacts.get('c1')).rejects.toMatchObject({ name: 'ApiError', status: 400, message: 'Invalid thing' });
    const err = await contacts.get('c2').catch((e) => e);
    expect((err as ApiError).data).toMatchObject({ error: 'bad' });
    expect(calls.length).toBe(2); // one per call, no retry on 4xx
  });

  it('retries on 5xx then throws', async () => {
    const calls = mockFetch(() => ({ status: 503, body: { error: 'down' } }));
    const contacts = new MetiganContacts({ apiKey: KEY, baseUrl: BASE, retryCount: 3, retryDelay: 1 });
    await expect(contacts.get('c1')).rejects.toBeInstanceOf(ApiError);
    expect(calls.length).toBe(3); // retried up to retryCount
  });

  it('maps network failure to MetiganError', async () => {
    (globalThis as any).fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const contacts = new MetiganContacts({ apiKey: KEY, baseUrl: BASE, retryCount: 1 });
    await expect(contacts.get('c1')).rejects.toBeInstanceOf(MetiganError);
  });
});

describe('bug fixes', () => {
  it('contacts.export(csv) returns raw CSV text', async () => {
    mockFetch(() => ({ status: 200, body: 'email,name\na@b.co,A', contentType: 'text/csv' }));
    const contacts = new MetiganContacts({ apiKey: KEY, baseUrl: BASE });
    const csv = await contacts.export('aud1', 'csv');
    expect(typeof csv).toBe('string');
    expect(csv).toContain('a@b.co');
  });

  it('contacts.export(json) returns the contacts array with id normalized', async () => {
    mockFetch(() => ({ status: 200, body: { data: [{ _id: 'x1', email: 'a@b.co' }] } }));
    const contacts = new MetiganContacts({ apiKey: KEY, baseUrl: BASE });
    const list = await contacts.export('aud1', 'json');
    expect(Array.isArray(list)).toBe(true);
    expect((list as any[])[0].id).toBe('x1');
  });

  it('mirrors _id to id on a contact', async () => {
    mockFetch(() => ({ status: 200, body: { _id: 'c123', email: 'a@b.co' } }));
    const contacts = new MetiganContacts({ apiKey: KEY, baseUrl: BASE });
    const c = await contacts.get('c123');
    expect((c as any).id).toBe('c123');
  });

  it('mirrors _id to id on an audience (create → chainable by id)', async () => {
    mockFetch(() => ({ status: 200, body: { _id: 'aud9', name: 'News' } }));
    const audiences = new MetiganAudiences({ apiKey: KEY, baseUrl: BASE });
    const a = await audiences.create({ name: 'News' });
    expect((a as any).id).toBe('aud9');
  });
});

describe('email + forms shaping', () => {
  it('sendEmail posts JSON to /api/email/send and parses the response', async () => {
    const calls = mockFetch(() => ({
      status: 200,
      body: { success: true, successfulEmails: [{ recipient: 'x@y.co', trackingId: 't1' }] },
    }));
    const m = new Metigan({ apiKey: KEY, baseUrl: BASE, enableRateLimit: false, disableLogs: true });
    const res = await m.email.sendEmail({
      from: 'A <a@b.co>',
      recipients: ['x@y.co'],
      subject: 'Hi',
      content: '<p>hi</p>',
    });
    expect(calls[0].url).toBe(`${BASE}/api/email/send`);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['content-type']).toContain('application/json');
    const sent = JSON.parse(calls[0].body as string);
    expect(sent.from).toBe('A <a@b.co>');
    expect(sent.recipients).toEqual(['x@y.co']);
    expect((res as any).success).toBe(true);
  });

  it('sendOtp and sendTransactional hit the fast-lane endpoints', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { success: true } }));
    const m = new Metigan({ apiKey: KEY, baseUrl: BASE, enableRateLimit: false, disableLogs: true });
    await m.email.sendOtp({ from: 'a@b.co', to: 'x@y.co', code: '123456' });
    await m.email.sendTransactional({ from: 'a@b.co', to: 'x@y.co', subject: 'Receipt', content: 'ok' });
    expect(calls[0].url).toBe(`${BASE}/api/otp/send`);
    expect(calls[1].url).toBe(`${BASE}/api/transactional/send`);
  });

  it('forms.listForms returns the paginated shape', async () => {
    mockFetch(() => ({ status: 200, body: { forms: [{ id: 'form-1', title: 'T' }], pagination: { page: 1 } } }));
    const forms = new MetiganForms({ apiKey: KEY, baseUrl: BASE });
    const res = await forms.listForms({ page: 1, limit: 10 });
    expect(res.forms[0].id).toBe('form-1');
  });
});
