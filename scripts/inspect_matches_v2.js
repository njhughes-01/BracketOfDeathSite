
const { MongoClient } = require('mongodb');

async function inspectTournament() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket-of-death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        // Check specific collections
        if (collections.find(c => c.name === 'matches')) {
            const matchesCollection = db.collection('matches');
            const matchCount = await matchesCollection.countDocuments();
            console.log('Total Matches in Matches Collection:', matchCount);

            // Find matches for our tournament?
            // Need to know the field name for tournamentId
            const sample = await matchesCollection.findOne({});
            if (sample) console.log('Sample Match:', JSON.stringify(sample, null, 2));
        } else {
            console.log('No "matches" collection found.');

            // Check "groups" if distinct
            if (collections.find(c => c.name === 'groups')) {
                const groups = await db.collection('groups').find().limit(1).toArray();
                console.log('Sample Group:', JSON.stringify(groups[0], null, 2));
            }
        }

    } finally {
        await client.close();
    }
}

inspectTournament();
