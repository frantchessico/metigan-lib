Thought for 5 seconds### Metigan Documentation

Metigan is a powerful Node.js/TypeScript library for sending emails through the Metigan API. This library provides a simple and flexible way to send emails, manage contacts, use templates, and track email analytics.

## Installation

Install the Metigan library using npm:

```shellscript
npm install metigan
```

Or using yarn:

```shellscript
yarn add metigan
```

## Quick Start

```typescript
import Metigan from 'metigan';

// Initialize the client with your API key
const metigan = new Metigan('your-api-key');

// Send a simple email
async function sendSimpleEmail() {
  try {
    const response = await metigan.sendEmail({
      from: 'sender@example.com',
      recipients: ['recipient@example.com'],
      subject: 'Hello from Metigan',
      content: '<h1>Hello World!</h1><p>This is a test email from Metigan.</p>'
    });
    
    console.log('Email sent successfully:', response);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

sendSimpleEmail();
```

## Core Concepts

### Client Initialization

The Metigan client is the main entry point for all operations. Initialize it with your API key and optional configuration.

```typescript
import Metigan from 'metigan';

// Basic initialization
const metigan = new Metigan('your-api-key');

// Advanced initialization with options
const metiganAdvanced = new Metigan('your-api-key', {
  userId: 'user-123', // For logging purposes
  disableLogs: false, // Enable/disable logging
  retryCount: 3,      // Number of retry attempts
  retryDelay: 1000,   // Delay between retries in ms
  timeout: 30000      // Request timeout in ms
});
```

## API Reference

### Metigan Class

The main class for interacting with the Metigan API.

#### Constructor

```typescript
constructor(apiKey: string, options?: MetiganOptions)
```

**Parameters:**

- `apiKey` (string): Your Metigan API key
- `options` (MetiganOptions, optional): Configuration options


**MetiganOptions:**

- `userId` (string, optional): User ID for logging purposes
- `disableLogs` (boolean, optional): Whether to disable logging
- `retryCount` (number, optional): Number of retry attempts for failed operations
- `retryDelay` (number, optional): Base delay between retries in milliseconds
- `timeout` (number, optional): Request timeout in milliseconds


### Email Operations

#### Send Email

Sends an email to one or more recipients.

```typescript
async sendEmail(options: EmailOptions): Promise<EmailApiResponse>
```

**Parameters:**

- `options` (EmailOptions): Email configuration


**EmailOptions:**

- `from` (string): Sender email address
- `recipients` (string[]): Array of recipient email addresses
- `subject` (string): Email subject
- `content` (string): Email content (HTML supported)
- `attachments` (Array`<File | NodeAttachment | CustomAttachment>`, optional): Email attachments
- `contactOptions` (ContactCreationOptions, optional): Options for creating contacts
- `trackingId` (string, optional): Unique ID for tracking email analytics


**Returns:**

- Promise resolving to EmailApiResponse


**Example:**

```typescript
const response = await metigan.sendEmail({
  from: 'sender@example.com',
  recipients: ['recipient1@example.com', 'recipient2@example.com'],
  subject: 'Important Announcement',
  content: '<h1>Hello!</h1><p>This is an important announcement.</p>',
  trackingId: metigan.generateTrackingId()
});
```

#### Send Email with Template

Sends an email using a predefined template.

```typescript
async sendEmailWithTemplate(options: TemplateOptions): Promise<EmailApiResponse>
```

**Parameters:**

- `options` (TemplateOptions): Template configuration


**TemplateOptions:**

- `from` (string): Sender email address
- `recipients` (string[]): Array of recipient email addresses
- `subject` (string): Email subject
- `templateId` (string): ID of the template to use
- `templateVariables` (TemplateVariables, optional): Variables to replace in the template
- `attachments` (Array`<File | NodeAttachment | CustomAttachment>`, optional): Email attachments
- `contactOptions` (ContactCreationOptions, optional): Options for creating contacts
- `trackingId` (string, optional): Unique ID for tracking email analytics


