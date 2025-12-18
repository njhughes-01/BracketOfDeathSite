
const crypto = require('crypto');

// Configuration
const API_URL = 'http://localhost:8080/api'; // Proxied via Frontend
const AUTH_URL = 'http://localhost:8080/auth/realms/bracketofdeathsite/protocol/openid-connect/token'; // Proxied via Frontend
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.KEYCLOAK_ADMIN_PASSWORD || 'keycloak123'; // Note: docker-compose has keycloak123 for admin

// Colors for output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

const fs = require('fs');
const path = require('path');
const LOG_FILE = path.join(__dirname, 'api-test.log');

// Clear log file
fs.writeFileSync(LOG_FILE, '');

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
    const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ansi codes
    fs.appendFileSync(LOG_FILE, cleanMsg + '\n');
}

async function login() {

    log('Logging in...', colors.cyan);
    const params = new URLSearchParams();
    params.append('client_id', 'bod-app'); // From .env.example
    params.append('username', ADMIN_USER);
    params.append('password', 'admin123'); // Tournament Admin Password
    params.append('grant_type', 'password');

    // Note: client_secret might be needed if the client is not public. 
    // Assuming 'bracket-of-death-client' is public or we need to find the secret.
    // Based on docker-compose, KEYCLOAK_CLIENT_ID is used.

    // Let's try to fetch token
    // In many setups, the internal docker network might be needed if running from inside, 
    // but we are running from host. Host should hit localhost:8081.

    try {
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status} ${response.statusText} - ${await response.text()}`);
        }

        const data = await response.json();
        log('Login successful!', colors.green);
        return data.access_token;
    } catch (error) {
        log(`Login Error: ${error.message}`, colors.red);
        // Fallback for dev/test without keycloak if applicable? No, keycloak is fully integrated.
        process.exit(1);
    }
}

async function apiRequest(method, endpoint, token, body = null) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const responseData = await response.text();

    let json = null;
    try {
        json = JSON.parse(responseData);
    } catch (e) {
        // response was not json
    }

    return {
        status: response.status,
        ok: response.ok,
        data: json || responseData
    };
}

async function runTest() {
    try {
        // 1. Authenticate
        const token = await login();

        // Debug Token
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            log('Token Debug:', colors.yellow);
            console.log(`ISS: ${payload.iss}`);
            console.log(`AZP: ${payload.azp}`);
            console.log(`AUD: ${payload.aud}`);
            console.log(`SUB: ${payload.sub}`);
        } catch (e) {
            log('Failed to decode token for debug', colors.red);
        }

        // 2. Create Tournament
        log('\nCreating Tournament...', colors.cyan);

        // Use random future date to avoid collision
        const year = 2026 + Math.floor(Math.random() * 5); // 2026-2030
        const monthNum = Math.floor(Math.random() * 12) + 1;
        const month = String(monthNum).padStart(2, '0');
        const bodNumber = parseInt(`${year}${month}`);

        // Set date to 15th of that month
        const date = new Date(`${year}-${month}-15T12:00:00Z`);

        const tournamentData = {
            name: `Live Test Tournament ${bodNumber}`,
            date: date.toISOString(),
            startDate: date.toISOString(),
            endDate: new Date(date.getTime() + 86400000).toISOString(),
            bodNumber: bodNumber,
            format: "Men's Singles",
            bracketType: 'single_elimination',
            location: 'Test Location',
            advancementCriteria: 'Standard',
            matchType: 'SINGLES',
            status: 'scheduled',
            maxPlayers: 8
        };

        const createRes = await apiRequest('POST', '/tournaments', token, tournamentData); // Note: /tournaments not /admin/tournaments for creation
        if (!createRes.ok) {
            log(`Failed to create tournament. Status: ${createRes.status}`, colors.red);
            const dataStr = typeof createRes.data === 'object' ? JSON.stringify(createRes.data) : String(createRes.data);
            log(`Response Head: ${dataStr.substring(0, 500)}...`, colors.red);
            throw new Error(`Failed to create tournament`);
        }
        const tournamentId = createRes.data.data?._id || createRes.data.data?.id;
        log(`Tournament Created: ${tournamentId}`, colors.green);

        // 3. Register Players
        log('\nRegistering Players...', colors.cyan);
        // We need existing users or create dummy ones? 
        // Or can we add players by name? "players" array usually expects User IDs or Objects.
        // Let's assume we can add "guest" players or we need to fetch users first.
        // Let's try to fetch users.

        const usersRes = await apiRequest('GET', '/admin/users', token);
        let playerIds = [];
        // Handle paginated response (usersRes.data.docs) or standard list
        const usersList = usersRes.data.docs || usersRes.data.data || usersRes.data;

        if (usersRes.ok && Array.isArray(usersList)) {
            playerIds = usersList.map(u => u._id).slice(0, 4);
        }

        if (playerIds.length < 2) {
            log('Not enough users found (need 2). Skipping detailed player reg.', colors.yellow);
        } else {
            // Add 2 players to start
            const addPlayersRes = await apiRequest('POST', `/admin/tournaments/${tournamentId}/players`, token, {
                playerIds: playerIds.slice(0, 2)
            });
            if (addPlayersRes.ok) log('Players added!', colors.green);
            else log(`Failed to add players: ${JSON.stringify(addPlayersRes.data)}`, colors.red);
        }

        // 4. Start Tournament (Open -> Active)
        // First set to Open
        log('\nUpdating status to OPEN...', colors.cyan);
        await apiRequest('POST', `/admin/tournaments/${tournamentId}/status`, token, { status: 'open' });

        // Then Start (Generate Matches)
        log('\nGenerating Matches (Start)...', colors.cyan);
        const startRes = await apiRequest('POST', `/admin/tournaments/${tournamentId}/generate-matches`, token);
        if (startRes.ok) {
            log('Matches Generated!', colors.green);
        } else {
            // Might fail if not enough players
            log(`Generate matches result: ${startRes.status} - ${JSON.stringify(startRes.data)}`, colors.yellow);
        }

        // 5. Cleanup
        log('\nTest Completed (Success-ish).', colors.green);

    } catch (err) {
        log(`\nTest Failed: ${err.message}`, colors.red);
        console.error(err);
    }
}

runTest();
