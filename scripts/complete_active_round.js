
const { MongoClient } = require('mongodb');

async function completeActiveRound() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket_of_death'; // Use internal docker host
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();
        const tournamentsCollection = db.collection('tournaments');
        const matchesCollection = db.collection('matches');

        // Find the most recent active tournament
        const tournament = await tournamentsCollection.findOne(
            { status: { $in: ['in_progress', 'active'] } },
            { sort: { createdAt: -1 } }
        );

        if (!tournament) {
            console.log('No active tournament found.');
            return;
        }

        // Convert string ID to ObjectId if needed, but mongo driver handles object it returns
        // In DB refs are usually strings or ObjectIds. Sample showed string "tournamentId": "..."? 
        // Wait, sample output: "tournamentId": "693ce..." (looked like string in JSON, but might be ObjectId).
        // Let's assume matches store tournamentId as ObjectId if _id is ObjectId.
        // Actually the sample output showed:
        // "tournamentId": "693ce98f7ad72ca57ae9bc09"
        // And _id was: new ObjectId('...')
        // If it was an ObjectId it would show formatted in console log usually.
        // I will try querying both just in case.

        console.log(`Found tournament: ${tournament.name || tournament.bodNumber} (${tournament._id})`);

        const query = {
            tournamentId: tournament._id, // Try exact match first
            status: 'scheduled'
        };

        // Check count
        let count = await matchesCollection.countDocuments(query);
        if (count === 0) {
            // Try string version
            query.tournamentId = tournament._id.toString();
            count = await matchesCollection.countDocuments(query);
        }

        console.log(`Found ${count} scheduled matches for tournament.`);

        if (count === 0) {
            return;
        }

        const updates = await matchesCollection.updateMany(
            query,
            {
                $set: {
                    status: 'completed',
                    winner: 'team1',
                    'team1.score': 11,
                    'team2.score': 0,
                    // We need to set player scores too if schema validation requires it?
                    // But $set works on document.
                    'team1.playerScores': [], // Or set to match schema if strictly typed?
                    // Better to set specific fields if we can, or just minimal.
                    startTime: new Date(),
                    endTime: new Date()
                }
            }
        );

        console.log(`Updated ${updates.modifiedCount} matches.`);

    } catch (error) {
        console.error('Error completing matches:', error);
    } finally {
        await client.close();
    }
}

completeActiveRound();
