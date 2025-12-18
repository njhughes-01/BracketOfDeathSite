
const API_URL = 'http://localhost:8080/api';
const AUTH_URL = 'http://localhost:8080/auth/realms/bracketofdeathsite/protocol/openid-connect/token';

// Helper: Login
async function login() {
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
}

// Helper: Create Tournament
async function createTournament(token, type, bodNumber) {
    const bodStr = bodNumber.toString();
    // Default fallback
    let dateStr = `2033-03-14T12:00:00Z`;

    // If 6 digit (YYYYMM), derive date to pass validation
    if (bodStr.length === 6) {
        const year = bodStr.substring(0, 4);
        const month = bodStr.substring(4, 6);
        dateStr = `${year}-${month}-15T12:00:00Z`;
    }

    const payload = {
        date: dateStr,
        format: "Men's Singles",
        location: 'Elimination Test Lab',
        maxPlayers: 8,
        bodNumber: bodNumber,
        advancementCriteria: 'Bracket',
        bracketType: type, // 'single_elimination' or 'double_elimination'
        name: `${type} Test ${bodNumber}`
    };

    const res = await fetch(`${API_URL}/tournaments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`);
    return (await res.json()).data;
}

// Helper: Add Players
async function addPlayers(token, tournamentId, count) {
    // Fetch some players
    const pRes = await fetch(`${API_URL}/players?limit=${count}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const pData = await pRes.json();
    let players = pData.data;

    // Setup Tournament with players
    const storedPlayers = players.slice(0, count).map(p => ({
        id: p._id || p.id,
        name: p.name
    }));

    // Update tournament with teams
    const generatedTeams = storedPlayers.map((p, i) => ({
        teamId: `team_${i}`,
        players: [{
            playerId: p.id,
            playerName: p.name,
            seed: i + 1,
            statistics: {
                avgFinish: 1,
                winningPercentage: 0.5,
                totalChampionships: 0,
                bodsPlayed: 1,
                recentForm: 1
            }
        }],
        combinedSeed: i + 1,
        teamName: p.name,
        combinedStatistics: {
            avgFinish: 1,
            combinedWinPercentage: 0.5,
            totalChampionships: 0,
            combinedBodsPlayed: 1
        }
    }));

    // API might expect top-level `id` in update?
    const updatePayload = {
        id: tournamentId,
        generatedTeams: generatedTeams,
        players: storedPlayers.map(p => p.id)
    };

    const updateRes = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });
    if (!updateRes.ok) throw new Error(`Update teams failed: ${await updateRes.text()}`);

    // Verify persistence
    const checkRes = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const checkData = (await checkRes.json()).data;
    console.log(`Debug: Saved Teams: ${checkData.generatedTeams?.length}`);
    if (checkData.generatedTeams?.length > 0) {
        console.log('Debug: Team[0] structure:', JSON.stringify(checkData.generatedTeams[0], null, 2));
    }
    if (!checkData.generatedTeams || checkData.generatedTeams.length === 0) {
        throw new Error("Teams were not saved to tournament!");
    }
}

// Helper: Generate Matches
async function generateMatches(token, tournamentId, round = 'quarterfinal') {
    const res = await fetch(`${API_URL}/tournaments/${tournamentId}/generate-matches`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ round })
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Generate Matches failed: ${txt}`);
    }
    return await res.json();
}

