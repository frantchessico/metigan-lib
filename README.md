# Metigan SDK

The official Metigan library for Node.js and browsers. Send emails, manage forms, contacts, and audiences with ease.

## 📦 Installation

```bash
npm install metigan
# or
yarn add metigan
```

## 🚀 Quick Start

```typescript
import Metigan from 'metigan';

// Initialize the client with all features
const metigan = new Metigan({
  apiKey: 'your-api-key'
});

// Send email
await metigan.email.sendEmail({
  from: 'Your Company <noreply@yourcompany.com>',
  recipients: ['customer@email.com'],
  subject: 'Welcome!',
  content: '<h1>Hello!</h1><p>Thank you for signing up.</p>'
});

// Send OTP (fast lane)
await metigan.email.sendOtp({
  from: 'Your Company <noreply@yourcompany.com>',
  to: 'customer@email.com',
  code: '348921',
  appName: 'Metigan',
  expiresInMinutes: 10
});

// Send transactional email (fast lane)
await metigan.email.sendTransactional({
  from: 'Your Company <noreply@yourcompany.com>',
  to: 'customer@email.com',
  subject: 'Your receipt',
  content: '<p>Thanks for your purchase.</p>'
});

// Submit form
await metigan.forms.submit({
  formId: 'form-123',
  data: {
    email: 'user@email.com',
    name: 'John Doe'
  }
});

// Create contact
await metigan.contacts.create({
  email: 'new@email.com',
  firstName: 'Jane',
  audienceId: 'audience-456'
});
```

## 📧 Email Module

### Basic Send

```typescript
const response = await metigan.email.sendEmail({
  from: 'Your Company <noreply@yourcompany.com>',
  recipients: ['recipient@email.com'],
  subject: 'Email Subject',
  content: '<h1>HTML Content</h1>'
});
```

### With Attachments (Node.js)

```typescript
import fs from 'fs';

const response = await metigan.email.sendEmail({
  from: 'company@email.com',
  recipients: ['customer@email.com'],
  subject: 'Important Document',
  content: 'Please find the document attached.',
  attachments: [
    {
      buffer: fs.readFileSync('./document.pdf'),
      originalname: 'document.pdf',
      mimetype: 'application/pdf'
    }
  ]
});
```

### With CC and BCC

```typescript
await metigan.email.sendEmail({
  from: 'company@email.com',
  recipients: ['main@email.com'],
  subject: 'Meeting',
  content: 'Email content',
  cc: ['copy@email.com'],
  bcc: ['hidden-copy@email.com'],
  replyTo: 'reply-here@email.com'
});
```

### OTP Send (Fast Lane)

```typescript
await metigan.email.sendOtp({
  from: 'Your Company <noreply@yourcompany.com>',
  to: 'user@email.com',
  code: '482193',
  appName: 'Metigan',
  expiresInMinutes: 10
});
```

### Transactional Send (Fast Lane)

```typescript
await metigan.email.sendTransactional({
  from: 'Your Company <noreply@yourcompany.com>',
  to: 'user@email.com',
  subject: 'Password changed',
  content: '<p>Your password was updated successfully.</p>'
});
```

## 📋 Forms Module

### Submit Response

```typescript
const response = await metigan.forms.submit({
  formId: 'form-123', // or form slug
  data: {
    'field-email': 'user@email.com',
    'field-name': 'John Doe',
    'field-message': 'Hello, I would like more information.'
  }
});

console.log(response.message); // "Thank you for your submission!"
```

### Get Public Form

```typescript
// By slug (for public display)
const form = await metigan.forms.getPublicForm('my-form');

console.log(form.title);
console.log(form.fields);
```

### List Forms

```typescript
const { forms, pagination } = await metigan.forms.listForms({
  page: 1,
  limit: 10
});

forms.forEach(form => {
  console.log(`${form.title} - ${form.analytics?.submissions || 0} responses`);
});
```

### Create Form

```typescript
const newForm = await metigan.forms.createForm({
  title: 'Contact Form',
  description: 'Get in touch with us',
  fields: [
    {
      id: 'field-email',
      type: 'email',
      label: 'Your Email',
      required: true
    },
    {
      id: 'field-name',
      type: 'text',
      label: 'Your Name',
      required: true
    },
    {
      id: 'field-subject',
      type: 'select',
      label: 'Subject',
      options: ['Support', 'Sales', 'Partnerships']
    },
    {
      id: 'field-message',
      type: 'textarea',
      label: 'Message',
      required: true
    }
  ],
  settings: {
    successMessage: 'Thank you! We will get back to you soon.',
    notifyEmail: 'contact@company.com'
  }
});
```

