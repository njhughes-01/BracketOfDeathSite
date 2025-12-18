
const API_URL = 'http://localhost:8080/api';
const AUTH_URL = 'http://localhost:8080/auth/realms/bracketofdeathsite/protocol/openid-connect/token';

async function login() {
    try {
        const params = new URLSearchParams();
        params.append('client_id', 'bod-app');
        params.append('username', 'admin');
        params.append('password', 'admin123');
        params.append('grant_type', 'password');

        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!response.ok) throw new Error(`Login failed: ${response.status}`);
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Login failed:', error);
        process.exit(1);
    }
}

async function runDebug() {
    const token = await login();
    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch all tournaments and find 203012 (or filter if API supports it)
    // The API supports ?bodNumber=... ? Let's try listing and filtering.
    // Or simpler: The user said 203012. 

    console.log('Fetching tournaments...');
    const res = await fetch(`${API_URL}/tournaments`, { headers });
    if (!res.ok) {
        console.error('Failed to list tournaments');
        process.exit(1);
    }

    const data = await res.json();
    const tournaments = data.data; // Assuming standard response structure

    const target = tournaments.find(t => t.bodNumber === 203012);

    if (!target) {
        console.error('Tournament 203012 not found via list. It might be in a different state or I need to search better.');
        // Try searching specifically if possible, or just exit.
        process.exit(1);
    }

    console.log('Found Target Tournament:', target._id || target.id);
    console.log('Format:', target.format);
    console.log('Bracket Type:', target.bracketType);
    console.log('Teams Count:', target.teams ? target.teams.length : 0);
    console.log('Players Count:', target.players ? target.players.length : 0);

    // Detailed fetch
    const detailRes = await fetch(`${API_URL}/tournaments/${target._id || target.id}`, { headers });
    const detailData = await detailRes.json();
    console.log('Full Details:', JSON.stringify(detailData.data, null, 2));

}

runDebug();
