const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../src/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracket-of-death';

async function debug() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Tournament = mongoose.model('Tournament', new mongoose.Schema({}, { strict: false }));
    const TournamentResult = mongoose.model('TournamentResult', new mongoose.Schema({}, { strict: false }));

    // Find all tournaments
    const tournaments = await Tournament.find().limit(5).lean();

    console.log(`\nFound ${tournaments.length} tournaments total:`);

    for (const t of tournaments) {
        console.log(`\n  ID: ${t._id}`);
        console.log(`  Name: ${t.name}`);
        console.log(`  Date: ${t.date}`);

        // Get results count
        const resultCount = await TournamentResult.countDocuments({ tournamentId: t._id });
        console.log(`  Results: ${resultCount}`);

        if (resultCount > 0) {
            // Get sample result with bracket data
            const sampleResults = await TournamentResult.find({ tournamentId: t._id })
                .limit(3)
                .lean();

            console.log('  Sample bracketScores:');
            sampleResults.forEach((r, i) => {
                const bs = r.bracketScores || {};
                console.log(`    ${i + 1}. finalsWon=${bs.finalsWon}, finalsLost=${bs.finalsLost}, sfWon=${bs.sfWon}, sfLost=${bs.sfLost}`);
            });
        }
    }

    // Also check total result count
    const totalResults = await TournamentResult.countDocuments();
    console.log(`\nTotal TournamentResult documents: ${totalResults}`);

    await mongoose.disconnect();
    process.exit(0);
}

debug().catch(e => {
    console.error(e);
    process.exit(1);
});
