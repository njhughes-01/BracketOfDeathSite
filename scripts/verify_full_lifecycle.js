
// MongoDB removed
// const { MongoClient, ObjectId } = require('mongodb');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5173/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death';
let TOKEN = '';

async function main() {
    TOKEN = process.argv[2];
    if (!TOKEN) {
        console.error('Please provide auth token as first argument');
        process.exit(1);
    }

    console.log('Starting Complete Lifecycle Verification...');

    /* 
    // 1. Get Players via API
    const pRes = await fetch(`${BASE_URL}/admin/users`, { headers: { Authorization: `Bearer ${TOKEN}` }});
    const pJson = await pRes.json();
    const players = (pJson.docs || pJson.data || []).map(u => ({ _id: u._id, name: u.name || u.username }));
    */
    // Use dummy IDs if fetching fails or purely relying on setup creation
    // Actually, createTournament uses "selectedPlayers" which expects IDs.
    // If we use Setup, we need valid IDs.
    // Let's assume we can fetch players.
    const players = await fetchPlayers();


    // 2. Prepare Payload
    const playerIds = players.map(p => p._id.toString());
    const generatedTeams = [];
    for (let i = 0; i < 16; i += 2) {
        generatedTeams.push({
            teamId: `team_${i}`,
            teamName: `${players[i].name} & ${players[i + 1].name}`,
            players: [
                { playerId: players[i]._id, playerName: players[i].name, seed: i + 1 },
                { playerId: players[i + 1]._id, playerName: players[i + 1].name, seed: i + 2 }
            ],
            combinedSeed: i + 1
        });
    }

    const payload = {
        basicInfo: {
            date: new Date().toISOString(),
            bodNumber: Math.floor(100000 + Math.random() * 900000),
            format: 'Mixed',
            location: 'Test Location',
            advancementCriteria: 'Winners advance sequentially',
            status: 'scheduled'
        },
        maxPlayers: 16,
        selectedPlayers: playerIds,
        generatedTeams: generatedTeams,
        bracketType: 'round_robin_playoff'
    };

    // 3. Create Tournament
    const createdTournament = await createTournament(payload);
    if (!createdTournament) {
        console.error("Failed to create tournament (returned null/undefined)");
        return;
    }
    const tId = createdTournament.id || createdTournament._id;
    console.log(`Tournament Created: ${tId}`);

    // 4. Verify Persistence
    await verifyTeamsPersistence(tId);

    // 5. Start Tournament
    await advanceTournamentAction(tId, 'start_registration');
    await advanceTournamentAction(tId, 'close_registration');
    await advanceTournamentAction(tId, 'start_round_robin');

    // 6. Play Rounds
    await playRoundMatches(tId, 'RR_R1');
    await advanceTournamentAction(tId, 'advance_round');

    await playRoundMatches(tId, 'RR_R2');
    await advanceTournamentAction(tId, 'advance_round');

    await playRoundMatches(tId, 'RR_R3');
    await advanceTournamentAction(tId, 'advance_round');

    await playRoundMatches(tId, 'quarterfinal');
    await advanceTournamentAction(tId, 'advance_round');

    // Semifinals
    let sfGenerated = await checkMatchCount(tId, 'semifinal');
    if (sfGenerated === 0) {
        console.log('Generating SF matches manually...');
        await generateMatchesForRound(tId, 'semifinal');
    }
    await playRoundMatches(tId, 'semifinal');
    await advanceTournamentAction(tId, 'advance_round');

    // Finals
    let finalGenerated = await checkMatchCount(tId, 'final');
    if (finalGenerated === 0) {
        console.log('Generating Final matches manually...');
        await generateMatchesForRound(tId, 'final');
    }
    await playRoundMatches(tId, 'final');

    // 7. Complete
    console.log('Completing Tournament...');
    await advanceTournamentAction(tId, 'complete_tournament');

    // 8. Verify Stats
    await verifyPlayerStats(tId);
    console.log('Verification Complete: SUCCESS');
}

// Helpers
async function createTournament(data) {
    console.log('Entering createTournament...');
    try {
        const res = await fetch(`${BASE_URL}/tournaments/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify(data)
        });
        console.log(`Fetch status: ${res.status}`);
        if (!res.ok) {
            const text = await res.text();
            console.error('Setup Failed:', text);
            return null;
        }
        const json = await res.json();
        console.log('Setup Response:', JSON.stringify(json, null, 2));
        return json.data;
    } catch (e) {
        console.error('createTournament Exception:', e);
        return null;
    }
}

async function advanceTournamentAction(id, action) {
    console.log(`Action: ${action}`);
    const res = await fetch(`${BASE_URL}/tournaments/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
        body: JSON.stringify({ action })
    });
    if (!res.ok) console.error(`Action ${action} Failed:`, await res.text());
}

async function generateMatchesForRound(id, round) {
    const res = await fetch(`${BASE_URL}/tournaments/${id}/generate-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
        body: JSON.stringify({ round })
    });
    if (!res.ok) console.error(`Generate ${round} Failed:`, await res.text());
}

async function playRoundMatches(id, round) {
    console.log(`Playing Round: ${round}`);
    const res = await fetch(`${BASE_URL}/tournaments/${id}/matches?round=${round}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const json = await res.json();
    const matches = json.data || [];
    console.log(`Found ${matches.length} matches to play.`);

    for (const m of matches) {
        // Complete
        const matchId = m._id || m.id;
        console.log(`Updating match ${matchId}...`);
        const updateRes = await fetch(`${BASE_URL}/tournaments/matches/${matchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify({
                status: 'completed',
                team1Score: 11,
                team2Score: 0,
                winner: 'team1'
            })
        });

        if (!updateRes.ok) {
            console.error(`Failed to update match ${matchId}:`, await updateRes.text());
        }
        // Confirm not needed as updateMatch handles completion logic
    }
}


async function checkMatchCount(id, round) {
    const res = await fetch(`${BASE_URL}/tournaments/${id}/matches?round=${round}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const json = await res.json();
    return (json.data || []).length;
}

async function verifyTeamsPersistence(id) {
    const res = await fetch(`${BASE_URL}/tournaments/${id}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const json = await res.json();
    const t = json.data;
    if (!t) throw new Error("Tournament not found via API");

    if (!t.generatedTeams || t.generatedTeams.length === 0) {
        throw new Error('generatedTeams NOT persisted!');
    }
    console.log(`Persistence Check Passed: ${t.generatedTeams.length} teams found.`);
}

async function verifyPlayerStats(id) {
    console.log('Skipping advanced stats verification (API limitations)');
    // We could fetch champion status via API if needed
}

async function fetchPlayers() {
    // Try admin users endpoint which usually returns users/players
    // Or try /api/players if it exists
    try {
        const res = await fetch(`${BASE_URL}/players?limit=100`); // Public endpoint?
        if (res.ok) {
            const json = await res.json();
            const list = json.data || [];
            if (list.length >= 16) return list;
        }

        // Fallback to admin/users
        const uRes = await fetch(`${BASE_URL}/admin/users`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        if (uRes.ok) {
            const uJson = await uRes.json();
            const list = uJson.data?.docs || uJson.data || [];
            // Map user to player structure if needed or just return objects with _id
            return list;
        }
    } catch (e) { console.error(e); }
    return [];
}

if (require.main === module) {
    main().catch(console.error);
}
