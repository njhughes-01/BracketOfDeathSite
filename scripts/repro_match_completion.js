
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

    const now = new Date('2024-01-15T12:00:00Z');
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const bodNumber = parseInt(`${year}${month}`, 10) + Math.floor(Math.random() * 100);
    // Wait, if validation requires strict YYYYMM matching date, adding random might fail validation?
    // "Date must match BOD number year and month"
    // So likely bodNumber MUST be EXACTLY YYYYMM?
    // If so, I cannot have multiple tournaments per month?
    // THAT seems like a bug or a strict rule.
    // Let's assume strict YYYYMM. And conflict exists.
    // I'll pick a random year between 2020 and 2030 to avoid conflict.

    const randomYear = 2020 + Math.floor(Math.random() * 10);
    const randomMonth = 1 + Math.floor(Math.random() * 12);
    const dateObj = new Date(Date.UTC(randomYear, randomMonth - 1, 15));
    const newBodNumber = parseInt(`${randomYear}${randomMonth.toString().padStart(2, '0')}`, 10);

    const tournamentData = {
        date: dateObj.toISOString(),
        format: "Men's Singles",
        location: 'Test Arena',
        maxPlayers: 4,
        bodNumber: newBodNumber,
        advancementCriteria: 'Winners advance, losers eliminated',
        name: 'Repro Tournament ' + Date.now(),
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
        console.log('First Player Data:', JSON.stringify(players[0]));
    } catch (e) {
        console.error('Failed to get players', e.message);
        process.exit(1);
    }

    tournamentData.players = players.map(p => p._id || p.id);
    console.log('Using Player IDs:', tournamentData.players);

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
    if (!createData.data) {
        console.error('Create returned no data:', JSON.stringify(createData));
        process.exit(1);
    }
    console.log('Create Response Data:', JSON.stringify(createData.data));
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
    console.log(`Generated ${matches.length} matches`);

    if (!matches || matches.length === 0) {
        console.error('No matches generated!');
        process.exit(1);
    }

    const match = matches[0];
    console.log('Match Structure:', JSON.stringify(match));
    const mId = match._id || match.id;
    console.log('Target Match:', mId, match.status);

    // Construct playerScores
    const p1Id = match.team1.players[0];
    const p2Id = match.team2.players[0];

    const updatePayload = {
        matchId: mId,
        team1Score: 11,
        team2Score: 8,
        status: 'completed',
        team1PlayerScores: [{ playerId: p1Id, playerName: 'Player 1', score: 11 }],
        team2PlayerScores: [{ playerId: p2Id, playerName: 'Player 2', score: 8 }]
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
    console.log('Update Response:', JSON.stringify(updateData));
    console.log('Update response status:', updateData.data.status);

    // 4. Verify Fetch
    console.log('Fetching matches again...');
    const fetchRes = await fetch(`${API_URL}/tournaments/${tId}/matches?round=RR_R1`, { headers });

    const fetchData = await fetchRes.json();
    const fetchedMatch = fetchData.data.find(m => m._id === match._id);
    console.log('Fetched match status:', fetchedMatch.status);

    if (fetchedMatch.status !== 'completed') {
        console.error('FAIL: Match status did not stick!');
    } else {
        console.log('SUCCESS: Match status is completed.');
    }

}

runTest();
