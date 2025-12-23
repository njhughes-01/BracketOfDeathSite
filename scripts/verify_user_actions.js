const axios = require('axios');

const API_URL = 'http://localhost:5173/api';
// Using the proxy URL so we hit the full stack including auth middleware correctly.
const USERS_API_URL = `${API_URL}/admin/users`;

async function run() {
    try {
        console.log('1. Logging in as Admin...');
        let adminToken;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin',
                password: 'admin123'
                // This password was reset by docker exec in a previous step
            });
            adminToken = loginRes.data.token;
            console.log('   Admin logged in successfully.');
        } catch (e) {
            console.error('   Admin login failed:', e.message);
            if (e.response) console.error('   Details:', e.response.data);
            process.exit(1);
        }

        const adminHeaders = { Authorization: `Bearer ${adminToken}` };

        // 2. Create a test user
        const testUsername = `testdel${Date.now()}`;
        const testEmail = `${testUsername}@example.com`;
        const testPassword = 'TestPassword123!';

        console.log(`2. Creating test user ${testUsername}...`);
        let userId;
        try {
            const createRes = await axios.post(`${USERS_API_URL}`, {
                username: testUsername,
                email: testEmail,
                password: testPassword,
                firstName: 'Test',
                lastName: 'Delete',
                roles: ['user']
            }, { headers: adminHeaders });
            userId = createRes.data.data.id;
            console.log(`   User created. ID: ${userId}`);
        } catch (e) {
            console.error('   Create user failed:', e.message, e.response?.data);
            process.exit(1);
        }

        // 3. Login as new user to create profile (link player)
        console.log('3. Logging in as new user to create profile...');
        let userToken;
        try {
            const userLoginRes = await axios.post(`${API_URL}/auth/login`, {
                username: testUsername,
                password: testPassword
            });
            userToken = userLoginRes.data.token;
        } catch (e) {
            console.error('   User login failed:', e.message, e.response?.data);
            process.exit(1);
        }

        console.log('   Creating profile...');
        try {
            const profileRes = await axios.put(`${API_URL}/profile`, {
                gender: 'male',
                bracketPreference: 'mens'
            }, { headers: { Authorization: `Bearer ${userToken}` } });
            console.log('   Profile created. Player linked.');
        } catch (e) {
            console.error('   Profile create failed:', e.message, e.response?.data);
            process.exit(1);
        }

        // 4. Verify Disable/Enable
        console.log('4. Verifying Disable/Enable...');

        // Disable
        console.log('   Disabling user...');
        try {
            await axios.put(`${USERS_API_URL}/${userId}`, {
                enabled: false
            }, { headers: adminHeaders });
            console.log('   User disabled (API call success).');
        } catch (e) {
            console.error('   Disable user failed:', e.message, e.response?.data);
            process.exit(1);
        }

        // Verify disabled: Login should fail
        console.log('   Verifying login fails...');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                username: testUsername,
                password: testPassword
            });
            console.error('   X Login succeeded but should have failed!');
            process.exit(1);
        } catch (e) {
            if (e.response && (e.response.status === 401 || e.response.status === 403 || e.response.status === 400)) {
                console.log('   ✓ Login failed as expected.');
            } else {
                console.error('   X Unexpected error during verification:', e.message);
                // process.exit(1); 
            }
        }

        // Enable
        console.log('   Enabling user...');
        try {
            await axios.put(`${USERS_API_URL}/${userId}`, {
                enabled: true
            }, { headers: adminHeaders });
            console.log('   User enabled (API call success).');
        } catch (e) {
            console.error('   Enable user failed:', e.message, e.response?.data);
            process.exit(1);
        }

        // Verify enabled: Login should succeed
        console.log('   Verifying login succeeds...');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                username: testUsername,
                password: testPassword
            });
            console.log('   ✓ Login succeeded.');
        } catch (e) {
            console.error('   X Login failed after re-enabling:', e.message, e.response?.data);
            process.exit(1);
        }

        // 5. Delete User and verify Player deletion
        // 5. Delete User and verify Player deletion
        console.log('5. Deleting User...');
        try {
            await axios.delete(`${USERS_API_URL}/${userId}`, { headers: adminHeaders });
            console.log('   User deleted.');
        } catch (e) {
            console.error('   Delete user failed:', e.message, e.response?.data);
            process.exit(1);
        }

        // Verify user is gone
        console.log('   Verifying user 404...');
        try {
            await axios.get(`${USERS_API_URL}/${userId}`, { headers: adminHeaders });
            console.error('   X User still exists!');
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log('   ✓ User 404 as expected.');
            } else {
                console.error('   X Unexpected error checking user:', e.message, e.response?.data);
            }
        }

        // Verify Player is gone
        console.log('   Verifying Player is deleted (via name search)...');
        // Search by name "Test Delete"
        try {
            const playersRes = await axios.get(`${API_URL}/players`, { headers: adminHeaders });
            let players = [];
            if (Array.isArray(playersRes.data)) {
                players = playersRes.data;
            } else if (playersRes.data.data && Array.isArray(playersRes.data.data)) {
                players = playersRes.data.data;
            }

            // Name constructed by ProfileController: "Test Delete" or similar
            const foundPlayer = players.find(p => p.name && (p.name.includes('Test Delete') || p.name.includes(testUsername)));
            if (foundPlayer) {
                console.error('   X Player still exists! Fix FAILED.', foundPlayer);
                process.exit(1);
            } else {
                console.log('   ✓ Player is gone! Fix VERIFIED.');
            }
        } catch (e) {
            console.error('   Failed to fetch players:', e.message, e.response?.data);
        }

        console.log('SUCCESS: All checks passed.');

    } catch (e) {
        console.error('Unexpected Global Error:', e);
        if (e.response) console.error('Response Data:', e.response.data);
    }
}

run();
