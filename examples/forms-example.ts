/**
 * Metigan Forms Examples
 * Demonstrates form management and submissions
 */

import Metigan from '../src';

// Initialize the client
const metigan = new Metigan({
  apiKey: process.env.METIGAN_API_KEY || 'your-api-key'
});

// Example 1: Create a contact form
async function createContactForm() {
  try {
    const form = await metigan.forms.createForm({
      title: 'Contact Form',
      description: 'Get in touch with us. We will respond within 24 hours.',
      fields: [
        {
          id: 'field-name',
          type: 'text',
          label: 'Full Name',
          placeholder: 'Enter your name',
          required: true
        },
        {
          id: 'field-email',
          type: 'email',
          label: 'Email',
          placeholder: 'your@email.com',
          required: true,
          helpText: 'We will use this email to respond'
        },
        {
          id: 'field-phone',
          type: 'phone',
          label: 'Phone',
          placeholder: '+1 (555) 123-4567',
          required: false
        },
        {
          id: 'field-subject',
          type: 'select',
          label: 'Subject',
          options: ['Support', 'Sales', 'Partnerships', 'Other'],
          required: true
        },
        {
          id: 'field-message',
          type: 'textarea',
          label: 'Message',
          placeholder: 'Type your message...',
          required: true,
          validation: {
            minLength: 20,
            maxLength: 1000
          }
        }
      ],
      settings: {
        successMessage: 'Thank you! We will get back to you soon.',
        notifyEmail: 'contact@company.com',
        storeResponses: true
      },
      buttonCustomization: {
        text: 'Send Message',
        fullWidth: true,
        variant: 'default'
      }
    });

    console.log('Form created:', form.id);
    return form;
  } catch (error) {
    console.error('Error creating form:', error);
  }
}

// Example 2: Create a survey form with ratings
async function createSurveyForm() {
  try {
    const form = await metigan.forms.createForm({
      title: 'Satisfaction Survey',
      description: 'Your feedback is very important to us!',
      fields: [
        {
          id: 'field-email',
          type: 'email',
          label: 'Your Email',
          required: true
        },
        {
          id: 'field-rating-overall',
          type: 'rating',
          label: 'How do you rate our company?',
          required: true
        },
        {
          id: 'field-rating-service',
          type: 'rating',
          label: 'How do you rate our customer service?',
          required: true
        },
        {
          id: 'field-recommend',
          type: 'slider',
          label: 'From 0 to 10, would you recommend us to a friend?',
          validation: {
            min: 0,
            max: 10,
            step: 1
          },
          required: true
        },
        {
          id: 'field-features',
          type: 'checkbox',
          label: 'Which features do you use most?',
          options: ['Dashboard', 'Reports', 'Integrations', 'API', 'Mobile'],
          required: false
        },
        {
          id: 'field-improvements',
          type: 'textarea',
          label: 'What can we improve?',
          placeholder: 'Share your suggestions...',
          required: false
        }
      ],
      settings: {
        successMessage: 'Thank you for your feedback! 🙏',
        showProgressBar: true
      }
    });

    console.log('Survey created:', form.id);
    return form;
  } catch (error) {
    console.error('Error creating survey:', error);
  }
}

// Example 3: Submit form data
async function submitForm(formId: string) {
  try {
    const response = await metigan.forms.submit({
      formId: formId,
      data: {
        'field-name': 'John Doe',
        'field-email': 'john@email.com',
        'field-phone': '+1 (555) 987-6543',
        'field-subject': 'Sales',
        'field-message': 'Hello, I would like to know more about the available plans for my company.'
      }
    });

    console.log('Form submitted!');
    console.log('Message:', response.message);
  } catch (error) {
    console.error('Error submitting:', error);
  }
}

// Example 4: List and analyze forms
async function analyzeAllForms() {
  try {
    const { forms, pagination } = await metigan.forms.listForms({ limit: 50 });

    console.log(`\n📊 Analysis of ${pagination.total} forms:\n`);

    let totalSubmissions = 0;
    let totalViews = 0;

    for (const form of forms) {
      const analytics = await metigan.forms.getAnalytics(form.id!);
      
      totalSubmissions += analytics.submissions;
      totalViews += analytics.views;

      const conversionRate = analytics.views > 0 
        ? ((analytics.submissions / analytics.views) * 100).toFixed(1) 
        : '0';

      console.log(`📋 ${form.title}`);
      console.log(`   Views: ${analytics.views} | Submissions: ${analytics.submissions} | Conversion: ${conversionRate}%`);
      console.log(`   Status: ${form.published ? '✅ Published' : '📝 Draft'}`);
      console.log('');
    }

    console.log('=== TOTALS ===');
    console.log(`Total Views: ${totalViews}`);
    console.log(`Total Submissions: ${totalSubmissions}`);
    console.log(`Overall Conversion Rate: ${totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(1) : 0}%`);

  } catch (error) {
    console.error('Error analyzing:', error);
  }
}

// Example 5: Publish and share form
async function publishAndShare(formId: string) {
  try {
    // Publish with custom slug
    const { publishedUrl, slug } = await metigan.forms.publishForm(formId, 'contact');

    console.log('✅ Form published!');
    console.log(`📎 URL: ${publishedUrl}`);
    console.log(`🔗 Slug: ${slug}`);

    // Get public form for embedding
    const publicForm = await metigan.forms.getPublicForm(slug);
    console.log(`\n📝 Title: ${publicForm.title}`);
    console.log(`📝 Fields: ${publicForm.fields.length}`);

  } catch (error) {
    console.error('Error publishing:', error);
  }
}

// Example 6: Get form submissions
async function getFormSubmissions(formId: string) {
  try {
    const { submissions, pagination } = await metigan.forms.getSubmissions(formId, {
      page: 1,
      limit: 10
    });

    console.log(`\n📥 Last ${submissions.length} responses (of ${pagination.total}):\n`);

    submissions.forEach((sub, index) => {
      console.log(`--- Response ${index + 1} ---`);
      console.log(`Date: ${new Date(sub.createdAt).toLocaleDateString('en-US')}`);
      
      Object.entries(sub.data).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
  }
}

// Run examples
async function main() {
  console.log('=== Metigan Forms Examples ===\n');

  console.log('1. Creating contact form...');
  const contactForm = await createContactForm();

  console.log('\n2. Creating satisfaction survey...');
  const surveyForm = await createSurveyForm();

  if (contactForm) {
    console.log('\n3. Submitting data to form...');
    await submitForm(contactForm.id!);

    console.log('\n4. Publishing form...');
    await publishAndShare(contactForm.id!);
  }

  console.log('\n5. Analyzing all forms...');
  await analyzeAllForms();
}

main().catch(console.error);
