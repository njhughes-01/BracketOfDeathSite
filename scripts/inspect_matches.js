
const { MongoClient } = require('mongodb');

async function inspectTournament() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket-of-death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        const collection = db.collection('tournaments');

        const tournament = await collection.findOne(
            { status: { $in: ['in_progress', 'active'] } },
            { sort: { createdAt: -1 } }
        );

        if (tournament) {
            console.log('Tournament:', tournament.name || tournament.title || 'Untitled');
            console.log('Match Count:', tournament.matches ? tournament.matches.length : 0);
            if (tournament.matches && tournament.matches.length > 0) {
                console.log('Sample Match:', JSON.stringify(tournament.matches[0], null, 2));
            }
        } else {
            console.log('No active tournament.');
        }

    } finally {
        await client.close();
    }
}

inspectTournament();
