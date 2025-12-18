
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

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Login failed:', error);
        process.exit(1);
    }
}

async function runTest() {
    const token = await login();
    console.log('Got token');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Use a wide range of years to avoid collision
    const year = 2025 + Math.floor(Math.random() * 50);
    const month = Math.floor(Math.random() * 12) + 1; // 1-12
    const day = 15;
    const dateObj = new Date(year, month - 1, day, 12, 0, 0); // Month is 0-indexed in Date constructor

    const monthStr = month.toString().padStart(2, '0');
    // BOD number MUST be 6 digits YYYYMM
    const newBodNumber = parseInt(`${year}${monthStr}`, 10);

    const dateString = dateObj.toISOString();

    const tournamentData = {
        date: dateObj.toISOString(),
        format: "Men's Singles",
        location: 'Test Arena Zero Score',
        maxPlayers: 4,
        bodNumber: newBodNumber,
        advancementCriteria: 'Winners advance, losers eliminated',
        name: 'Repro Zero Score ' + Date.now(),
        players: []
    };

    // Fetch players first
    let players = [];
    try {
        const pRes = await fetch(`${API_URL}/players`, { headers });
        if (!pRes.ok) throw new Error('Failed to get players');
        const pData = await pRes.json();
        players = pData.data.slice(0, 4);
        if (players.length < 4) throw new Error('Not enough players');
    } catch (e) {
        console.error('Failed to get players', e.message);
        process.exit(1);
    }

    tournamentData.players = players.map(p => p._id || p.id);

    console.log('Creating tournament...');
    const createRes = await fetch(`${API_URL}/tournaments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tournamentData)
    });

    if (!createRes.ok) {
        console.error('Create failed:', createRes.status, await createRes.text());
        process.exit(1);
    }

    const createData = await createRes.json();
    const tId = createData.data._id || createData.data.id;
    console.log('Tournament created:', tId);

    // 2. Start (Round Robin)
    console.log('Generating Matches for RR_R1...');
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
    const matches = genData.data;
    const match = matches[0];
    const mId = match._id || match.id;
    console.log('Target Match:', mId);

    // Construct playerScores with 11-0
    const p1Id = match.team1.players[0]; // Player 1
    const p2Id = match.team2.players[0]; // Player 2

    console.log('Completing match with 11-0 score...');
    const updatePayload = {
        matchId: mId,
        team1Score: 11,
        team2Score: 0,
        status: 'completed',
        team1PlayerScores: [{ playerId: p1Id, playerName: 'Player 1', score: 11 }],
        team2PlayerScores: [{ playerId: p2Id, playerName: 'Player 2', score: 0 }]
    };

    const updateRes = await fetch(`${API_URL}/tournaments/matches/${mId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
        console.error('Update failed:', updateRes.status, await updateRes.text());
        process.exit(1);
    }

    const updateData = await updateRes.json();
    console.log('Update Response Status:', updateData.data.status);
    console.log('Update Response Score:', updateData.data.scoreDisplay);

    if (updateData.data.status === 'completed' && (updateData.data.team1.score === 11 && updateData.data.team2.score === 0)) {
        console.log('SUCCESS: Match completed with 11-0 score.');
    } else {
        console.error('FAIL: Status or score mismatch');
    }
}

runTest();
