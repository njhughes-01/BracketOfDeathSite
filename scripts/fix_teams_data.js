
const { MongoClient, ObjectId } = require('mongodb');

async function fixAndUpdate() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('bracket_of_death');
        const tournamentsCollection = db.collection('tournaments');
        const matchesCollection = db.collection('matches');

        const id = '694181c0c0ed0925650407a9';
        const tournament = await tournamentsCollection.findOne({ _id: new ObjectId(id) });

        if (!tournament) { console.log('Tourn not found'); return; }

        // 1. Reconstruct teams from Round 1 Match Data
        // Find all RR_R1 matches to get all teams
        const rrMatches = await matchesCollection.find({
            tournamentId: new ObjectId(id),
            round: 'RR_R1'
        }).toArray();

        if (rrMatches.length === 0) { console.log('No RR matches found to reconstruct teams'); return; }

        const teamsMap = new Map();
        rrMatches.forEach(m => {
            // Team 1
            const t1Key = m.team1.players.map(p => p.toString()).sort().join('_');
            if (!teamsMap.has(t1Key)) {
                teamsMap.set(t1Key, {
                    teamId: `recalc-${t1Key}`,
                    teamName: m.team1.playerNames.join(' & '),
                    players: m.team1.players.map((pid, idx) => ({
                        playerId: pid,
                        playerName: m.team1.playerNames[idx],
                        seed: m.team1.seed
                    })),
                    combinedSeed: m.team1.seed
                });
            }
            // Team 2
            const t2Key = m.team2.players.map(p => p.toString()).sort().join('_');
            if (!teamsMap.has(t2Key)) {
                teamsMap.set(t2Key, {
                    teamId: `recalc-${t2Key}`,
                    teamName: m.team2.playerNames.join(' & '),
                    players: m.team2.players.map((pid, idx) => ({
                        playerId: pid,
                        playerName: m.team2.playerNames[idx],
                        seed: m.team2.seed
                    })),
                    combinedSeed: m.team2.seed
                });
            }
        });

        const reconstructedTeams = Array.from(teamsMap.values());
        console.log(`Reconstructed ${reconstructedTeams.length} teams.`);

        // 2. Update Tournament with these teams
        await tournamentsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { generatedTeams: reconstructedTeams } }
        );
        console.log('Updated tournament with generatedTeams.');

        // 3. Trigger Stats Update (We can't call controller method directly here easily, 
        // so we will simulate it by hitting the API endpoint to "complete" again? 
        // Or just run the logic here in JS).
        // Let's run the logic here to be sure.

        // Import logic? No, let's just use the API if possible.
        // Actually, calling "complete_tournament" again via API might re-trigger it.
        // If status is already 'completed', controller might bail?
        // Let's check controller. 
        // If I change status back to 'final' and then 'complete' again via API script.

        await tournamentsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'active' } } // Set to active so we can complete it again
        );
        console.log("Set status to 'active' to allow re-completion via API.");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

fixAndUpdate();
