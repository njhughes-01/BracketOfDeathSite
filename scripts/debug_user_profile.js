const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8081';
const REALM = 'bracketofdeathsite';
const CLIENT_ID = 'bod-app';

async function main() {
    const timestamp = Date.now();
    const username = `debug_user_${timestamp}`;
    const password = 'password123';
    const email = `${username}@example.com`;
    const firstName = 'Debug';
    const lastName = 'User';

    console.log(`\n=== Debugging Profile for new user: ${username} ===\n`);

    // 1. Register
    console.log('1. Registering user...');
    try {
        // Keycloak registration via Admin API is hard without admin token.
        // We should use the App's public registration if available, but we don't have one exposed as API easily without simulating browser.
        // However, Keycloak has a registration endpoint if enabled.
        // But easier: verify_user_actions.js uses Admin API.
        // Let's use the Admin API to create the user, just like verify_user_actions.js does.

        // Auth as Admin first to create user
        const adminToken = await getAdminToken();
        await createKeycloakUser(adminToken, username, email, firstName, lastName, password);
        console.log('   User created successfully.');
    } catch (error) {
        if (error.response) {
            console.error('   Failed to register - Status:', error.response.status);
            console.error('   Failed to register - Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Failed to register (No Response):', error);
        }
        return;
    }

    // 2. Login as the new user
    console.log('\n2. Logging in as new user...');
    let userToken;
    try {
        userToken = await getToken(username, password);
        console.log('   Login successful.');
    } catch (error) {
        console.error('   Login failed:', error.response?.data || error.message);
        return;
    }

    // 3. Inspect Token
    console.log('\n3. Inspecting Token...');
    const decoded = jwt.decode(userToken);
    console.log('   Roles:', decoded.realm_access?.roles);

    const isAdmin = decoded.realm_access?.roles?.includes('admin');
    console.log('   Has "admin" role?', isAdmin);
    const isSuperAdmin = decoded.realm_access?.roles?.includes('superadmin');
    console.log('   Has "superadmin" role?', isSuperAdmin);

    // 4. Get Profile
    console.log('\n4. Fetching /api/profile...');
    try {
        const response = await axios.get(`${API_URL}/api/profile`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('   Response Status:', response.status);
        console.log('   Response Data:', JSON.stringify(response.data, null, 2));

        const isComplete = response.data.data.isComplete;
        console.log('   isComplete:', isComplete);

        if (isComplete) {
            console.log('   WARNING: isComplete is TRUE. This user will SKIP onboarding.');
        } else {
            console.log('   OK: isComplete is FALSE. This user should see onboarding.');
        }

    } catch (error) {
        if (error.response) {
            console.error('   Failed to get profile - Status:', error.response.status);
            console.error('   Failed to get profile - Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Failed to get profile:', error.message);
        }
    }

    // 5. Clean up
    console.log('\n5. Cleaning up...');
    try {
        const adminToken = await getAdminToken();
        const headers = { Authorization: `Bearer ${adminToken}` };
        const users = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}`, { headers });
        if (users.data.length > 0) {
            await axios.delete(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${users.data[0].id}`, { headers });
            console.log('   Test user deleted.');
        }
    } catch (e) {
        console.error('   Cleanup failed', e.message);
    }
}

async function getAdminToken() {
    const params = new URLSearchParams();
    params.append('client_id', 'admin-cli');
    params.append('username', 'admin');
    params.append('password', 'keycloak123');
    params.append('grant_type', 'password');

    const response = await axios.post(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, params);
    return response.data.access_token;
}

async function getToken(username, password) {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');
    // client_secret not needed for public client, but if env var set...

    const response = await axios.post(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, params);
    return response.data.access_token;
}

async function createKeycloakUser(adminToken, username, email, firstName, lastName, password) {
    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    // Create User
    const userPayload = {
        username,
        email,
        firstName,
        lastName,
        enabled: true,
        emailVerified: true
    };

    const createRes = await axios.post(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, userPayload, { headers });

    // Get ID
    const usersRes = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}`, { headers });
    const userId = usersRes.data[0].id;

    // Set Password
    await axios.put(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`, {
        type: 'password',
        value: password,
        temporary: false
    }, { headers });
}

main();
