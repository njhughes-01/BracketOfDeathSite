
const { MongoClient } = require('mongodb');

async function inspect() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('bracket_of_death');
        const matchesCollection = db.collection('matches');
        const tournamentsCollection = db.collection('tournaments');

        // Find active tournament
        const tournament = await tournamentsCollection.findOne({
            $or: [{ status: 'active' }, { status: 'in_progress' }]
        }, { sort: { createdAt: -1 } });

        if (!tournament) {
            console.log('No active tournament found');
            return;
        }

        console.log(`Analyzing Tournament: ${tournament.name || tournament.bodNumber} (${tournament._id})`);

        // Count all matches
        const allMatches = await matchesCollection.find({ tournamentId: tournament._id }).toArray();
        console.log(`Total Matches: ${allMatches.length}`);

        // Group by round
        const byRound = {};
        allMatches.forEach(m => {
            byRound[m.round] = (byRound[m.round] || 0) + 1;
        });
        console.log('Matches by Round:', byRound);

        // Detailed bracket statuses
        const bracketMatches = allMatches.filter(m => !m.round.startsWith('RR'));
        bracketMatches.forEach(m => {
            console.log(`[${m.matchNumber}] ${m.round}: ${m.status}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

inspect();
