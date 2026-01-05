/**
 * Metigan Contacts & Audiences Examples
 * Demonstrates contact and audience management
 */

import Metigan from '../src';

// Initialize the client
const metigan = new Metigan({
  apiKey: process.env.METIGAN_API_KEY || 'your-api-key'
});

// ============================================
// AUDIENCES EXAMPLES
// ============================================

// Example 1: Create audiences
async function createAudiences() {
  try {
    // Main newsletter
    const newsletter = await metigan.audiences.create({
      name: 'Main Newsletter',
      description: 'Main newsletter subscriber list'
    });
    console.log('✅ Newsletter audience created:', newsletter.id);

    // Customers
    const customers = await metigan.audiences.create({
      name: 'Active Customers',
      description: 'Customers who made purchases'
    });
    console.log('✅ Customers audience created:', customers.id);

    // Leads
    const leads = await metigan.audiences.create({
      name: 'Leads',
      description: 'Interested potential customers'
    });
    console.log('✅ Leads audience created:', leads.id);

    return { newsletter, customers, leads };
  } catch (error) {
    console.error('Error creating audiences:', error);
  }
}

// Example 2: List and analyze audiences
async function analyzeAudiences() {
  try {
    const { audiences, pagination } = await metigan.audiences.list();

    console.log(`\n📊 ${pagination.total} Audiences found:\n`);

    for (const audience of audiences) {
      const stats = await metigan.audiences.getStats(audience.id!);

      console.log(`📋 ${audience.name}`);
      console.log(`   ${audience.description || 'No description'}`);
      console.log(`   Total: ${stats.total} | Subscribed: ${stats.subscribed} | Unsubscribed: ${stats.unsubscribed}`);
      console.log(`   Bounced: ${stats.bounced} | Complaints: ${stats.complained}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================
// CONTACTS EXAMPLES
// ============================================

// Example 3: Create contacts
async function createContacts(audienceId: string) {
  try {
    // Create single contact
    const contact1 = await metigan.contacts.create({
      email: 'john.doe@email.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1 (555) 987-6543',
      audienceId: audienceId,
      tags: ['customer', 'premium']
    });
    console.log('✅ Contact created:', contact1.email);

    // Create another contact
    const contact2 = await metigan.contacts.create({
      email: 'jane.smith@email.com',
      firstName: 'Jane',
      lastName: 'Smith',
      audienceId: audienceId,
      tags: ['lead', 'newsletter']
    });
    console.log('✅ Contact created:', contact2.email);

    return [contact1, contact2];
  } catch (error) {
    console.error('Error creating contacts:', error);
  }
}

// Example 4: Bulk import contacts
async function bulkImportContacts(audienceId: string) {
  try {
    const contacts = [
      { email: 'user1@example.com', firstName: 'User 1' },
      { email: 'user2@example.com', firstName: 'User 2' },
      { email: 'user3@example.com', firstName: 'User 3', tags: ['vip'] },
      { email: 'user4@example.com', firstName: 'User 4' },
      { email: 'user5@example.com', firstName: 'User 5', tags: ['newsletter'] },
    ];

    const result = await metigan.contacts.bulkImport(contacts, audienceId);

    console.log('\n📥 Bulk import:');
    console.log(`   Imported: ${result.imported}`);
    console.log(`   Failed: ${result.failed}`);

    if (result.errors && result.errors.length > 0) {
      console.log('   Errors:');
      result.errors.forEach(err => {
        console.log(`     - ${err.email}: ${err.error}`);
      });
    }

    return result;
  } catch (error) {
    console.error('Import error:', error);
  }
}

// Example 5: Search and filter contacts
async function searchContacts(audienceId: string) {
  try {
    // List all contacts in audience
    console.log('\n📋 Listing audience contacts...');
    const { contacts, pagination } = await metigan.contacts.list({
      audienceId: audienceId,
      status: 'subscribed',
      limit: 20
    });

    console.log(`Total: ${pagination.total} | Page: ${pagination.page} of ${pagination.pages}`);
    contacts.forEach(c => {
      console.log(`  - ${c.email} (${c.firstName || 'No name'}) - Tags: ${c.tags?.join(', ') || 'none'}`);
    });

    // Search by name
    console.log('\n🔍 Searching "doe"...');
    const searchResults = await metigan.contacts.search('doe', audienceId);
    searchResults.forEach(c => {
      console.log(`  - ${c.email} (${c.firstName} ${c.lastName})`);
    });

  } catch (error) {
    console.error('Search error:', error);
  }
}

// Example 6: Manage contact tags
async function manageContactTags(contactId: string) {
  try {
    console.log('\n🏷️ Managing contact tags...');

    // Add tags
    await metigan.contacts.addTags(contactId, ['vip', 'black-friday', '2024']);
    console.log('   ✅ Tags added: vip, black-friday, 2024');

    // Get updated contact
    const contact = await metigan.contacts.get(contactId);
    console.log(`   Current tags: ${contact.tags?.join(', ')}`);

    // Remove tags
    await metigan.contacts.removeTags(contactId, ['black-friday']);
    console.log('   ❌ Tag removed: black-friday');

  } catch (error) {
    console.error('Error managing tags:', error);
  }
}

// Example 7: Subscription management
async function manageSubscription(contactId: string) {
  try {
    console.log('\n📬 Managing subscription...');

    // Unsubscribe
    await metigan.contacts.unsubscribe(contactId);
    console.log('   ❌ Contact unsubscribed');

    // Get status
    let contact = await metigan.contacts.get(contactId);
    console.log(`   Current status: ${contact.status}`);

    // Re-subscribe
    await metigan.contacts.subscribe(contactId);
    console.log('   ✅ Contact resubscribed');

    contact = await metigan.contacts.get(contactId);
    console.log(`   Current status: ${contact.status}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 8: Clean audience
async function cleanAudience(audienceId: string) {
  try {
    console.log('\n🧹 Cleaning audience...');

    const statsBefore = await metigan.audiences.getStats(audienceId);
    console.log(`   Before: ${statsBefore.total} contacts (${statsBefore.bounced} bounced, ${statsBefore.unsubscribed} unsubscribed)`);

    const { removed } = await metigan.audiences.clean(audienceId);
    console.log(`   Removed: ${removed} contacts`);

    const statsAfter = await metigan.audiences.getStats(audienceId);
    console.log(`   After: ${statsAfter.total} contacts`);

  } catch (error) {
    console.error('Error cleaning:', error);
  }
}

// Example 9: Export contacts
async function exportContacts(audienceId: string) {
  try {
    console.log('\n📤 Exporting contacts...');

    // Export as JSON
    const jsonData = await metigan.contacts.export(audienceId, 'json');
    console.log(`   JSON: ${Array.isArray(jsonData) ? jsonData.length : 0} contacts exported`);

    // Export as CSV
    const csvData = await metigan.contacts.export(audienceId, 'csv');
    console.log(`   CSV: ${typeof csvData === 'string' ? csvData.split('\n').length - 1 : 0} rows`);

  } catch (error) {
    console.error('Export error:', error);
  }
}

// Run all examples
async function main() {
  console.log('=== Metigan Contacts & Audiences Examples ===\n');

  // Create audiences
  console.log('1. Creating audiences...');
  const audiences = await createAudiences();

  if (audiences) {
    // Create contacts
    console.log('\n2. Creating contacts...');
    const contacts = await createContacts(audiences.newsletter.id!);

    // Bulk import
    console.log('\n3. Bulk import...');
    await bulkImportContacts(audiences.newsletter.id!);

    // Search
    console.log('\n4. Searching contacts...');
    await searchContacts(audiences.newsletter.id!);

    if (contacts && contacts[0]) {
      // Manage tags
      console.log('\n5. Managing tags...');
      await manageContactTags(contacts[0].id!);

      // Subscription
      console.log('\n6. Managing subscription...');
      await manageSubscription(contacts[0].id!);
    }

    // Analyze audiences
    console.log('\n7. Analyzing audiences...');
    await analyzeAudiences();

    // Export
    console.log('\n8. Exporting contacts...');
    await exportContacts(audiences.newsletter.id!);
  }

  console.log('\n✅ Examples completed!');
}

main().catch(console.error);
