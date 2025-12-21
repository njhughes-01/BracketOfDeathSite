require('dotenv').config();
const axios = require('axios');

console.log('Environment Debug:');
console.log('API_URL:', 'http://localhost:3000/api');

const API_URL = 'http://localhost:3000/api';
// Force localhost for script execution since we are outside docker network
const KEYCLOAK_URL = 'http://localhost:8080';
const REALM = process.env.VITE_KEYCLOAK_REALM || process.env.KEYCLOAK_REALM || 'bracketofdeathsite';
const CLIENT_ID = process.env.VITE_KEYCLOAK_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID || 'bod-app';

console.log('Using Config:', { KEYCLOAK_URL, REALM, CLIENT_ID });

// Super admin credentials (from .env or defaults)
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin123';

async function getSuperAdminToken() {
    try {
        const params = new URLSearchParams();
        params.append('username', ADMIN_USERNAME);
        params.append('password', ADMIN_PASSWORD);
        params.append('grant_type', 'password');
        params.append('client_id', CLIENT_ID);

        const response = await axios.post(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Failed to get super admin token:', error.message);
        if (error.code) console.error('Code:', error.code);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        } else {
            console.error('Stack:', error.stack);
        }
        throw error;
    }
}

async function loginUser(username, password) {
    try {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        params.append('grant_type', 'password');
        params.append('client_id', CLIENT_ID);

        const response = await axios.post(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error) {
        console.error(`Failed to login user ${username}:`, error.response?.data || error.message);
        throw error;
    }
}

async function runVerification() {
    console.log('Starting Admin Fix Verification...');

    try {
        // 1. Get Super Admin Token
        const superToken = await getSuperAdminToken();
        console.log('✅ Super Admin authenticated');

        // 2. Create New Admin User
        const uniqueId = Math.floor(Math.random() * 10000);
        const newAdminUser = {
            username: `testadmin${uniqueId}`,
            email: `testadmin${uniqueId}@example.com`,
            password: 'password123',
            firstName: 'Test',
            lastName: 'Admin',
            roles: ['admin'] // Important: Assign admin role
        };

        console.log(`Creating new admin user: ${newAdminUser.username}...`);

        await axios.post(`${API_URL}/users`, newAdminUser, {
            headers: { Authorization: `Bearer ${superToken}` }
        });
        console.log('✅ New admin user created');

        // 3. Login as New Admin (Verifies "Account not setup" fix)
        console.log('Attempting login with new admin...');
        const adminToken = await loginUser(newAdminUser.username, newAdminUser.password);
        console.log('✅ Login successful (Account setup check passed)');

        // 4. Check Profile isComplete (Verifies Onboarding Loop fix)
        console.log('Checking profile completion status...');
        const profileResponse = await axios.get(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const isComplete = profileResponse.data.data.isComplete;
        console.log(`Profile isComplete: ${isComplete}`);

        if (isComplete === true) {
            console.log('✅ SUCCESS: Profile is marked complete (Onboarding skipped)');
        } else {
            console.error('❌ FAILURE: Profile is NOT marked complete (Would loop in onboarding)');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Test Execution Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

runVerification();
