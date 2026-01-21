/**
 * Metigan Email Examples
 * Demonstrates various email sending scenarios
 */

import Metigan from '../src';
import * as fs from 'fs';
import * as path from 'path';

// Initialize the client
const metigan = new Metigan({
  apiKey: process.env.METIGAN_API_KEY || 'your-api-key'
});

// Example 1: Basic email
async function sendBasicEmail() {
  try {
    const response = await metigan.email.sendEmail({
      from: 'My Company <noreply@mycompany.com>',
      recipients: ['customer@email.com'],
      subject: 'Welcome to our platform!',
      content: `
        <h1>Hello!</h1>
        <p>Thank you for signing up on our platform.</p>
        <p>We're happy to have you with us!</p>
        <br>
        <p>Best regards,<br>My Company Team</p>
      `
    });

    console.log('Email sent successfully!');
    console.log('Successful recipients:', response.successfulEmails?.length);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Example 2: Email with multiple recipients
async function sendToMultipleRecipients() {
  try {
    const response = await metigan.email.sendEmail({
      from: 'My Company <noreply@mycompany.com>',
      recipients: [
        'user1@email.com',
        'user2@email.com',
        'user3@email.com'
      ],
      subject: 'Monthly Newsletter!',
      content: `
        <h1>January Newsletter</h1>
        <p>Check out the main news this month...</p>
      `
    });

    console.log(`Emails sent: ${response.recipientCount}`);
    console.log(`Success: ${response.successfulEmails?.length}`);
    console.log(`Failed: ${response.failedEmails?.length}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 3: Email with CC and BCC
async function sendWithCopyRecipients() {
  try {
    const response = await metigan.email.sendEmail({
      from: 'Sales <sales@mycompany.com>',
      recipients: ['customer@email.com'],
      subject: 'Commercial Proposal',
      content: `
        <h1>Commercial Proposal</h1>
        <p>Please find our commercial proposal as requested.</p>
      `,
      cc: ['manager@mycompany.com'],
      bcc: ['archive@mycompany.com'],
      replyTo: 'sales@mycompany.com'
    });

    console.log('Email with copy sent!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 4: Email with attachment (Node.js)
async function sendWithAttachment() {
  try {
    const pdfBuffer = fs.readFileSync(path.join(__dirname, 'document.pdf'));

    const response = await metigan.email.sendEmail({
      from: 'Documents <docs@mycompany.com>',
      recipients: ['customer@email.com'],
      subject: 'Requested Document',
      content: `
        <p>Hello,</p>
        <p>Please find the requested document attached.</p>
        <p>If you have any questions, feel free to reach out.</p>
      `,
      attachments: [
        {
          buffer: pdfBuffer,
          originalname: 'document.pdf',
          mimetype: 'application/pdf'
        }
      ]
    });

    console.log(`Email sent with ${response.attachmentsCount} attachment(s)!`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 5: HTML template with dynamic content
async function sendTemplateEmail(userData: { name: string; orderNumber: string; total: string }) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hello ${userData.name},</p>
          <p>Your order has been confirmed successfully!</p>
          
          <div class="order-details">
            <p><strong>Order Number:</strong> ${userData.orderNumber}</p>
            <p><strong>Total:</strong> ${userData.total}</p>
          </div>
          
          <p>You will receive shipping updates soon.</p>
        </div>
        <div class="footer">
          <p>© 2024 My Company. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await metigan.email.sendEmail({
      from: 'Orders <orders@mycompany.com>',
      recipients: ['customer@email.com'],
      subject: `Order ${userData.orderNumber} Confirmed`,
      content: htmlContent
    });

    console.log('Confirmation email sent!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 6: OTP email (fast lane)
async function sendOtpEmail() {
  try {
    await metigan.email.sendOtp({
      from: 'My Company <noreply@mycompany.com>',
      to: 'customer@email.com',
      code: '384920',
      appName: 'My Company',
      expiresInMinutes: 10
    });

    console.log('OTP email sent!');
  } catch (error) {
    console.error('Error sending OTP email:', error);
  }
}

// Example 7: Transactional email (fast lane)
async function sendTransactionalEmail() {
  try {
    await metigan.email.sendTransactional({
      from: 'Billing <billing@mycompany.com>',
      to: 'customer@email.com',
      subject: 'Payment received',
      content: `
        <p>Hello,</p>
        <p>Your payment was received successfully.</p>
        <p>Thank you for your business.</p>
      `
    });

    console.log('Transactional email sent!');
  } catch (error) {
    console.error('Error sending transactional email:', error);
  }
}

// Run examples
async function main() {
  console.log('=== Metigan Email Examples ===\n');

  console.log('1. Basic email...');
  await sendBasicEmail();

  console.log('\n2. Multiple recipients...');
  await sendToMultipleRecipients();

  console.log('\n3. Email with CC/BCC...');
  await sendWithCopyRecipients();

  console.log('\n4. Email with template...');
  await sendTemplateEmail({
    name: 'John',
    orderNumber: 'ORD-2024-001',
    total: '$299.90'
  });

  console.log('\n5. OTP email...');
  await sendOtpEmail();

  console.log('\n6. Transactional email...');
  await sendTransactionalEmail();
}

main().catch(console.error);
