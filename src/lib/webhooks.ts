/**
 * Webhook signature verification.
 *
 * Metigan signs every webhook delivery so you can prove it came from us and
 * was not tampered with. This module verifies that signature and returns the
 * typed event — with **zero runtime dependencies**, using the Web Crypto API
 * so it runs identically in Node.js (18+), edge runtimes and the browser.
 *
 * The signature scheme (sent on every delivery):
 *
 *   X-Webhook-Signature: t=<unix-seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<rawBody>")>
 *   X-Webhook-Id:        <delivery id>
 *   X-Webhook-Timestamp: <unix-seconds>
 *
 * The HMAC key is the signing secret **verbatim** (the literal `whsec_…`
 * string), and the signed message is the exact bytes of the request body with
 * the timestamp and a dot prepended. Always verify against the **raw** body:
 * re-serialising the parsed JSON can change bytes (key order, spacing) and
 * break the signature.
 *
 * @example
 * ```ts
 * import { verifyWebhook, WebhookSignatureError } from 'metigan';
 *
 * // Express — note express.raw() so req.body is the raw Buffer
 * app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
 *   try {
 *     const event = await verifyWebhook(req.body, {
 *       headers: req.headers,
 *       secret: process.env.METIGAN_WEBHOOK_SECRET!,
 *     });
 *     if (event.event === 'email.bounced') {
 *       console.log('bounced:', event.data.recipient);
 *     }
 *     res.sendStatus(204);
 *   } catch (err) {
 *     if (err instanceof WebhookSignatureError) return res.sendStatus(400);
 *     throw err;
 *   }
 * });
 * ```
 */

import { WebhookSignatureError } from './errors';

// ---------------------------------------------------------------------------
// Event types (generated from the backend event catalog)
// ---------------------------------------------------------------------------

/** Metadata attached to email engagement events; keys depend on the event. */
export interface EmailEventMetadata {
  ip?: string;
  userAgent?: string;
  device?: string;
  /** Clicked URL (`email.clicked`). */
  url?: string;
  /** Bounce detail (`email.bounced`). */
  bounceReason?: string;
  /** Delivery-status fields (`email.delivered`). */
  dsn?: string;
  queueId?: string;
  statusDetail?: string;
  [key: string]: unknown;
}

/** `data` for `email.sent`. */
export interface EmailSentData {
  to: string;
  from: string;
  subject: string;
  emailId: string;
  messageId: string;
  trackingId: string;
  hasAttachments: boolean;
  attachmentsCount: number;
  timestamp: string;
}

/** `data` for `email.delivered`, `.opened`, `.clicked`, `.bounced`, `.complained`. */
export interface EmailDeliveryData {
  recipient: string;
  subject: string;
  /** Mirrors the event name without the `email.` prefix (e.g. `"opened"`). */
  status: string;
  timestamp: string;
  metadata: EmailEventMetadata;
}

/** `data` for `email.unsubscribed`. */
export interface EmailUnsubscribedData {
  email: string;
  timestamp: string;
}

/** `data` for `email.failed`. */
export interface EmailFailedData {
  to: string;
  emailId: string;
  reason: string;
}

/** `data` for `contact.created`. */
export interface ContactCreatedData {
  contactId: string;
  email: string;
  audienceId: string;
  userId: string;
}

/**
 * `data` for dashboard-reported events (`audience.*`, `contact.deleted`).
 * These carry the object the dashboard acted on, so the shape is best-effort
 * (only `userId` is guaranteed to be the account that owns the webhook).
 */
export interface DashboardObjectData {
  _id?: string;
  name?: string;
  userId?: string;
  [key: string]: unknown;
}

