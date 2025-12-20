/**
 * Test script for Email Settings and Branding API
 * Run with: node scripts/test-email-settings.js
 */

const BASE_URL = 'http://localhost:8080/api';

// Admin credentials for Keycloak
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';
const KEYCLOAK_URL = 'http://localhost:8180';

async function getAdminToken() {
    console.log('\n📧 Getting admin token from Keycloak...');

    const response = await fetch(`${KEYCLOAK_URL}/realms/bracket-of-death/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'password',
            client_id: 'bod-app',
            username: ADMIN_USER,
            password: ADMIN_PASS,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to get token: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Got admin token');
    return data.access_token;
}

async function testEmailStatus(token) {
    console.log('\n📧 Testing GET /api/settings/email/status...');

    const response = await fetch(`${BASE_URL}/settings/email/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
        console.log(`✅ Email configured: ${data.data.configured}`);
    } else {
        console.log('❌ Failed to check email status');
    }

    return data;
}

async function testGetSettings(token) {
    console.log('\n📧 Testing GET /api/settings...');

    const response = await fetch(`${BASE_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
        console.log('✅ Got settings successfully');
        console.log(`   Brand Name: ${data.data.brandName}`);
        console.log(`   Primary Color: ${data.data.brandPrimaryColor}`);
        console.log(`   Secondary Color: ${data.data.brandSecondaryColor}`);
        console.log(`   Has Logo: ${!!data.data.siteLogo}`);
        console.log(`   Mailjet Configured: ${data.data.mailjetConfigured}`);
    } else {
        console.log('❌ Failed to get settings');
    }

    return data;
}

async function testUpdateBranding(token) {
    console.log('\n📧 Testing PUT /api/settings (update branding)...');

    const response = await fetch(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            brandName: 'Test Brand Name',
            brandPrimaryColor: '#FF5733',
            brandSecondaryColor: '#33C1FF',
        }),
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
        console.log('✅ Branding updated successfully');
    } else {
        console.log('❌ Failed to update branding');
    }

    return data;
}

async function testRevertBranding(token) {
    console.log('\n📧 Reverting branding to defaults...');

    const response = await fetch(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            brandName: 'Bracket of Death',
            brandPrimaryColor: '#4CAF50',
            brandSecondaryColor: '#008CBA',
        }),
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Branding reverted to defaults');
    } else {
        console.log('❌ Failed to revert branding');
    }

    return data;
}

async function runTests() {
    console.log('🧪 Starting Email Settings & Branding API Tests\n');
    console.log('='.repeat(50));

    try {
        // Get admin token
        const token = await getAdminToken();

        // Test email status endpoint
        await testEmailStatus(token);

        // Test get settings
        const initialSettings = await testGetSettings(token);

        // Test update branding
        await testUpdateBranding(token);

        // Verify the update
        await testGetSettings(token);

        // Revert to defaults
        await testRevertBranding(token);

        // Final verification
        await testGetSettings(token);

        console.log('\n' + '='.repeat(50));
        console.log('🎉 All tests completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