### Publish Form

```typescript
const { publishedUrl, slug } = await metigan.forms.publishForm('form-123', 'contact');
console.log(`Form published at: ${publishedUrl}`);
```

### Form Analytics

```typescript
const analytics = await metigan.forms.getAnalytics('form-123');

console.log(`Views: ${analytics.views}`);
console.log(`Submissions: ${analytics.submissions}`);
console.log(`Conversion rate: ${analytics.conversionRate}%`);
```

## 👥 Contacts Module

### Create Contact

```typescript
const contact = await metigan.contacts.create({
  email: 'new@email.com',
  firstName: 'Jane',
  lastName: 'Doe',
  audienceId: 'audience-123',
  tags: ['customer', 'newsletter']
});
```

### Get Contact

```typescript
// By ID
const contact = await metigan.contacts.get('contact-456');

// By email
const contact = await metigan.contacts.getByEmail('jane@email.com', 'audience-123');
```

### Update Contact

```typescript
const updated = await metigan.contacts.update('contact-456', {
  firstName: 'Jane Marie',
  tags: ['customer', 'vip']
});
```

### Manage Subscription

```typescript
// Unsubscribe
await metigan.contacts.unsubscribe('contact-456');

// Resubscribe
await metigan.contacts.subscribe('contact-456');
```

### Manage Tags

```typescript
// Add tags
await metigan.contacts.addTags('contact-456', ['vip', 'black-friday']);

// Remove tags
await metigan.contacts.removeTags('contact-456', ['test']);
```

### List Contacts

```typescript
const { contacts, pagination } = await metigan.contacts.list({
  audienceId: 'audience-123',
  status: 'subscribed',
  tag: 'customer',
  page: 1,
  limit: 50
});
```

### Bulk Import

```typescript
const result = await metigan.contacts.bulkImport(
  [
    { email: 'john@email.com', firstName: 'John' },
    { email: 'jane@email.com', firstName: 'Jane' },
    { email: 'peter@email.com', firstName: 'Peter', tags: ['vip'] }
  ],
  'audience-123'
);

console.log(`Imported: ${result.imported}`);
console.log(`Failed: ${result.failed}`);
```

### Search Contacts

```typescript
const results = await metigan.contacts.search('doe', 'audience-123');
```

## 📊 Audiences Module

### Create Audience

```typescript
const audience = await metigan.audiences.create({
  name: 'Main Newsletter',
  description: 'Main subscriber list'
});
```

### List Audiences

```typescript
const { audiences, pagination } = await metigan.audiences.list({
  page: 1,
  limit: 10
});

audiences.forEach(audience => {
  console.log(`${audience.name}: ${audience.count} contacts`);
});
```

### Audience Statistics

```typescript
const stats = await metigan.audiences.getStats('audience-123');

console.log(`Total: ${stats.total}`);
console.log(`Subscribed: ${stats.subscribed}`);
console.log(`Unsubscribed: ${stats.unsubscribed}`);
console.log(`Bounced: ${stats.bounced}`);
```

### Clean Audience

```typescript
// Remove bounced and unsubscribed contacts
const { removed } = await metigan.audiences.clean('audience-123');
console.log(`${removed} contacts removed`);
```

### Merge Audiences

```typescript
// Merge source into target (source is deleted)
const merged = await metigan.audiences.merge(
  'source-audience-id',
  'target-audience-id'
);
```

## ⚙️ Advanced Configuration

```typescript
const metigan = new Metigan({
  apiKey: 'your-api-key',
  
  // User ID for logging
  userId: 'user-123',
  
  // Disable logging
  disableLogs: true,
  
  // Timeout in milliseconds
  timeout: 60000,
  
  // Number of retries on failure
  retryCount: 5,
  
  // Delay between retries (ms)
  retryDelay: 2000,
  
  // Security options (see Security section)
  debug: false,
  sanitizeHtml: true,
  enableRateLimit: true,
  maxRequestsPerSecond: 10
});
```

## 🔒 Security Features

The SDK includes built-in security features:

### HTML Sanitization

Automatically removes dangerous HTML tags and attributes from email content to prevent XSS attacks:

```typescript
// HTML sanitization is enabled by default
const metigan = new Metigan({
  apiKey: 'your-api-key',
  sanitizeHtml: true // default
});

// Dangerous content is automatically sanitized
await metigan.email.sendEmail({
  from: 'company@email.com',
  recipients: ['user@email.com'],
  subject: 'Newsletter',
  content: '<h1>Hello</h1><script>alert("xss")</script>' // Script tag will be removed
});
```

### Client-Side Rate Limiting

