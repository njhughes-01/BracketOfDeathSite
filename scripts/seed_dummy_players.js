
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracket_of_death';

async function seed() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('bracket_of_death');
        const playersCol = db.collection('players');

        const count = await playersCol.countDocuments();
        if (count >= 16) {
            console.log(`Already have ${count} players.`);
            return;
        }

        const players = [];
        for (let i = 0; i < 16 - count; i++) {
            players.push({
                name: `Test Player ${Date.now()}_${i}`,
                email: `test${Date.now()}_${i}@example.com`,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        if (players.length > 0) {
            await playersCol.insertMany(players);
            console.log(`Inserted ${players.length} dummy players.`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

seed();