/** Maps each event name to the type of its `data` field. */
export interface WebhookEventDataMap {
  'email.sent': EmailSentData;
  'email.delivered': EmailDeliveryData;
  'email.opened': EmailDeliveryData;
  'email.clicked': EmailDeliveryData;
  'email.bounced': EmailDeliveryData;
  'email.complained': EmailDeliveryData;
  'email.unsubscribed': EmailUnsubscribedData;
  'email.failed': EmailFailedData;
  'contact.created': ContactCreatedData;
  'contact.deleted': DashboardObjectData;
  'audience.created': DashboardObjectData;
  'audience.updated': DashboardObjectData;
  'audience.deleted': DashboardObjectData;
}

/** Every event name Metigan can deliver. */
export type WebhookEventName = keyof WebhookEventDataMap;

/** The names as a runtime array (handy for subscribing to "all" events). */
export const WEBHOOK_EVENT_NAMES: readonly WebhookEventName[] = [
  'email.sent',
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
  'email.unsubscribed',
  'email.failed',
  'contact.created',
  'contact.deleted',
  'audience.created',
  'audience.updated',
  'audience.deleted',
];

/** A delivered webhook body, parsed. */
export interface WebhookEvent<K extends WebhookEventName = WebhookEventName> {
  /** Event name, e.g. `"email.delivered"`. */
  event: K;
  /** The message/entity the event is about. */
  messageId: string;
  /** Event-specific payload (see {@link WebhookEventDataMap}). */
  data: WebhookEventDataMap[K];
  /** When Metigan emitted the event, in **milliseconds** since the epoch. */
  timestamp: number;
}

/** The discriminated union of all known events; narrow it on `event`. */
export type AnyWebhookEvent = {
  [K in WebhookEventName]: WebhookEvent<K>;
}[WebhookEventName];

/**
 * Type guard that narrows a verified event to a specific name.
 *
 * @example
 * ```ts
 * if (isWebhookEvent(event, 'email.clicked')) {
 *   console.log(event.data.metadata.url); // fully typed
 * }
 * ```
 */