**Example:**

```typescript
const response = await metigan.sendEmailWithTemplate({
  from: 'sender@example.com',
  recipients: ['recipient@example.com'],
  subject: 'Welcome to Our Service',
  templateId: 'welcome-template-123',
  templateVariables: {
    userName: 'John Doe',
    activationLink: 'https://example.com/activate?token=abc123'
  }
});
```

#### Create Template

Creates a reusable email template with placeholders.

```typescript
createTemplate(htmlContent: string): TemplateFunction
```

**Parameters:**

- `htmlContent` (string): HTML content with {placeholders}


**Returns:**

- TemplateFunction: A function that accepts variables and returns the populated template


**Example:**

```typescript
const welcomeTemplate = metigan.createTemplate(`
  <h1>Welcome, {{name}}!</h1>
  <p>Thank you for joining our service.</p>
  <p>Click <a href="{{activationLink}}">here</a> to activate your account.</p>
`);

// Use the template
const emailContent = welcomeTemplate({
  name: 'John Doe',
  activationLink: 'https://example.com/activate?token=abc123'
});

// Send email with the populated template
await metigan.sendEmail({
  from: 'sender@example.com',
  recipients: ['john@example.com'],
  subject: 'Welcome to Our Service',
  content: emailContent
});
```

#### Generate Tracking ID

Generates a unique tracking ID for email analytics.

```typescript
generateTrackingId(): string
```

**Returns:**

- string: A unique tracking ID


**Example:**

```typescript
const trackingId = metigan.generateTrackingId();
console.log(trackingId); // e.g., "mtg-1647532890123-4567"
```

### Contact Management

#### Create Contacts

Creates contacts in the specified audience.

```typescript
async createContacts(emails: string[], options: ContactCreationOptions): Promise<ContactApiResponse>
```

**Parameters:**

- `emails` (string[]): List of email addresses
- `options` (ContactCreationOptions): Contact creation options


**ContactCreationOptions:**

- `createContact` (boolean): Must be true
- `audienceId` (string): Audience ID from Metigan dashboard
- `contactFields` (Record`<string, any>`, optional): Additional contact fields


**Example:**

```typescript
const response = await metigan.createContacts(
  ['contact1@example.com', 'contact2@example.com'],
  {
    createContact: true,
    audienceId: 'audience-123',
    contactFields: {
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Inc'
    }
  }
);
```

#### Get Contact

Retrieves a contact by email address.

```typescript
async getContact(email: string, audienceId: string): Promise<ContactApiResponse>
```

**Parameters:**

- `email` (string): Email address of the contact
- `audienceId` (string): Audience ID from Metigan dashboard


**Example:**

```typescript
const contact = await metigan.getContact('contact@example.com', 'audience-123');
```

#### List Contacts

Lists contacts in an audience.

```typescript
async listContacts(options: ContactQueryOptions): Promise<ContactApiResponse>
```

**Parameters:**

- `options` (ContactQueryOptions): Query options


**ContactQueryOptions:**

- `audienceId` (string): Audience ID from Metigan dashboard
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Number of contacts per page
- `filters` (Record`<string, any>`, optional): Filters to apply


**Example:**

```typescript
const contacts = await metigan.listContacts({
  audienceId: 'audience-123',
  page: 1,
  limit: 50,
  filters: {
    company: 'Acme Inc'
  }
});
```

#### Update Contact

Updates a contact's information.

```typescript
async updateContact(email: string, options: ContactUpdateOptions): Promise<ContactApiResponse>
```

**Parameters:**

- `email` (string): Email address of the contact to update
- `options` (ContactUpdateOptions): Update options


**ContactUpdateOptions:**

- `audienceId` (string): Audience ID from Metigan dashboard
- `fields` (Record`<string, any>`): Fields to update


**Example:**

