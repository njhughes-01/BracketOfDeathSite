
const { MongoClient, ObjectId } = require('mongodb');

async function inspect() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('bracket_of_death');
        const playersCollection = db.collection('players');
        const tournamentsCollection = db.collection('tournaments');

        // Get completed tournament
        const tournament = await tournamentsCollection.findOne({
            _id: new ObjectId('694181c0c0ed0925650407a9')
        });

        if (!tournament) {
            console.log('Tournament not found');
            return;
        }

        console.log(`Tournament Status: ${tournament.status}`);
        console.log(`Champion: ${JSON.stringify(tournament.champion)}`);

        if (tournament.champion) {
            const champId = tournament.champion.playerId || tournament.champion.teamId;
            if (champId) {
                console.log(`Looking for Champion ID: ${champId}`);
                const champ = await playersCollection.findOne({ _id: new ObjectId(champId) });
                console.log('--- Champion Document ---');
                console.log(JSON.stringify(champ || {}, null, 2));
            }
        }

        const sample = await playersCollection.findOne({});
        console.log('--- Sample Player ---');
        console.log(JSON.stringify(sample, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

inspect();
