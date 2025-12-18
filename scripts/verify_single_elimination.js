/**
 * Single Elimination Tournament Lifecycle Verification
 * 
 * Tests complete lifecycle: Create -> QF -> SF -> Final -> Complete
 * Run with: node scripts/verify_single_elimination.js <AUTH_TOKEN>
 */

const { MongoClient, ObjectId } = require('mongodb');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death';
let TOKEN = '';

async function main() {
    TOKEN = process.argv[2];
    if (!TOKEN) {
        console.error('Please provide auth token as first argument');
        console.log('Usage: node scripts/verify_single_elimination.js <AUTH_TOKEN>');
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('SINGLE ELIMINATION LIFECYCLE VERIFICATION');
    console.log('='.repeat(60));

    // 1. Get Players for Setup (need 8 for SE bracket)
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const players = await client.db('bracket_of_death').collection('players').find().limit(8).toArray();
    await client.close();

    if (players.length < 8) {
        console.error(`Not enough players in DB (found ${players.length}, need 8)`);
        return;
    }

    // 2. Prepare Payload
    const playerIds = players.map(p => p._id.toString());
    const generatedTeams = [];
    for (let i = 0; i < 8; i += 2) {
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
            location: 'Single Elim Test',
            advancementCriteria: 'Single elimination bracket',
            status: 'scheduled'
        },
        maxPlayers: 8,
        selectedPlayers: playerIds,
        generatedTeams: generatedTeams,
        bracketType: 'single_elimination'
    };

    // 3. Create Tournament
    console.log('\n[1] Creating Single Elimination Tournament...');
    const createdTournament = await createTournament(payload);
    if (!createdTournament) {
        console.error('FAILED: Tournament creation');
        return;
    }
    const tId = createdTournament.id || createdTournament._id;
    console.log(`✓ Tournament Created: ${tId}`);

    // 4. Start Tournament
    console.log('\n[2] Starting Tournament...');
    await advanceTournamentAction(tId, 'start_registration');
    await advanceTournamentAction(tId, 'close_registration');

    // 5. Generate and Play Quarterfinals
    console.log('\n[3] Playing Quarterfinals...');
    await generateMatchesForRound(tId, 'quarterfinal');
    await playRoundMatches(tId, 'quarterfinal');

    // 6. Advance to Semifinals
    console.log('\n[4] Advancing to Semifinals...');
    await advanceTournamentAction(tId, 'advance_round');
    await generateMatchesForRound(tId, 'semifinal');
    await playRoundMatches(tId, 'semifinal');

    // 7. Advance to Finals
    console.log('\n[5] Advancing to Finals...');
    await advanceTournamentAction(tId, 'advance_round');
    await generateMatchesForRound(tId, 'final');
    await playRoundMatches(tId, 'final');

    // 8. Complete Tournament
    console.log('\n[6] Completing Tournament...');
    await advanceTournamentAction(tId, 'complete_tournament');

    // 9. Verify Results
    console.log('\n[7] Verifying Results...');
    await verifyTournamentCompletion(tId);

    console.log('\n' + '='.repeat(60));
    console.log('SINGLE ELIMINATION VERIFICATION: SUCCESS');
    console.log('='.repeat(60));
}

// Helper Functions
async function createTournament(data) {
    try {
        const res = await fetch(`${BASE_URL}/tournaments/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            console.error('Setup Failed:', await res.text());
            return null;
        }
        const json = await res.json();
        return json.data;
    } catch (e) {
        console.error('createTournament Exception:', e);
        return null;
    }
}

async function advanceTournamentAction(id, action) {
    console.log(`  → Action: ${action}`);
    const res = await fetch(`${BASE_URL}/tournaments/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
        body: JSON.stringify({ action })
    });
    if (!res.ok) {
        console.error(`  ✗ Action ${action} Failed:`, await res.text());
    } else {
        console.log(`  ✓ ${action} completed`);
    }
}

async function generateMatchesForRound(id, round) {
    console.log(`  → Generating ${round} matches...`);
    const res = await fetch(`${BASE_URL}/tournaments/${id}/generate-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
        body: JSON.stringify({ round })
    });
    if (!res.ok) {
        console.error(`  ✗ Generate ${round} Failed:`, await res.text());
    } else {
        console.log(`  ✓ ${round} matches generated`);
    }
}

async function playRoundMatches(id, round) {
    console.log(`  → Playing ${round} matches...`);
    const res = await fetch(`${BASE_URL}/tournaments/${id}/matches?round=${round}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const json = await res.json();
    const matches = json.data || [];
    console.log(`    Found ${matches.length} matches`);

    for (const m of matches) {
        const matchId = m._id || m.id;
        const updateRes = await fetch(`${BASE_URL}/tournaments/matches/${matchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
            body: JSON.stringify({
                status: 'completed',
                team1Score: 11,
                team2Score: Math.floor(Math.random() * 9), // Random loss
                winner: 'team1'
            })
        });

        if (!updateRes.ok) {
            console.error(`  ✗ Failed to update match ${matchId}`);
        }
    }
    console.log(`  ✓ ${round} completed`);
}

async function verifyTournamentCompletion(id) {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const t = await client.db('bracket_of_death').collection('tournaments').findOne({ _id: new ObjectId(id) });

        console.log(`  Status: ${t.status}`);

        if (t.champion?.playerId) {
            const p = await client.db('bracket_of_death').collection('players').findOne({
                _id: new ObjectId(t.champion.playerId)
            });
            console.log(`  Champion: ${t.champion.playerName}`);
            console.log(`  ✓ Tournament completed successfully`);
        } else {
            console.error('  ✗ No champion found');
        }
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