```typescript
const response = await metigan.updateContact('contact@example.com', {
  audienceId: 'audience-123',
  fields: {
    firstName: 'Jane',
    lastName: 'Smith',
    company: 'New Company Inc'
  }
});
```

#### Delete Contact

Deletes a contact.

```typescript
async deleteContact(email: string, audienceId: string): Promise<ContactApiResponse>
```

**Parameters:**

- `email` (string): Email address of the contact to delete
- `audienceId` (string): Audience ID from Metigan dashboard


**Example:**

```typescript
const response = await metigan.deleteContact('contact@example.com', 'audience-123');
```

### Combined Operations

#### Send Email and Create Contacts

Sends an email and creates contacts in one operation.

```typescript
async sendEmailAndCreateContacts(options: EmailOptions): Promise<EmailApiResponse>
```

**Parameters:**

- `options` (EmailOptions): Email options with contact creation settings


**Example:**

```typescript
const response = await metigan.sendEmailAndCreateContacts({
  from: 'sender@example.com',
  recipients: ['new-contact@example.com'],
  subject: 'Welcome to Our Service',
  content: '<h1>Welcome!</h1><p>Thank you for joining our service.</p>',
  contactOptions: {
    createContact: true,
    audienceId: 'audience-123',
    contactFields: {
      firstName: 'New',
      lastName: 'User'
    }
  }
});
```

#### Send Template and Create Contacts

Sends an email using a template and creates contacts in one operation.

```typescript
async sendTemplateAndCreateContacts(options: TemplateOptions): Promise<EmailApiResponse>
```

**Parameters:**

- `options` (TemplateOptions): Template options with contact creation settings


**Example:**

```typescript
const response = await metigan.sendTemplateAndCreateContacts({
  from: 'sender@example.com',
  recipients: ['new-contact@example.com'],
  subject: 'Welcome to Our Service',
  templateId: 'welcome-template-123',
  templateVariables: {
    userName: 'New User',
    activationLink: 'https://example.com/activate?token=xyz789'
  },
  contactOptions: {
    createContact: true,
    audienceId: 'audience-123',
    contactFields: {
      firstName: 'New',
      lastName: 'User'
    }
  }
});
```

## Attachments

Metigan supports file attachments in different environments:

### Browser Environment

In browser environments, use the File API:

```typescript
// Assuming you have a file input element
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const files = fileInput.files;

if (files && files.length > 0) {
  await metigan.sendEmail({
    from: 'sender@example.com',
    recipients: ['recipient@example.com'],
    subject: 'Email with Attachment',
    content: '<p>Please find the attached file.</p>',
    attachments: Array.from(files)
  });
}
```

### Node.js Environment

In Node.js, use Buffer objects:

```typescript
import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, 'document.pdf');
const fileBuffer = fs.readFileSync(filePath);

await metigan.sendEmail({
  from: 'sender@example.com',
  recipients: ['recipient@example.com'],
  subject: 'Email with Attachment',
  content: '<p>Please find the attached file.</p>',
  attachments: [{
    buffer: fileBuffer,
    originalname: 'document.pdf',
    mimetype: 'application/pdf'
  }]
});
```

### Custom Attachments

You can also create custom attachments:

```typescript
await metigan.sendEmail({
  from: 'sender@example.com',
  recipients: ['recipient@example.com'],
  subject: 'Email with Attachment',
  content: '<p>Please find the attached file.</p>',
  attachments: [{
    content: 'Hello, this is a text file content.',
    filename: 'hello.txt',
    contentType: 'text/plain'
  }]
});
```

## Error Handling

Metigan uses a custom `MetiganError` class for error handling. All API methods return promises that may reject with a `MetiganError`.

```typescript
try {
  const response = await metigan.sendEmail({
    from: 'sender@example.com',
    recipients: ['recipient@example.com'],
    subject: 'Test Email',
    content: '<p>Test content</p>'
  });
  console.log('Email sent successfully:', response);
} catch (error) {
  if (error instanceof MetiganError) {
    console.error('Metigan error:', error.message);
    // Handle specific error cases
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Logging

Metigan includes built-in logging functionality to track API operations.

### Enable/Disable Logging

```typescript
// Disable logging
metigan.disableLogging();

