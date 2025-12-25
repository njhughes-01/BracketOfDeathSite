
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'src/backend/.env' });

// Config
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Test Data
const TEST_EMAIL = 'test-recipient@example.com';
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'sandbox.mailgun.org';
const MAILGUN_KEY = process.env.MAILGUN_API_KEY || 'key-placeholder';
const MAILJET_KEY = process.env.MAILJET_API_KEY || 'key-placeholder';
const MAILJET_SECRET = process.env.MAILJET_API_SECRET || 'secret-placeholder';

// Auth Credentials (assuming verify_full_lifecycle set these up or defaults)
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

async function getAuthToken() {
    console.log('🔑 Authenticating...');
    const client = axios.create({ baseURL: API_URL });

    try {
        // Try login
        const res = await client.post('/auth/login', {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        console.log('   ✅ Logged in as Admin');
        return res.data.token;
    } catch (e) {
        console.warn('   ⚠️ Login failed, trying to claim super admin fallback...');
        // Fallback: This only works if no admin exists, which is unlikely in dev but worth a shot if fresh db
        try {
            const claimRes = await client.post('/system/claim-admin');
            console.log('   ✅ Claimed Super Admin');
            return claimRes.data.token;
        } catch (claimErr) {
            console.error('   ❌ Auth failed. Please ensure Admin user exists (admin@test.com / password123) or DB is empty.');
            throw e;
        }
    }
}

async function runTest() {
    console.log('🚀 Starting Email Provider E2E Test...');

    let token;
    if (process.argv[2]) {
        token = process.argv[2];
    } else {
        try {
            token = await getAuthToken();
        } catch (e) {
            process.exit(1);
        }
    }

    const client = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` }
    });

    try {
        // 2. Get Current Settings
        console.log('📥 Fetching current settings...');
        const settingsRes = await client.get('/settings');
        const initialSettings = settingsRes.data.data;
        console.log('   Current Provider:', initialSettings.activeProvider);
        console.log('   Mailjet Configured:', initialSettings.mailjetConfigured);
        console.log('   Mailgun Configured:', initialSettings.mailgunConfigured);

        // 3. Test Mailjet
        console.log('📧 Testing Mailjet...');
        // Ensure keys are set (in case they weren't)
        const mailjetPayload = {
            activeProvider: 'mailjet',
            mailjetApiKey: initialSettings.hasApiKey ? undefined : MAILJET_KEY,
            mailjetApiSecret: initialSettings.hasApiSecret ? undefined : MAILJET_SECRET,
            mailjetSenderEmail: initialSettings.mailjetSenderEmail || 'noreply@bracketofdeath.com'
        };

        await client.put('/settings', mailjetPayload);

        try {
            await client.post('/settings/email/test', { testEmail: TEST_EMAIL });
            console.log('   ✅ Mailjet Test Email Sent (API accepted request)');
        } catch (e) {
            console.error('   ❌ Mailjet Test Failed:', e.response?.data?.error || e.message);
        }

        // 4. Switch to Mailgun & Test
        console.log('🔄 Switching to Mailgun...');
        const mailgunPayload = {
            activeProvider: 'mailgun',
            mailgunDomain: MAILGUN_DOMAIN,
            mailgunApiKey: MAILGUN_KEY
            // Intentionally not setting sender email as Mailgun uses domain
        };

        try {
            await client.put('/settings', mailgunPayload);
            console.log('   ✅ Switched to Mailgun');

            console.log('📧 Testing Mailgun...');
            try {
                await client.post('/settings/email/test', { testEmail: TEST_EMAIL });
                console.log('   ✅ Mailgun Test Email Sent (API accepted request)');
            } catch (e) {
                // Even if it fails due to invalid fake keys, we want to know the Service TRIED to use Mailgun.
                // The error message from backend should come from MailgunProvider or similar.
                console.error('   ❌ Mailgun Test Failed (Expected if invalid keys):', e.response?.data?.error || e.message);
            }

        } catch (e) {
            console.error('   ❌ Failed to switch to Mailgun:', e.response?.data?.error || e.message);
        }

        // 5. Revert to original settings
        console.log('REVERT: Restoring original provider...');
        await client.put('/settings', { activeProvider: initialSettings.activeProvider || 'mailjet' });
        console.log('   ✅ Restored');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) console.error('   Response:', error.response.data);
    }
}

runTest();
