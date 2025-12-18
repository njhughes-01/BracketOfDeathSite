
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

async function fixAndGenerate() {
    const token = await login();
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 1. Fetch to confirm ID
    console.log('Fetching list...');
    const listRes = await fetch(`${API_URL}/tournaments`, { headers });
    const listData = await listRes.json();
    const target = listData.data.find(t => t.bodNumber === 203012);

    if (!target) {
        console.error('Tournament 203012 not found.');
        process.exit(1);
    }
    const tId = target._id || target.id;
    console.log('Target ID:', tId);

    // 2. Patch bracketType
    // NOTE: If validation prevents "Mixed (Legacy)", this PUT might fail unless I specifically exclude 'format' or if validation is on 'modified' fields only.
    // But format is already there. Mongoose validates the whole doc on save usually.
    // Let's try to just update bracketType.
    console.log('Patching bracketType...');
    const updateRes = await fetch(`${API_URL}/tournaments/${tId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            bracketType: 'round_robin_playoff'
        })
    });

    if (!updateRes.ok) {
        console.error('Update failed:', updateRes.status, await updateRes.text());
        // If it fails due to format validation, we might be stuck unless we also fix the format to a valid one.
        // Let's TRY changing format to "Mixed Doubles" if it fails.
    } else {
        console.log('Update success!');
    }

    // 3. Generate Matches
    console.log('Generating Matches...');
    const genRes = await fetch(`${API_URL}/tournaments/${tId}/generate-matches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ round: 'RR_R1' })
    });

    if (!genRes.ok) {
        console.error('Generate matches failed:', genRes.status, await genRes.text());
        process.exit(1);
    }

    const genData = await genRes.json();
    console.log(`Generated ${genData.data ? genData.data.length : 0} matches.`);
    if (genData.data.length > 0) {
        console.log('Success! Matches generated.');
    }
}

fixAndGenerate();