export function isWebhookEvent<K extends WebhookEventName>(
  event: WebhookEvent,
  name: K,
): event is WebhookEvent<K> {
  return event.event === name;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** Anything a raw request body can arrive as. */
export type RawBody = string | Uint8Array | ArrayBuffer | ArrayBufferView;

/** A `Headers`-like object: a `fetch` Headers, a Node `req.headers`, or a Map. */
export type HeadersLike =
  | { get(name: string): string | null | undefined }
  | Record<string, string | string[] | undefined>
  | Map<string, string>;

/** Options for {@link verifyWebhook}. */
export interface VerifyWebhookOptions {
  /** The signing secret (`whsec_…`) shown once when the webhook was created. */
  secret?: string;
  /**
   * The headers of the incoming request. Lookups are case-insensitive, so a
   * raw Node `req.headers`, a `fetch` `Headers`, or a plain object all work.
   * Provide this, or pass {@link signature} directly.
   */
  headers?: HeadersLike;
  /** The `X-Webhook-Signature` value, if you are not passing {@link headers}. */
  signature?: string;
  /** The `X-Webhook-Timestamp` value; only needed if the signature omits `t=`. */
  timestamp?: string | number;
  /**
   * Reject events whose timestamp differs from now by more than this many
   * seconds (replay protection). Default `300` (5 minutes). Set `0` to skip
   * the timestamp check.
   */
  toleranceSeconds?: number;
  /** Override "now" (unix seconds), for testing. */
  nowSeconds?: number;
}

const DEFAULT_TOLERANCE_SECONDS = 300;
const encoder = new TextEncoder();

/**
 * Verify a webhook signature and return the typed event.
 *
 * Throws {@link WebhookSignatureError} for every failure mode (missing/invalid
 * signature, stale timestamp, mismatch, non-JSON body) — reject the request
 * when it throws and never read the payload.
 *
 * @param rawBody The **exact** request body bytes. Do not re-serialise.
 * @param options Secret, headers (or raw signature), and tolerance.
 * @returns The parsed, verified event.
 */
export async function verifyWebhook(
  rawBody: RawBody,
  options: VerifyWebhookOptions,
): Promise<AnyWebhookEvent> {
  const secret = options.secret;
  if (!secret) {
    throw new WebhookSignatureError(
      'A signing secret is required to verify the webhook.',
      'missing_secret',
    );
  }

  const signatureHeader =
    options.signature ?? getHeader(options.headers, 'x-webhook-signature');
  if (!signatureHeader) {
    throw new WebhookSignatureError(
      'Missing the X-Webhook-Signature header.',
      'missing_signature',
    );
  }

  const parsed = parseSignatureHeader(signatureHeader);
  const headerTs =
    options.timestamp ?? getHeader(options.headers, 'x-webhook-timestamp');
  const timestamp = parsed.timestamp ?? toNumber(headerTs);
  if (parsed.signatures.length === 0) {
    throw new WebhookSignatureError(
      'The X-Webhook-Signature header has no v1 signature.',
      'invalid_signature_format',
    );
  }

  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (tolerance > 0) {
    if (timestamp === undefined) {
      throw new WebhookSignatureError(
        'The signature has no timestamp; cannot enforce the tolerance window.',
        'invalid_signature_format',
      );
    }
    const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      throw new WebhookSignatureError(
        'The webhook timestamp is outside the tolerance window.',
        'timestamp_out_of_tolerance',
      );
    }
  }

  const bodyBytes = toBytes(rawBody);
  // Signed message = "<t>." + body. Use the timestamp the signature carried
  // (or the header) so we recompute exactly what the sender signed.
  const signedTs = parsed.timestamp ?? timestamp;
  if (signedTs === undefined) {
    throw new WebhookSignatureError(
      'The signature has no timestamp to verify against.',
      'invalid_signature_format',
    );
  }
  const expected = await hmacSha256Hex(secret, signedTs, bodyBytes);

  const matched = parsed.signatures.some((candidate) =>
    constantTimeEqual(candidate, expected),
  );
  if (!matched) {
    throw new WebhookSignatureError(
      'No signature in the header matched the computed signature.',
      'no_signature_match',
    );
  }

  let event: unknown;
  try {
    event = JSON.parse(bytesToUtf8(bodyBytes));
  } catch {
    throw new WebhookSignatureError(
      'The webhook body is not valid JSON.',
      'invalid_payload',
    );
  }
  if (!event || typeof event !== 'object' || typeof (event as any).event !== 'string') {
    throw new WebhookSignatureError(
      'The webhook body is not a Metigan event.',
      'invalid_payload',
    );
  }
  return event as AnyWebhookEvent;
}

/** Options for a {@link MetiganWebhooks} instance. */
export interface MetiganWebhooksOptions {
  /** Default signing secret, overridable per {@link MetiganWebhooks.verify}. */
  secret?: string;
  /** Default timestamp tolerance in seconds (default 300). */
  toleranceSeconds?: number;
}

/**
 * Webhook helpers, exposed as `metigan.webhooks` on the unified client.
 *
 * @example
 * ```ts
 * const metigan = new Metigan({ apiKey, webhookSecret: process.env.WH_SECRET });
 * const event = await metigan.webhooks.verify(rawBody, { headers });
 * ```
 */
export class MetiganWebhooks {
  /** Every event name Metigan can deliver. */
  readonly events: readonly WebhookEventName[] = WEBHOOK_EVENT_NAMES;

  constructor(private readonly options: MetiganWebhooksOptions = {}) {}

  /**
   * Verify a webhook signature and return the typed event. The secret and
   * tolerance fall back to the ones this client was created with.
   */
  verify(
    rawBody: RawBody,
    options: Omit<VerifyWebhookOptions, 'secret'> & { secret?: string } = {},
  ): Promise<AnyWebhookEvent> {
    return verifyWebhook(rawBody, {
      ...options,
      secret: options.secret ?? this.options.secret,
      toleranceSeconds: options.toleranceSeconds ?? this.options.toleranceSeconds,
    });
  }