Prevents accidental API abuse with built-in rate limiting:

```typescript
const metigan = new Metigan({
  apiKey: 'your-api-key',
  enableRateLimit: true, // default
  maxRequestsPerSecond: 10 // default
});

// Check rate limit before making requests
if (metigan.email.canMakeRequest()) {
  await metigan.email.sendEmail({...});
} else {
  const waitTime = metigan.email.getTimeUntilNextRequest();
  console.log(`Please wait ${waitTime}ms before next request`);
}

// Reset rate limiter if needed
metigan.email.resetRateLimit();
```

### Attachment Validation

Validates file attachments for security:

```typescript
import { isAllowedMimeType, isSafeFileExtension, ALLOWED_MIME_TYPES } from 'metigan';

// Check if file type is safe
const filename = 'document.pdf';
const mimetype = 'application/pdf';

if (isSafeFileExtension(filename) && isAllowedMimeType(mimetype)) {
  // Safe to attach
}

// View allowed MIME types
console.log(ALLOWED_MIME_TYPES);
```

### Email Header Injection Prevention

Email addresses and subjects are automatically sanitized to prevent header injection attacks:

```typescript
import { sanitizeEmail, sanitizeSubject } from 'metigan';

// Remove newlines and dangerous characters
const safeEmail = sanitizeEmail('user@email.com\r\nBcc: hacker@evil.com');
const safeSubject = sanitizeSubject('Subject\r\nFrom: hacker@evil.com');
```

### Debug Mode

Enable debug mode for troubleshooting (logs are hidden by default in production):

```typescript
const metigan = new Metigan({
  apiKey: 'your-api-key',
  debug: true // Shows internal logs
});

// Or enable/disable at runtime
metigan.email.enableDebug();
metigan.email.disableDebug();
```

### Custom Rate Limiter

For advanced use cases, you can create your own rate limiter:

```typescript
import { RateLimiter } from 'metigan';

const limiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 1000 // 5 requests per second
});

if (limiter.tryRequest()) {
  // Request allowed and recorded
  await makeApiCall();
} else {
  // Rate limited
  console.log(`Wait ${limiter.getTimeUntilNextRequest()}ms`);
}
```

## 🔧 Using Individual Modules

If you only need a specific module:

```typescript
import { MetiganForms, MetiganContacts, MetiganAudiences } from 'metigan';

// Forms only
const forms = new MetiganForms({
  apiKey: 'your-api-key'
});

// Contacts only
const contacts = new MetiganContacts({
  apiKey: 'your-api-key'
});

// Audiences only
const audiences = new MetiganAudiences({
  apiKey: 'your-api-key'
});
```

## 🌐 Browser Usage

```html
<script src="https://unpkg.com/metigan/dist/index.js"></script>
<script>
  const metigan = new Metigan({ apiKey: 'your-api-key' });
  
  // Submit form
  document.getElementById('my-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      const response = await metigan.forms.submit({
        formId: 'form-123',
        data
      });
      alert(response.message);
    } catch (error) {
      alert('Error submitting: ' + error.message);
    }
  });
</script>
```

## 🛡️ Error Handling

```typescript
import { MetiganError, ValidationError, ApiError } from 'metigan';

try {
  await metigan.email.sendEmail({
    from: 'invalid',
    recipients: [],
    subject: '',
    content: ''
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid data:', error.message);
  } else if (error instanceof ApiError) {
    console.error(`API error (${error.status}):`, error.message);
  } else if (error instanceof MetiganError) {
    console.error('Metigan error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## 📝 TypeScript

The library includes full TypeScript definitions:

```typescript
import Metigan, {
  EmailOptions,
  OtpSendOptions,
  TransactionalSendOptions,
  FormConfig,
  Contact,
  Audience,
  FormFieldType
} from 'metigan';

const emailOptions: EmailOptions = {
  from: 'company@email.com',
  recipients: ['customer@email.com'],
  subject: 'Test',
  content: '<p>Content</p>'
};

const fieldType: FormFieldType = 'email';

const otpOptions: OtpSendOptions = {
  from: 'company@email.com',
  to: 'user@email.com',
  code: '123456'
};

const transactionalOptions: TransactionalSendOptions = {
  from: 'company@email.com',
  to: 'user@email.com',
  subject: 'Invoice ready',
  content: '<p>Your invoice is ready.</p>'
};
```

## 📄 License

MIT © Metigan

## 🔗 Links

- [Documentation](https://docs.metigan.com)
- [Dashboard](https://app.metigan.com)
- [API Reference](https://docs.metigan.com/api)
- [Examples](https://github.com/metigan/metigan-lib/tree/main/examples)
