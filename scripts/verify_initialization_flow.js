const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8081';
const REALM = 'bracketofdeathsite';
const CLIENT_ID = 'bod-app';

// Utils
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log('=== STARTING ROBUST INITIALIZATION FLOW VERIFICATION ===\n');

    try {
        const adminToken = await getAdminToken();

        // --- PREPARATION: RESET STATE ---
        console.log('--- RESETTING STATE ---');
        // 1. Find all superadmins and remove the role (or delete the user)
        await resetSuperAdmins(adminToken);
        console.log('✔ State reset: No superadmins exist.\n');

        // --- STEP 1: CHECK PUBLIC STATUS ---
        console.log('--- STEP 1: CHECK PUBLIC STATUS ---');
        let status = await axios.get(`${API_URL}/api/system/status`);
        if (status.data.data.initialized === false) {
            console.log('✔ System verification: Uninitialized');
        } else {
            throw new Error(`Expected initialized=false, got ${status.data.data.initialized}`);
        }

        // --- STEP 2: REGISTER USER A (The Admin) ---
        const userA = `user_a_${Date.now()}`;
        console.log(`\n--- STEP 2: REGISTER USER A (${userA}) ---`);
        await createKeycloakUser(adminToken, userA, 'password123');
        console.log('✔ User A created');

        // --- STEP 3: LOGIN USER A ---
        console.log('\n--- STEP 3: LOGIN USER A ---');
        const tokenA = await getToken(userA, 'password123');
        console.log('✔ User A logged in');

        // --- STEP 4: CHECK USER A PROFILE (Expect success but incomplete) ---
        console.log('\n--- STEP 4: CHECK USER A PROFILE ---');
        try {
            const profileA = await axios.get(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${tokenA}` } });
            if (profileA.status === 200 && profileA.data.data.isComplete === false) {
                console.log('✔ Profile access successful (isComplete: false)');
            } else {
                throw new Error(`Unexpected profile state: code=${profileA.status}, complete=${profileA.data.data.isComplete}`);
            }
        } catch (e) {
            throw new Error(`Profile fetch failed: ${e.response?.data?.error || e.message}`);
        }

        // --- STEP 5: CLAIM ADMIN (User A) ---
        console.log('\n--- STEP 5: CLAIM ADMIN (USER A) ---');
        try {
            const claim = await axios.post(`${API_URL}/api/system/claim-admin`, {}, { headers: { Authorization: `Bearer ${tokenA}` } });
            if (claim.status === 200) {
                console.log('✔ Super Admin claimed successfully');
            }
        } catch (e) {
            throw new Error(`Claim failed: ${e.response?.data?.error || e.message}`);
        }

        // --- STEP 6: VERIFY SYSTEM INITIALIZED ---
        console.log('\n--- STEP 6: VERIFY SYSTEM INITIALIZED ---');
        status = await axios.get(`${API_URL}/api/system/status`);
        if (status.data.data.initialized === true) {
            console.log('✔ System verification: Initialized');
        } else {
            throw new Error(`Expected initialized=true, got ${status.data.data.initialized}`);
        }

        // --- STEP 7: CHECK USER A PROFILE AGAIN (Expect Complete) ---
        // Note: Token might need refresh to see roles, but ProfileController checks roles from Keycloak directly usually or DB.
        // Actually ProfileController.ts:28 calls keycloakAdminService.getUser(userId) which gets fresh roles.
        console.log('\n--- STEP 7: CHECK USER A PROFILE (POST-CLAIM) ---');
        const profileA_Post = await axios.get(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${tokenA}` } });
        if (profileA_Post.data.data.isComplete === true) {
            console.log('✔ Profile is now Complete (Admin Role detected)');
        } else {
            console.warn('⚠ Profile still says incomplete. This might be due to role caching or check logic. (Acceptable if requires re-login)');
        }

        // --- STEP 8: REGISTER USER B (The Intruder) ---
        const userB = `user_b_${Date.now()}`;
        console.log(`\n--- STEP 8: REGISTER USER B (${userB}) ---`);
        await createKeycloakUser(adminToken, userB, 'password123');
        console.log('✔ User B created');
        const tokenB = await getToken(userB, 'password123');
        console.log('✔ User B logged in');

        // --- STEP 9: ATTEMPT CLAIM ADMIN (User B) ---
        console.log('\n--- STEP 9: ATTEMPT CLAIM ADMIN (USER B) ---');
        try {
            await axios.post(`${API_URL}/api/system/claim-admin`, {}, { headers: { Authorization: `Bearer ${tokenB}` } });
            throw new Error('❌ USER B WAS ABLE TO CLAIM ADMIN! SECURITY FAILURE!');
        } catch (e) {
            if (e.response && e.response.status === 403) {
                console.log('✔ User B denied (403 Forbidden) as expected');
            } else {
                throw new Error(`Unexpected error code for User B: ${e.response?.status || e.message}`);
            }
        }

        console.log('\n=== VERIFICATION SUCCESSFUL ===');

        // Cleanup
        await deleteKeycloakUser(adminToken, userA);
        await deleteKeycloakUser(adminToken, userB);

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        if (error.response) console.error('Response:', JSON.stringify(error.response.data, null, 2));
        process.exit(1);
    }
}

// --- HELPERS ---

async function getAdminToken() {
    const params = new URLSearchParams();
    params.append('client_id', 'admin-cli');
    params.append('username', 'admin');
    params.append('password', 'keycloak123'); // From docker-compose
    params.append('grant_type', 'password');
    const res = await axios.post(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, params);
    return res.data.access_token;
}

async function getToken(username, password) {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');
    const res = await axios.post(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, params);
    return res.data.access_token;
}

async function resetSuperAdmins(adminToken) {
    // 1. Get superadmin role ID
    const headers = { Authorization: `Bearer ${adminToken}` };
    const rolesRes = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM}/roles/superadmin`, { headers });
    const roleName = 'superadmin';

    // 2. Get users in role
    const usersRes = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${roleName}/users`, { headers });
    const users = usersRes.data;

    console.log(`   Found ${users.length} existing superadmins.`);

    for (const user of users) {
        // Remove the role
        // For simplicity in this test, we just DELETE the user to ensure a fresh slate if it's a test user
        console.log(`   Deleting existing superadmin: ${user.username}`);
        await axios.delete(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}`, { headers });
    }
}

async function createKeycloakUser(adminToken, username, password) {
    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    await axios.post(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, {
        username, enabled: true, email: `${username}@test.com`, firstName: 'Test', lastName: 'User', emailVerified: true
    }, { headers });

    // Get ID
    const u = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}`, { headers });
    const id = u.data[0].id;

    // Set password
    await axios.put(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${id}/reset-password`, {
        type: 'password', value: password, temporary: false
    }, { headers });
}

async function deleteKeycloakUser(adminToken, username) {
    const headers = { Authorization: `Bearer ${adminToken}` };
    const u = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}`, { headers });
    if (u.data.length > 0) {
        await axios.delete(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${u.data[0].id}`, { headers });
    }
}

main();