  /** Narrow a verified event to a specific name (re-export of {@link isWebhookEvent}). */
  is<K extends WebhookEventName>(event: WebhookEvent, name: K): event is WebhookEvent<K> {
    return isWebhookEvent(event, name);
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface ParsedSignature {
  timestamp?: number;
  /** All v1 hex signatures found (Metigan sends one; multiple are tolerated). */
  signatures: string[];
}

/** Parse `t=<n>,v1=<hex>` (comma- or space-separated; tolerant of a bare hex). */
function parseSignatureHeader(header: string): ParsedSignature {
  const out: ParsedSignature = { signatures: [] };
  const tokens = header.split(/[\s,]+/).filter(Boolean);
  let sawScheme = false;
  for (const token of tokens) {
    const eq = token.indexOf('=');
    if (eq === -1) continue;
    const key = token.slice(0, eq);
    const value = token.slice(eq + 1);
    if (key === 't') {
      sawScheme = true;
      const n = toNumber(value);
      if (n !== undefined) out.timestamp = n;
    } else if (key === 'v1') {
      sawScheme = true;
      if (value) out.signatures.push(value.toLowerCase());
    }
  }
  // Tolerate a header that is just the raw hex signature (no `t=`/`v1=`).
  if (!sawScheme && /^[0-9a-f]+$/i.test(header.trim())) {
    out.signatures.push(header.trim().toLowerCase());
  }
  return out;
}

/** HMAC-SHA256 of `"<t>." + body` with `secret` as the key, hex-encoded. */
async function hmacSha256Hex(
  secret: string,
  timestamp: number,
  body: Uint8Array,
): Promise<string> {
  const subtle = await getSubtle();
  const prefix = encoder.encode(`${timestamp}.`);
  const message = concatBytes(prefix, body);
  const key = await subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await subtle.sign('HMAC', key, message);
  return bufferToHex(signature);
}

let cachedSubtle: SubtleCrypto | undefined;

async function getSubtle(): Promise<SubtleCrypto> {
  if (cachedSubtle) return cachedSubtle;
  const g: any = typeof globalThis !== 'undefined' ? globalThis : {};
  if (g.crypto?.subtle) {
    cachedSubtle = g.crypto.subtle as SubtleCrypto;
    return cachedSubtle;
  }
  // Node 18 may not expose the global; fall back to the built-in module.
  try {
    const nodeCrypto: any = await import('node:crypto');
    if (nodeCrypto?.webcrypto?.subtle) {
      cachedSubtle = nodeCrypto.webcrypto.subtle as SubtleCrypto;
      return cachedSubtle;
    }
  } catch {
    /* not a Node runtime */
  }
  throw new WebhookSignatureError(
    'The Web Crypto API is not available in this runtime.',
    'crypto_unavailable',
  );
}

function toBytes(body: RawBody): Uint8Array {
  if (typeof body === 'string') return encoder.encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }
  throw new WebhookSignatureError(
    'Unsupported body type; pass a string, Buffer, Uint8Array or ArrayBuffer.',
    'invalid_payload',
  );
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Length-constant string comparison (both inputs are hex). */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getHeader(headers: HeadersLike | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  // fetch Headers / anything with a .get()
  if (typeof (headers as any).get === 'function') {
    const v = (headers as any).get(name) ?? (headers as any).get(lower);
    return v == null ? undefined : String(v);
  }
  if (headers instanceof Map) {
    for (const [k, v] of headers) {
      if (k.toLowerCase() === lower) return Array.isArray(v) ? v[0] : String(v);
    }
    return undefined;
  }
  const obj = headers as Record<string, string | string[] | undefined>;
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) {
      const v = obj[k];
      return Array.isArray(v) ? v[0] : v;
    }
  }
  return undefined;
}

function toNumber(value: string | number | string[] | undefined): number | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}
