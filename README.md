# Metigan

Official SDK for the [Metigan](https://metigan.io) email platform — send transactional, bulk and OTP email, and manage forms, contacts and audiences.

- **Zero runtime dependencies.** Built on the platform `fetch`; nothing is pulled into your `node_modules`.
- **TypeScript-first.** Full type definitions, strict types, editor autocomplete.
- **Universal.** Works in Node.js (18+), edge runtimes, and browsers (ESM, CommonJS and a standalone `<script>` build).
- **Resilient by default.** Per-request timeouts, automatic retries for transient failures, and typed errors.

```bash
npm install metigan
```

## Requirements

Node.js **18 or newer** (for the global `fetch`), or any modern browser. On an older Node version, provide a `fetch` polyfill before using the SDK:

```js
globalThis.fetch = require('undici').fetch;
```

## Quick start

```ts
import Metigan from 'metigan';

const metigan = new Metigan({ apiKey: process.env.METIGAN_API_KEY! });

await metigan.email.sendEmail({
  from: 'Acme <noreply@acme.com>',
  recipients: ['customer@example.com'],
  subject: 'Welcome!',
  content: '<h1>Hello</h1><p>Thanks for signing up.</p>',
});
```

> **Keep your API key on the server.** It grants full access to your account. Never ship it in client-side code (see [Browser usage](#browser-usage)).

### CommonJS

```js
const { Metigan } = require('metigan');
const metigan = new Metigan({ apiKey: process.env.METIGAN_API_KEY });
```

## Configuration

```ts
const metigan = new Metigan({
  apiKey: 'mtg_live_...',        // required
  baseUrl: 'https://api.metigan.io', // optional; or set METIGAN_API_URL
  timeout: 30000,                // per-request timeout (ms), default 30000
  retryCount: 3,                 // retries for 5xx/network errors, default 3
  retryDelay: 1000,              // base backoff (ms), grows exponentially
  // Email-specific:
  sanitizeHtml: true,            // strip risky HTML from content (default true)
  enableRateLimit: true,         // client-side rate limit (default true)
  maxRequestsPerSecond: 10,      // default 10
  disableLogs: true,             // disable the SDK's internal usage telemetry
  debug: false,                  // verbose internal logs
});
```

The base URL is resolved in this order: the `baseUrl` option → the `METIGAN_API_URL` environment variable → `https://api.metigan.io`.

## Email

### Send

```ts
await metigan.email.sendEmail({
  from: 'Acme <noreply@acme.com>',
  recipients: ['a@example.com', 'b@example.com'],
  subject: 'Monthly update',
  content: '<h1>News</h1>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
  replyTo: 'support@acme.com',
});
```

The sender domain must be a domain you have verified in the dashboard (or the shared Metigan sender). The response lists each recipient with a `trackingId`, plus `failedEmails` and your remaining quota.

### Attachments

**Node.js** — pass a buffer, content string or base64:

```ts
import { readFileSync } from 'node:fs';

await metigan.email.sendEmail({
  from: 'Acme <billing@acme.com>',
  recipients: ['customer@example.com'],
  subject: 'Your invoice',
  content: 'Attached.',
  attachments: [
    { buffer: readFileSync('./invoice.pdf'), originalname: 'invoice.pdf', mimetype: 'application/pdf' },
  ],
});
```

**Browser** — pass `File` or `Blob` objects (e.g. from an `<input type="file">`):

```ts
await metigan.email.sendEmail({
  from: 'Acme <noreply@acme.com>',
  recipients: ['customer@example.com'],
  subject: 'Your document',
  content: 'Attached.',
  attachments: [fileInput.files[0]], // a File
});
```

Attachments are validated against an allowlist of MIME types and extensions (max 7 MB each).

### OTP and transactional (fast lane)

Single-recipient OTP and transactional messages take a dedicated low-latency path:

```ts
await metigan.email.sendOtp({
  from: 'Acme <noreply@acme.com>',
  to: 'user@example.com',
  code: '482193',
  appName: 'Acme',
  expiresInMinutes: 10,
});

await metigan.email.sendTransactional({
  from: 'Acme <noreply@acme.com>',
  to: 'user@example.com',
  subject: 'Password changed',
  content: '<p>Your password was updated.</p>',
  idempotencyKey: 'pw-reset-8f21', // optional; de-duplicates retries
});
```

## Contacts

```ts
const contact = await metigan.contacts.create({
  email: 'jane@example.com',
  firstName: 'Jane',
  audienceId: 'aud_123',
  tags: ['customer'],
});

await metigan.contacts.get(contact.id);
await metigan.contacts.getByEmail('jane@example.com', 'aud_123');
await metigan.contacts.update(contact.id, { firstName: 'Jane M.' });
await metigan.contacts.addTags(contact.id, ['vip']);
await metigan.contacts.removeTags(contact.id, ['customer']);
await metigan.contacts.subscribe(contact.id);
await metigan.contacts.unsubscribe(contact.id);
await metigan.contacts.delete(contact.id, 'aud_123');

const { contacts, pagination } = await metigan.contacts.list({
  audienceId: 'aud_123',
  status: 'subscribed', // 'subscribed' | 'unsubscribed' | 'bounced' | 'complained'
  tag: 'vip',
  page: 1,
  limit: 50,
});

await metigan.contacts.search('jane', 'aud_123');

const result = await metigan.contacts.bulkImport(
  [{ email: 'a@example.com', firstName: 'A' }, { email: 'b@example.com' }],
  'aud_123',
);
console.log(result.imported, result.failed);
```

### Export

`export` is overloaded — `'csv'` resolves the raw CSV text, `'json'` the contacts array:

```ts
const csv = await metigan.contacts.export('aud_123', 'csv');   // string
const rows = await metigan.contacts.export('aud_123', 'json'); // Contact[]
```

## Audiences

```ts
const audience = await metigan.audiences.create({ name: 'Newsletter' });

await metigan.audiences.get(audience.id);
await metigan.audiences.update(audience.id, { name: 'Weekly Newsletter' });
await metigan.audiences.list({ page: 1, limit: 10 });
await metigan.audiences.getStats(audience.id);   // { total, subscribed, unsubscribed, bounced }
await metigan.audiences.getCount(audience.id);
await metigan.audiences.clean(audience.id);       // { removed }
await metigan.audiences.duplicate(audience.id, 'Copy');
await metigan.audiences.merge('source_id', 'target_id'); // source is removed
await metigan.audiences.delete(audience.id);
```

## Forms

```ts
// Submit (works with a form id or slug; the submission endpoint is public)
await metigan.forms.submit({ formId: 'contact', data: { email: 'a@example.com', name: 'A' } });

// Manage
const form = await metigan.forms.createForm({
  title: 'Contact',
  fields: [
    { id: 'email', type: 'email', label: 'Email', required: true },
    { id: 'message', type: 'textarea', label: 'Message' },
  ],
});
const { publishedUrl, slug } = await metigan.forms.publishForm(form.id, 'contact');
await metigan.forms.getPublicForm(slug);
await metigan.forms.getAnalytics(form.id); // { views, submissions, conversionRate }
const { forms } = await metigan.forms.listForms({ page: 1, limit: 10 });
await metigan.forms.unpublishForm(form.id);
await metigan.forms.deleteForm(form.id);
```

## Templates

```ts
const { templates } = await metigan.templates.list({ page: 1, limit: 20 });
const template = await metigan.templates.get('tmpl_123');

// Use a template when sending:
await metigan.email.sendEmail({
  from: 'Acme <noreply@acme.com>',
  recipients: ['user@example.com'],
  subject: 'Welcome',
  templateId: 'tmpl_123',
});
```

## Individual modules

Import a single module when you don't need the full client:

```ts
import { MetiganForms, MetiganContacts, MetiganAudiences, MetiganTemplates } from 'metigan';

const forms = new MetiganForms({ apiKey: process.env.METIGAN_API_KEY! });
```

Each module accepts the same `baseUrl`, `timeout`, `retryCount` and `retryDelay` options.

## Error handling

Every failure is one of three typed errors:

```ts
import { ValidationError, ApiError, MetiganError } from 'metigan';

try {
  await metigan.email.sendEmail({ /* ... */ });
} catch (err) {
  if (err instanceof ValidationError) {
    // invalid input caught before the request
  } else if (err instanceof ApiError) {
    console.error(err.status, err.message, err.data); // the API rejected it
  } else if (err instanceof MetiganError) {
    console.error('Network/timeout:', err.message); // couldn't reach the API
  }
}
```

`ApiError` (a subclass of `MetiganError`) carries the HTTP `status` and the parsed response `data`. 4xx responses fail immediately; 5xx and network errors are retried up to `retryCount` with exponential backoff before the error is thrown.

## Browser usage

The SDK works in the browser through a bundler (Vite, webpack, esbuild…) with the same `import Metigan from 'metigan'`, or directly via a `<script>` tag:

```html
<script src="https://unpkg.com/metigan"></script>
<script>
  const metigan = new Metigan({ /* ... */ });
</script>
```

> ⚠️ **Never put your API key in browser code.** It is readable by anyone who loads the page and grants full account access. In the browser, call the Metigan API from your own backend, or use it only for **public form submissions**, which don't require a secret key. For everything else, keep the key server-side.

## Security

- **Zero dependencies** — no transitive supply-chain surface.
- **Header-injection protection** — sender, recipients and subject are stripped of CR/LF before sending.
- **Attachment validation** — MIME type and extension allowlist, size cap.
- **HTML sanitization** — risky tags/attributes are removed from `content` by default (`sanitizeHtml: false` to opt out). This is a best-effort client-side pass; the Metigan server remains the authority on message content, SPF/DKIM/DMARC alignment and deliverability.
- **Rate limiting** — a client-side limiter guards against accidental bursts; the server enforces the real limits.

Advanced helpers are exported for direct use: `sanitizeHtml`, `sanitizeEmail`, `sanitizeSubject`, `isAllowedMimeType`, `isSafeFileExtension`, `ALLOWED_MIME_TYPES`, and a standalone `RateLimiter`.

## TypeScript

Types ship with the package — no `@types` needed:

```ts
import Metigan, { EmailOptions, Contact, Audience, FormConfig } from 'metigan';

const options: EmailOptions = {
  from: 'Acme <noreply@acme.com>',
  recipients: ['user@example.com'],
  subject: 'Hi',
  content: '<p>Hi</p>',
};
```

## License

MIT © Metigan

## Links

- [Documentation](https://docs.metigan.io)
- [Dashboard](https://metigan.io)
- [Issues](https://github.com/frantchessico/metigan-lib/issues)
