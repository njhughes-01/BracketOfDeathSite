
const API_URL = 'http://localhost:8080/api';
const AUTH_URL = 'http://localhost:8080/auth/realms/bracketofdeathsite/protocol/openid-connect/token';

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

async function createTournament(token, type, bodNumber) {
    const bodStr = bodNumber.toString();
    let dateStr = `2033-03-14T12:00:00Z`; // Default
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
        bracketType: type,
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

async function addPlayers(token, tournamentId, count) {
    const pRes = await fetch(`${API_URL}/players?limit=${count}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const pData = await pRes.json();
    let players = pData.data;

    const storedPlayers = players.slice(0, count).map(p => ({
        id: p._id || p.id,
        name: p.name
    }));

    const generatedTeams = storedPlayers.map((p, i) => ({
        teamId: `team_${i}`,
        players: [{
            playerId: p.id,
            playerName: p.name,
            seed: i + 1,
            statistics: { avgFinish: 1, winningPercentage: 0.5, totalChampionships: 0, bodsPlayed: 1, recentForm: 1 }
        }],
        combinedSeed: i + 1,
        teamName: p.name,
        combinedStatistics: { avgFinish: 1, combinedWinPercentage: 0.5, totalChampionships: 0, combinedBodsPlayed: 1 }
    }));

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
}

async function generateMatches(token, tournamentId, round) {
    const res = await fetch(`${API_URL}/tournaments/${tournamentId}/generate-matches`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ round })
    });
    if (!res.ok) {
        throw new Error(`Generate Matches ${round} failed: ${await res.text()}`);
    }
    return await res.json();
}

async function getMatches(token, tournamentId) {
    const res = await fetch(`${API_URL}/tournaments/${tournamentId}/matches`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return (await res.json()).data;
}

async function completeMatch(token, matchId, winnerTeamObj, loserTeamObj) {
    if (!matchId || matchId === 'undefined') throw new Error("Attempted to complete match with null/undefined ID");

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
        throw new Error(`Complete Match ${matchId} failed: ${await res.text()}`);
    }
    return await res.json();
}

async function runDoubleElimination() {
    console.log("=== Testing DOUBLE ELIMINATION ===");
    const token = await login();

    const bodRes = await fetch(`${API_URL}/tournaments/next-bod-number`);
    const bodData = await bodRes.json();
    const bodNumber = bodData.data.nextBodNumber;
    console.log(`Using BOD Number: ${bodNumber}`);

    // 1. Create
    let tourney = await createTournament(token, 'double_elimination', bodNumber);
    const tId = tourney._id || tourney.id;
    console.log(`Tournament Created: ${tId}`);

    // 2. Add Players
    await addPlayers(token, tId, 8);
    console.log("Players added.");

    // 3. QF
    await generateMatches(token, tId, 'quarterfinal');
    let matches = await getMatches(token, tId);
    let qfMatches = matches.filter(m => m.round === 'quarterfinal');
    if (qfMatches.length !== 4) throw new Error(`Expected 4 QF matches, got ${qfMatches.length}`);
    console.log("QF matches generated.");

    for (const match of qfMatches) {
        const matchId = match._id || match.id;
        const p1 = match.team1.players[0];
        const p2 = match.team2.players[0];
        const p1Id = p1._id || p1.id || p1;
        const p2Id = p2._id || p2.id || p2;

        // P1 wins (11-0)
        await completeMatch(token, matchId,
            { team1Score: 11, team1PlayerScores: [{ playerId: p1Id, score: 11 }] },
            { team2Score: 0, team2PlayerScores: [{ playerId: p2Id, score: 0 }] }
        );
    }
    console.log("QF completed.");

    // 4. SF
    await generateMatches(token, tId, 'semifinal');
    matches = await getMatches(token, tId);
    let sfMatches = matches.filter(m => m.round === 'semifinal');
    if (sfMatches.length !== 2) throw new Error(`Expected 2 SF matches, got ${sfMatches.length}`);
    console.log("SF matches generated.");

    for (const match of sfMatches) {
        const matchId = match._id || match.id;
        const p1 = match.team1.players[0];
        const p2 = match.team2.players[0];
        const p1Id = p1._id || p1.id || p1;
        const p2Id = p2._id || p2.id || p2;

        await completeMatch(token, matchId,
            { team1Score: 11, team1PlayerScores: [{ playerId: p1Id, score: 11 }] },
            { team2Score: 5, team2PlayerScores: [{ playerId: p2Id, score: 5 }] }
        );
    }
    console.log("SF completed.");

    // 5. Final (WB Final)
    await generateMatches(token, tId, 'final');
    matches = await getMatches(token, tId);
    let wbFinalMatches = matches.filter(m => m.round === 'final');
    if (wbFinalMatches.length !== 1) throw new Error(`Expected 1 Final match, got ${wbFinalMatches.length}`);

    const wbFinal = wbFinalMatches[0];
    const wbFinalId = wbFinal._id || wbFinal.id;
    const wbfP1 = wbFinal.team1.players[0];
    const wbfP2 = wbFinal.team2.players[0];

    await completeMatch(token, wbFinalId,
        { team1Score: 11, team1PlayerScores: [{ playerId: wbfP1._id || wbfP1, score: 11 }] },
        { team2Score: 8, team2PlayerScores: [{ playerId: wbfP2._id || wbfP2, score: 8 }] }
    );
    console.log("WB Final completed.");

    // 6. LBR-Round-1
    await generateMatches(token, tId, 'lbr-round-1');
    matches = await getMatches(token, tId);
    let lbr1Matches = matches.filter(m => m.round === 'lbr-round-1');
    if (lbr1Matches.length !== 2) throw new Error(`Expected 2 LBR-R1 matches, got ${lbr1Matches.length}`);

    for (const match of lbr1Matches) {
        const matchId = match._id || match.id;
        const p1 = match.team1.players[0];
        const p2 = match.team2.players[0];
        await completeMatch(token, matchId,
            { team1Score: 11, team1PlayerScores: [{ playerId: p1._id || p1, score: 11 }] },
            { team2Score: 9, team2PlayerScores: [{ playerId: p2._id || p2, score: 9 }] }
        );
    }
    console.log("LBR-R1 completed.");

    // 7. LBR-Semifinal
    await generateMatches(token, tId, 'lbr-semifinal');
    matches = await getMatches(token, tId);
    let lbrSfMatches = matches.filter(m => m.round === 'lbr-semifinal');
    if (lbrSfMatches.length !== 2) throw new Error(`Expected 2 LBR-SF matches, got ${lbrSfMatches.length}`);

    for (const match of lbrSfMatches) {
        const matchId = match._id || match.id;
        const p1 = match.team1.players[0];
        const p2 = match.team2.players[0];
        await completeMatch(token, matchId,
            { team1Score: 11, team1PlayerScores: [{ playerId: p1._id || p1, score: 11 }] },
            { team2Score: 7, team2PlayerScores: [{ playerId: p2._id || p2, score: 7 }] }
        );
    }
    console.log("LBR-SF completed.");

    // 8. LBR-Final
    await generateMatches(token, tId, 'lbr-final');
    matches = await getMatches(token, tId);
    let lbrFinalMatches = matches.filter(m => m.round === 'lbr-final');
    if (lbrFinalMatches.length !== 1) throw new Error(`Expected 1 LBR Final match, got ${lbrFinalMatches.length}`);

    const lbrFinal = lbrFinalMatches[0];
    const lbrFinalId = lbrFinal._id || lbrFinal.id;
    await completeMatch(token, lbrFinalId,
        { team1Score: 11, team1PlayerScores: [{ playerId: lbrFinal.team1.players[0]._id || lbrFinal.team1.players[0], score: 11 }] },
        { team2Score: 6, team2PlayerScores: [{ playerId: lbrFinal.team2.players[0]._id || lbrFinal.team2.players[0], score: 6 }] }
    );
    console.log("LBR Final completed.");

    // 9. Grand Final
    await generateMatches(token, tId, 'grand-final');
    matches = await getMatches(token, tId);
    let gfMatches = matches.filter(m => m.round === 'grand-final');
    if (gfMatches.length !== 1) throw new Error(`Expected 1 Grand Final match, got ${gfMatches.length}`);

    const gf = gfMatches[0];
    const gfId = gf._id || gf.id;
    await completeMatch(token, gfId,
        { team1Score: 11, team1PlayerScores: [{ playerId: gf.team1.players[0]._id || gf.team1.players[0], score: 11 }] },
        { team2Score: 9, team2PlayerScores: [{ playerId: gf.team2.players[0]._id || gf.team2.players[0], score: 9 }] }
    );
    console.log("Grand Final completed.");

    // 10. Complete Tournament
    const actionRes = await fetch(`${API_URL}/tournaments/${tId}/action`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_tournament' })
    });

    if (actionRes.ok) {
        console.log('Action complete_tournament success.');
    } else {
        throw new Error(`Action complete_tournament failed: ${await actionRes.text()}`);
    }

    // 11. Verify
    const getRes = await fetch(`${API_URL}/tournaments/${tId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalState = (await getRes.json()).data;
    console.log(`Tournament Status: ${finalState.status}`);
    console.log(`Champion: ${JSON.stringify(finalState.champion)}`);

    if (finalState.status === 'completed' && finalState.champion) {
        console.log("SUCCESS: Double Elimination Verification Passed!");
    } else {
        throw new Error(`FAIL: Tournament status ${finalState.status}, Champion: ${JSON.stringify(finalState.champion)}`);
    }
}

runDoubleElimination().catch(err => {
    console.error(err);
    process.exit(1);
});