// Helper: Get Matches
async function getMatches(token, tournamentId) {
    const res = await fetch(`${API_URL}/tournaments/${tournamentId}/matches`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return (await res.json()).data;
}

// Helper: Complete Match
async function completeMatch(token, matchId, winnerTeamObj, loserTeamObj) {
    const payload = {
        status: 'completed',
        ...winnerTeamObj,
        ...loserTeamObj
    };

    const res = await fetch(`${API_URL}/tournaments/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const txt = await res.text();
        console.error(`Complete Match failed: ${txt}`);
        return null;
    }
    return await res.json();
}


async function runSingleElimination() {
    console.log("=== Testing SINGLE ELIMINATION ===");
    const token = await login();

    // Fetch next BOD number to avoid collisions
    const bodRes = await fetch(`${API_URL}/tournaments/next-bod-number`);
    const bodData = await bodRes.json();
    const bodNumber = bodData.data.nextBodNumber;
    console.log(`Using BOD Number: ${bodNumber}`);

    // 1. Create
    let tourney;
    tourney = await createTournament(token, 'single_elimination', bodNumber);

    if (!tourney) {
        console.error("Failed to create tournament object");
        process.exit(1);
    }

    const tId = tourney._id || tourney.id;
    console.log(`Tournament Created: ${tId} (Single Elim)`);

    // 2. Add 8 Players (Teams)
    await addPlayers(token, tId, 8);
    console.log("Players/Teams added.");

    // 3. Generate initial matches (Quarterfinals)
    await generateMatches(token, tId, 'quarterfinal');
    let matches = await getMatches(token, tId);
    let qfMatches = matches.filter(m => m.round === 'quarterfinal');
    console.log(`Quarterfinals: ${qfMatches.length} matches (Expected 4)`);
    if (qfMatches.length !== 4) process.exit(1);

    // Debug match structure
    console.log('DEBUG: Match[0] structure:', JSON.stringify(qfMatches[0], null, 2));

    // 4. Complete QF
    for (const match of qfMatches) {
        const matchId = match._id || match.id;
        if (!matchId) throw new Error(`QF Match missing id: ${JSON.stringify(match)}`);

        // Correctly extract player ID.
        const p1 = match.team1.players[0];
        const p1Id = (p1 && (p1._id || p1.id)) ? (p1._id || p1.id) : p1;

        const p2 = match.team2.players[0];
        const p2Id = (p2 && (p2._id || p2.id)) ? (p2._id || p2.id) : p2;

        if (!p1Id || !p2Id) {
            console.error("Failed to extract player IDs from match:", JSON.stringify(match));
            process.exit(1);
        }

        // Team 1 wins
        console.log(`Completing QF Match ${matchId}...`);
        await completeMatch(token, matchId,
            { team1Score: 11, team1PlayerScores: [{ playerId: p1Id, score: 11 }] },
            { team2Score: 0, team2PlayerScores: [{ playerId: p2Id, score: 0 }] }
        );
    }
    console.log("QF Matches completed.");

    // 5. Advance (Generate SF)
    await generateMatches(token, tId, 'semifinal');

    matches = await getMatches(token, tId);
    let sfMatches = matches.filter(m => m.round === 'semifinal');
    console.log(`Semifinals: ${sfMatches.length} matches (Expected 2)`);
    if (sfMatches.length !== 2) {
        console.error("Failed to generate correct number of SF matches.");
        process.exit(1);
    }

    // 6. Complete SF
    for (const match of sfMatches) {
        const matchId = match._id || match.id;
        if (!matchId) throw new Error(`SF Match missing id: ${JSON.stringify(match)}`);

        const p1 = match.team1.players[0];
        const p1Id = (p1 && (p1._id || p1.id)) ? (p1._id || p1.id) : p1;
        const p2 = match.team2.players[0];
        const p2Id = (p2 && (p2._id || p2.id)) ? (p2._id || p2.id) : p2;

        // Team 1 wins
        console.log(`Completing SF Match ${matchId}...`);
        await completeMatch(token, matchId,
            { team1Score: 11, team1PlayerScores: [{ playerId: p1Id, score: 11 }] },
            { team2Score: 0, team2PlayerScores: [{ playerId: p2Id, score: 0 }] }
        );
    }
    console.log("SF Matches completed.");

    // 7. Advance (Generate Final)
    await generateMatches(token, tId, 'final');
    matches = await getMatches(token, tId);
    let fMatches = matches.filter(m => m.round === 'final');
    console.log(`Finals: ${fMatches.length} matches (Expected 1)`);
    if (fMatches.length !== 1) {
        console.error("Failed to generate Final match.");
        process.exit(1);
    }

    // 8. Complete Final
    const finalMatch = fMatches[0];
    const finalMatchId = finalMatch._id || finalMatch.id;
    console.log(`Final Match ID: ${finalMatchId}`);
    if (!finalMatchId) throw new Error(`Final Match missing id: ${JSON.stringify(finalMatch)}`);

    const p1 = finalMatch.team1.players[0];
    const p1Id = (p1 && (p1._id || p1.id)) ? (p1._id || p1.id) : p1;
    const p2 = finalMatch.team2.players[0];
    const p2Id = (p2 && (p2._id || p2.id)) ? (p2._id || p2.id) : p2;

    await completeMatch(token, finalMatchId,
        { team1Score: 11, team1PlayerScores: [{ playerId: p1Id, score: 11 }] },
        { team2Score: 5, team2PlayerScores: [{ playerId: p2Id, score: 5 }] }
    );
    console.log("Final Match completed.");

    // 9. Complete Tournament action
    const actionRes = await fetch(`${API_URL}/tournaments/${tId}/action`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_tournament' })
    });

    let actionData;
    if (actionRes.ok) {
        actionData = await actionRes.json();
        const msg = JSON.stringify(actionData);
        console.log('Action complete_tournament response:', msg.length > 500 ? msg.substring(0, 500) + '...' : msg);
    } else {
        console.error(`Action complete_tournament failed: ${await actionRes.text()}`);
    }

    // 10. Verify status
    const getRes = await fetch(`${API_URL}/tournaments/${tId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalState = (await getRes.json()).data;
    console.log(`Tournament Status: ${finalState.status}`);
    console.log(`Champion: ${JSON.stringify(finalState.champion)}`);

    if (finalState.status === 'completed' && finalState.champion) {
        console.log("SUCCESS: Single Elimination Verified.");
    } else {
        console.error("FAIL: Tournament did not complete correctly.");
        process.exit(1);
    }
}

runSingleElimination().catch(console.error);
