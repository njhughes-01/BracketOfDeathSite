
const { MongoClient } = require('mongodb');

async function inspect() {
    const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket-of-death';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(d => d.name));

        for (const d of dbs.databases) {
            console.log(`\nDB: ${d.name}`);
            const collections = await client.db(d.name).listCollections().toArray();
            console.log('Collections:', collections.map(c => c.name));

            // Count matches in this DB
            if (collections.find(c => c.name === 'matches')) {
                const count = await client.db(d.name).collection('matches').countDocuments();
                console.log(`Matches count: ${count}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

inspect();
