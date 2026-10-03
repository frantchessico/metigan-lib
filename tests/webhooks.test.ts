import { describe, expect, it } from 'vitest';
import Metigan, {
  verifyWebhook,
  isWebhookEvent,
  WebhookSignatureError,
  WEBHOOK_EVENT_NAMES,
  type AnyWebhookEvent,
} from '../src/index';

const SECRET = 'whsec_' + 'a'.repeat(64);

// Mirror the server's signing scheme so the tests prove interop:
//   v1 = hex(HMAC-SHA256(secret, `${t}.${rawBody}`)), key = the whsec_ string.
async function sign(secret: string, t: number, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function signedHeaders(secret: string, t: number, body: string) {
  const v1 = await sign(secret, t, body);
  return {
    'x-webhook-signature': `t=${t},v1=${v1}`,
    'x-webhook-id': 'msg_test_1',
    'x-webhook-timestamp': String(t),
  };
}

const NOW = 1_700_000_000;
const DELIVERED_BODY = JSON.stringify({
  event: 'email.delivered',
  messageId: '2dc8839a-e62b-4e64-b054-ac1c9ca69a58',
  data: {
    recipient: 'jane@example.com',
    subject: 'Welcome!',
    status: 'delivered',
    timestamp: '2026-10-03T15:10:31.746Z',
    metadata: { dsn: '2.0.0', queueId: '4hxpxM0', statusDetail: '250 OK' },
  },
  timestamp: NOW * 1000,
});

describe('verifyWebhook', () => {
  it('verifies a valid signature and returns the typed event', async () => {
    const headers = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    const event = await verifyWebhook(DELIVERED_BODY, {
      headers,
      secret: SECRET,
      nowSeconds: NOW,
    });
    expect(event.event).toBe('email.delivered');
    expect(event.messageId).toBe('2dc8839a-e62b-4e64-b054-ac1c9ca69a58');
    if (isWebhookEvent(event, 'email.delivered')) {
      expect(event.data.recipient).toBe('jane@example.com');
      expect(event.data.metadata.queueId).toBe('4hxpxM0');
    } else {
      throw new Error('narrowing failed');
    }
  });

  it('accepts a Buffer / Uint8Array body', async () => {
    const headers = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    const bytes = new TextEncoder().encode(DELIVERED_BODY);
    const event = await verifyWebhook(bytes, { headers, secret: SECRET, nowSeconds: NOW });
    expect(event.event).toBe('email.delivered');
  });

  it('accepts a fetch Headers instance', async () => {
    const h = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    const headers = new Headers(h);
    const event = await verifyWebhook(DELIVERED_BODY, { headers, secret: SECRET, nowSeconds: NOW });
    expect(event.event).toBe('email.delivered');
  });

  it('accepts the raw signature without a headers object', async () => {
    const v1 = await sign(SECRET, NOW, DELIVERED_BODY);
    const event = await verifyWebhook(DELIVERED_BODY, {
      signature: `t=${NOW},v1=${v1}`,
      secret: SECRET,
      nowSeconds: NOW,
    });
    expect(event.event).toBe('email.delivered');
  });

  it('rejects a tampered body', async () => {
    const headers = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    const tampered = DELIVERED_BODY.replace('jane@example.com', 'attacker@evil.com');
    await expect(
      verifyWebhook(tampered, { headers, secret: SECRET, nowSeconds: NOW }),
    ).rejects.toMatchObject({ name: 'WebhookSignatureError', reason: 'no_signature_match' });
  });

  it('rejects a wrong secret', async () => {
    const headers = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    await expect(
      verifyWebhook(DELIVERED_BODY, {
        headers,
        secret: 'whsec_' + 'b'.repeat(64),
        nowSeconds: NOW,
      }),
    ).rejects.toMatchObject({ reason: 'no_signature_match' });
  });

  it('rejects a stale timestamp (replay)', async () => {
    const old = NOW - 3600;
    const headers = await signedHeaders(SECRET, old, DELIVERED_BODY);
    await expect(
      verifyWebhook(DELIVERED_BODY, { headers, secret: SECRET, nowSeconds: NOW }),
    ).rejects.toMatchObject({ reason: 'timestamp_out_of_tolerance' });
  });

  it('skips the timestamp check when toleranceSeconds is 0', async () => {
    const old = NOW - 3600;
    const headers = await signedHeaders(SECRET, old, DELIVERED_BODY);
    const event = await verifyWebhook(DELIVERED_BODY, {
      headers,
      secret: SECRET,
      nowSeconds: NOW,
      toleranceSeconds: 0,
    });
    expect(event.event).toBe('email.delivered');
  });

  it('throws missing_secret when no secret is given', async () => {
    const headers = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    await expect(
      verifyWebhook(DELIVERED_BODY, { headers } as any),
    ).rejects.toMatchObject({ reason: 'missing_secret' });
  });

  it('throws missing_signature when the header is absent', async () => {
    await expect(
      verifyWebhook(DELIVERED_BODY, { headers: {}, secret: SECRET }),
    ).rejects.toMatchObject({ reason: 'missing_signature' });
  });

  it('throws invalid_payload for a validly-signed non-JSON body', async () => {
    const body = 'not json';
    const v1 = await sign(SECRET, NOW, body);
    await expect(
      verifyWebhook(body, { signature: `t=${NOW},v1=${v1}`, secret: SECRET, nowSeconds: NOW }),
    ).rejects.toMatchObject({ reason: 'invalid_payload' });
  });

  it('is a WebhookSignatureError instance', async () => {
    const err = await verifyWebhook(DELIVERED_BODY, { headers: {}, secret: SECRET }).catch((e) => e);
    expect(err).toBeInstanceOf(WebhookSignatureError);
  });
});

describe('MetiganWebhooks on the unified client', () => {
  it('uses the client default secret', async () => {
    const metigan = new Metigan({ apiKey: 'mtg_live_x'.padEnd(32, '0'), webhookSecret: SECRET });
    const headers = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    const event = await metigan.webhooks.verify(DELIVERED_BODY, { headers, nowSeconds: NOW });
    expect(event.event).toBe('email.delivered');
    expect(metigan.webhooks.events).toEqual(WEBHOOK_EVENT_NAMES);
  });

  it('lets a per-call secret override the default', async () => {
    const metigan = new Metigan({ apiKey: 'mtg_live_x'.padEnd(32, '0'), webhookSecret: 'whsec_' + 'c'.repeat(64) });
    const headers = await signedHeaders(SECRET, NOW, DELIVERED_BODY);
    const event = await metigan.webhooks.verify(DELIVERED_BODY, {
      headers,
      secret: SECRET,
      nowSeconds: NOW,
    });
    expect(event.event).toBe('email.delivered');
  });
});

describe('event catalog', () => {
  it('exposes the 13 event names', () => {
    expect(WEBHOOK_EVENT_NAMES).toHaveLength(13);
    expect(WEBHOOK_EVENT_NAMES).toContain('email.sent');
    expect(WEBHOOK_EVENT_NAMES).toContain('audience.deleted');
  });
});