// Enable logging
metigan.enableLogging();
```

## Best Practices

### 1. Retry Strategy

Metigan automatically retries failed operations. You can customize the retry behavior:

```typescript
const metigan = new Metigan('your-api-key', {
  retryCount: 5,     // Increase retries for critical operations
  retryDelay: 2000   // Longer delay between retries
});
```

### 2. Email Validation

Metigan validates email addresses, but you should also validate them in your application:

```typescript
function isValidEmail(email) {
  // Simple validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const recipients = userEmails.filter(isValidEmail);
```

### 3. Template Management

Create reusable templates for common email types:

```typescript
// Store templates in a central location
const templates = {
  welcome: metigan.createTemplate('<h1>Welcome, {{name}}!</h1><p>{{message}}</p>'),
  passwordReset: metigan.createTemplate('<h1>Password Reset</h1><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>'),
  notification: metigan.createTemplate('<h1>{{title}}</h1><p>{{message}}</p>')
};

// Use templates as needed
const welcomeEmail = templates.welcome({
  name: 'John',
  message: 'Thank you for joining our platform!'
});
```

### 4. Contact Management

Efficiently manage contacts by batching operations:

```typescript
// Batch create contacts
async function batchCreateContacts(emails, audienceId, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    batches.push(batch);
  }
  
  const results = [];
  for (const batch of batches) {
    try {
      const result = await metigan.createContacts(batch, {
        createContact: true,
        audienceId
      });
      results.push(result);
    } catch (error) {
      console.error('Error creating contacts batch:', error);
    }
  }
  
  return results;
}
```

## Type Definitions

Metigan is fully typed with TypeScript. Here are the key type definitions:

```typescript
// Email options
interface EmailOptions {
  from: string;
  recipients: string[];
  subject: string;
  content: string;
  attachments?: Array<File | NodeAttachment | CustomAttachment>;
  contactOptions?: ContactCreationOptions;
  trackingId?: string;
}

// Template options
interface TemplateOptions {
  from: string;
  recipients: string[];
  subject: string;
  templateId: string;
  templateVariables?: TemplateVariables;
  attachments?: Array<File | NodeAttachment | CustomAttachment>;
  contactOptions?: ContactCreationOptions;
  trackingId?: string;
}

// Contact creation options
interface ContactCreationOptions {
  createContact: boolean;
  audienceId: string;
  contactFields?: Record<string, any>;
}

// Contact query options
interface ContactQueryOptions {
  audienceId: string;
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
}

// Contact update options
interface ContactUpdateOptions {
  audienceId: string;
  fields: Record<string, any>;
}

// API responses
interface EmailApiResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  contactsCreated?: number;
}

interface ContactApiResponse {
  success: boolean;
  contacts?: any[];
  contact?: any;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
}
```

## Limitations

- Maximum attachment size: 7MB per file
- Rate limits: Consult the Metigan API documentation for current rate limits
- Template variables: Only supports string, number, and boolean values


## Troubleshooting

### Common Issues

1. **Authentication Errors**

1. Ensure your API key is correct and active
2. Check if your account has the necessary permissions



2. **Email Delivery Issues**

1. Verify recipient email addresses are valid
2. Check if your sender domain is properly configured
3. Review email content for spam triggers



3. **Rate Limiting**

1. Implement exponential backoff for high-volume sending
2. Distribute sending over time for large batches





### Debugging

Enable detailed logging for troubleshooting:

```typescript
// In Node.js
process.env.DEBUG = 'metigan:*';

// Then initialize the client
const metigan = new Metigan('your-api-key');
```

## Support

For additional support:

- Visit the Metigan documentation website
- Contact support at [support@metigan.com](mailto:support@metigan.com)
- Submit issues on GitHub


## License

This library is licensed under the MIT License.
