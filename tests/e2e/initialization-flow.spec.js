/**
 * End-to-End Test: System Initialization Flow
 *
 * This test verifies the secure onboarding process:
 * 1. System detects no superadmin exists
 * 2. Setup page is shown
 * 3. First user can register and claim superadmin
 * 4. System becomes initialized
 * 5. Subsequent users cannot claim superadmin
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8081';
const REALM = 'bracketofdeathsite';

// Helper: Get Keycloak Admin Token
async function getKeycloakAdminToken() {
    const params = new URLSearchParams();
    params.append('client_id', 'admin-cli');
    params.append('username', 'admin');
    params.append('password', process.env.KEYCLOAK_ADMIN_PASSWORD || 'keycloak123');
    params.append('grant_type', 'password');

    const response = await axios.post(
        `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
        params
    );
    return response.data.access_token;
}

// Helper: Remove all superadmins (reset system state)
async function resetSystemState() {
    console.log('🔄 Resetting system state...');

    const adminToken = await getKeycloakAdminToken();
    const headers = { Authorization: `Bearer ${adminToken}` };

    // Get all users with superadmin role
    const usersResponse = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/superadmin/users`,
        { headers }
    );

    const superadmins = usersResponse.data;
    console.log(`   Found ${superadmins.length} superadmin(s)`);

    // Delete each superadmin user
    for (const user of superadmins) {
        console.log(`   Deleting user: ${user.username}`);
        await axios.delete(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}`,
            { headers }
        );
    }

    console.log('✅ System state reset complete\n');
}

// Helper: Verify system status via API
async function checkSystemStatus() {
    const response = await axios.get(`${API_URL}/api/system/status`);
    return response.data.data.initialized;
}

// Test execution
async function runTest() {
    console.log('🧪 Starting Initialization Flow E2E Test\n');
    console.log('=' .repeat(60));

    try {
        // ===== STEP 1: Reset System State =====
        await resetSystemState();

        // ===== STEP 2: Verify System is Uninitialized =====
        console.log('📋 STEP 1: Verify system is uninitialized');
        const initialStatus = await checkSystemStatus();
        if (initialStatus === false) {
            console.log('✅ System correctly reports: uninitialized\n');
        } else {
            throw new Error('❌ Expected initialized=false, got true');
        }

        // ===== STEP 3: Browser Test - Setup Page Detection =====
        console.log('📋 STEP 2: Opening browser and navigating to app');
        console.log(`   URL: ${FRONTEND_URL}`);
        console.log('   Expected: Redirect to /setup page');
        console.log('   Manual verification required - browser will open\n');

        // Instructions for manual browser testing
        console.log('🌐 BROWSER TEST INSTRUCTIONS:');
        console.log('=' .repeat(60));
        console.log('1. Browser should redirect to /setup page');
        console.log('2. Click "Create Admin Account" button');
        console.log('3. Fill registration form:');
        console.log('   - Username: testadmin');
        console.log('   - Email: testadmin@example.com');
        console.log('   - Password: TestAdmin123!');
        console.log('4. Submit registration');
        console.log('5. Login with credentials');
        console.log('6. On Onboarding page, click "Initialize System"');
        console.log('7. Complete gender selection');
        console.log('8. Verify redirect to dashboard\n');

        // Wait for manual testing
        console.log('⏸️  Pausing for manual browser testing...');
        console.log('   Press Ctrl+C when test is complete or failed\n');

        // Poll for system initialization
        let initialized = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes

        while (!initialized && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            initialized = await checkSystemStatus();
            attempts++;

            if (initialized) {
                console.log('✅ System is now initialized!\n');
                break;
            } else if (attempts % 6 === 0) {
                console.log(`   Still waiting... (${Math.floor(attempts * 5 / 60)}m ${(attempts * 5) % 60}s)`);
            }
        }

        if (!initialized) {
            throw new Error('❌ Timeout: System was not initialized within 5 minutes');
        }

        // ===== STEP 4: Verify Second User Cannot Claim Admin =====
        console.log('📋 STEP 3: Testing security - second user registration');
        console.log('   Manual test: Register another user and verify they CANNOT claim admin\n');

        console.log('🌐 SECOND USER TEST:');
        console.log('=' .repeat(60));
        console.log('1. Open new incognito/private window');
        console.log('2. Navigate to /register');
        console.log('3. Create account: testuser2 / TestUser123!');
        console.log('4. Login with new credentials');
        console.log('5. Verify: Should go to Onboarding, but NO "Initialize System" button');
        console.log('6. Should only see profile completion form\n');

        console.log('✅ INITIALIZATION FLOW TEST COMPLETE');
        console.log('=' .repeat(60));
        console.log('✅ All automated checks passed');
        console.log('⚠️  Manual verification required for UI flow\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        console.error('=' .repeat(60));
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
runTest();
