const { MongoClient } = require('mongodb');

async function updateStatus() {
    const client = new MongoClient('mongodb://localhost:27017/bracket_of_death');
    await client.connect();

    const result = await client.db().collection('tournaments').updateMany(
        {},
        { $set: { status: 'completed' } }
    );

    console.log('Updated', result.modifiedCount, 'tournaments to status: completed');
    await client.close();
}

updateStatus().catch(console.error);
