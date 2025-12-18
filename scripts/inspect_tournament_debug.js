
const { MongoClient, ObjectId } = require('mongodb');

async function inspect() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('bracket_of_death');
        const tournamentsCollection = db.collection('tournaments');
        const matchesCollection = db.collection('matches');

        // Get completed tournament
        const id = '694181c0c0ed0925650407a9';
        const tournament = await tournamentsCollection.findOne({
            _id: new ObjectId(id)
        });

        if (!tournament) {
            console.log('Tournament not found');
            return;
        }

        console.log(`Tournament Status: ${tournament.status}`);
        console.log(`generatedTeams count: ${tournament.generatedTeams?.length}`);
        if (tournament.generatedTeams?.length > 0) {
            console.log('First Team Sample:', JSON.stringify(tournament.generatedTeams[0], null, 2));
        } else {
            console.log('generatedTeams is EMPTY or undefined!');
        }

        // Check completed matches
        const completedMatches = await matchesCollection.countDocuments({
            tournamentId: new ObjectId(id),
            status: 'completed'
        });
        console.log(`Completed Matches Count: ${completedMatches}`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

inspect();
