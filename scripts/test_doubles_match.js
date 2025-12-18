
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

    // Fetch players
    let players = [];
    try {
        const pRes = await fetch(`${API_URL}/players`, { headers });
        if (!pRes.ok) throw new Error('Failed to get players');
        const pData = await pRes.json();
        players = pData.data.slice(0, 8);
        if (players.length < 8) {
            console.warn('Warning: Less than 8 players found, might not have enough for full bracket but enough for match.');
            if (players.length < 4) throw new Error('Not enough players for doubles match (need 4)');
        }
    } catch (e) {
        console.error('Failed to get players', e.message);
        process.exit(1);
    }

    const playerIds = players.map(p => p._id || p.id);

    // Define config outside loop so it's accessible later
    const teamFormationConfig = {
        method: 'random',
        parameters: {}
    };

    // 1. Create Tournament with retry logic
    let tId;
    let attempts = 0;
    while (!tId && attempts < 5) {
        attempts++;
        // Use fixed year range 2024-2029 to pass validation (must be < 10 years in future)
        const year = 2025 + Math.floor(Math.random() * 4);
        const month = Math.floor(Math.random() * 12) + 1;
        const day = 15;
        const dateObj = new Date(year, month - 1, day, 12, 0, 0);
        const monthStr = month.toString().padStart(2, '0');
        // BOD number must be 6 digits YYYYMM
        const newBodNumber = parseInt(`${year}${monthStr}`, 10);

        const tournamentData = {
            date: dateObj.toISOString(),
            format: "Men's Doubles", // DOUBLES
            location: 'Test Arena Doubles',
            maxPlayers: 8, // Enough for 4 teams of 2
            bodNumber: newBodNumber,
            advancementCriteria: 'Winners advance',
            name: `Repro Doubles ${newBodNumber} ${Date.now()}`,
            players: playerIds,
            teamFormationConfig: teamFormationConfig
        };

        console.log(`Creating tournament (Attempt ${attempts})... BOD: ${newBodNumber}`);
        const createRes = await fetch(`${API_URL}/tournaments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(tournamentData)
        });

        if (createRes.ok) {
            const createData = await createRes.json();
            tId = createData.data._id || createData.data.id;
            console.log('Tournament created:', tId);
        } else {
            const errText = await createRes.text();
            if (errText.includes('duplicate key') || errText.includes('Duplicate field value')) {
                console.warn(`Duplicate key for BOD ${newBodNumber}, retrying...`);
            } else {
                console.error('Create failed:', createRes.status, errText);
                process.exit(1);
            }
        }
    }

    if (!tId) {
        console.error('Failed to create tournament after 5 attempts');
        process.exit(1);
    }

    // 2. Generate Teams
    // The backend might expect us to call generate-teams and then update, OR
    // if we passed teamFormationConfig, maybe we can just trigger it?
    // Let's rely on the explicit flow: Generate Teams -> Update Tournament
    console.log('Generating Teams...');
    const genTeamsRes = await fetch(`${API_URL}/tournaments/generate-teams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            playerIds: playerIds,
            config: teamFormationConfig
        })
    });

    if (!genTeamsRes.ok) {
        console.error('Generate teams failed:', genTeamsRes.status, await genTeamsRes.text());
        process.exit(1);
    }

    const genTeamsData = await genTeamsRes.json();
    const teams = genTeamsData.data;
    console.log(`Generated ${teams.length} teams`);

    // 3. Update Tournament with Teams
    console.log('Updating Tournament with Teams...');
    const updateTournRes = await fetch(`${API_URL}/tournaments/${tId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            teams: teams
        })
    });

    if (!updateTournRes.ok) {
        console.error('Update tournament failed:', updateTournRes.status, await updateTournRes.text());
        // It's possible PUT /tournaments/:id doesn't accept 'teams' directly?
        // Let's check logs if this fails.
        process.exit(1);
    }
    console.log('Tournament updated with teams');

    // 4. Generate Matches (Round Robin for simplicity or Bracket)
    console.log('Generating Matches...');
    const genMatchesRes = await fetch(`${API_URL}/tournaments/${tId}/generate-matches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ round: 'RR_R1' })
    });

    if (!genMatchesRes.ok) {
        console.error('Generate matches failed:', genMatchesRes.status, await genMatchesRes.text());
        process.exit(1);
    }

    const genMatchesData = await genMatchesRes.json();
    const matches = genMatchesData.data;
    if (!matches || matches.length === 0) {
        console.error('No matches generated!');
        process.exit(1);
    }

    const match = matches[0];
    const mId = match._id || match.id;
    console.log('Target Match:', mId);

    // Verify Team Size
    const t1Size = match.team1.players.length;
    const t2Size = match.team2.players.length;
    console.log(`Team Sizes: ${t1Size} vs ${t2Size}`);

    if (t1Size !== 2 || t2Size !== 2) {
        console.error('FAIL: Expected teams of 2 for Doubles!');
        // process.exit(1); // Don't exit hard, let's see if we can still score
    } else {
        console.log('SUCCESS: Teams have 2 players each.');
    }

    // 5. Complete Match
    const t1p1 = match.team1.players[0];
    const t1p2 = match.team1.players[1];
    const t2p1 = match.team2.players[0];
    const t2p2 = match.team2.players[1];

    const updatePayload = {
        matchId: mId,
        team1Score: 11,
        team2Score: 9,
        status: 'completed',
        team1PlayerScores: [
            { playerId: t1p1, playerName: 'T1P1', score: 11 },
            { playerId: t1p2, playerName: 'T1P2', score: 11 } // In doubles, do partners get same score?
            // Usually in doubles stats, "score" might be the team score?
            // Or individual contribution?
            // For now, let's assume they get the team score.
        ],
        team2PlayerScores: [
            { playerId: t2p1, playerName: 'T2P1', score: 9 },
            { playerId: t2p2, playerName: 'T2P2', score: 9 }
        ]
    };

    console.log('Completing match...');
    const matchUpdateRes = await fetch(`${API_URL}/tournaments/matches/${mId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload)
    });

    if (!matchUpdateRes.ok) {
        console.error('Match update failed:', matchUpdateRes.status, await matchUpdateRes.text());
        process.exit(1);
    }

    const matchUpdateData = await matchUpdateRes.json();
    console.log('Match Update Status:', matchUpdateData.data.status);

    if (matchUpdateData.data.status === 'completed') {
        console.log('SUCCESS: Doubles match completed.');
    } else {
        console.error('FAIL: Match not completed.');
    }
}

runTest();
