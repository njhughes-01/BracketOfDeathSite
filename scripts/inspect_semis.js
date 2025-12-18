
const { MongoClient } = require('mongodb');

async function inspect() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('bracket-of-death');
        const matchesCollection = db.collection('matches');

        // Find SF matches
        const matches = await matchesCollection.find({ round: { $in: ['semifinal', 'final'] } }).toArray();

        console.log(`Found ${matches.length} matches in SF/Final`);
        matches.forEach(m => {
            console.log(`[${m.matchNumber}] ${m.round} - Status: '${m.status}' - T1: ${JSON.stringify(m.team1?.playerNames)} vs T2: ${JSON.stringify(m.team2?.playerNames)}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

inspect();
