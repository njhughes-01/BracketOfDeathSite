/**
 * Verify Historical Data Display
 * 
 * This script programmatically verifies that all expected historical data
 * fields are populated in the database and correctly structured for display.
 * 
 * Usage: node scripts/verify-historical-data-display.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracket_of_death';

async function verifyHistoricalData() {
    console.log('🔍 Verifying Historical Tournament Data Display');
    console.log('================================================\n');

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db('bracket_of_death');

        // 1. Check Tournament Data Completeness
        console.log('📊 TOURNAMENT DATA ANALYSIS');
        console.log('----------------------------');

        const tournaments = await db.collection('tournaments').find({ status: 'completed' }).toArray();
        console.log(`Total completed tournaments: ${tournaments.length}`);

        let tournamentsWithLocation = 0;
        let tournamentsWithNotes = 0;
        let tournamentsWithPhotoAlbums = 0;
        let tournamentsWithAdvancementCriteria = 0;

        for (const t of tournaments) {
            if (t.location && t.location !== 'Tournament Location') tournamentsWithLocation++;
            if (t.notes && t.notes.trim()) tournamentsWithNotes++;
            if (t.photoAlbums) tournamentsWithPhotoAlbums++;
            if (t.advancementCriteria) tournamentsWithAdvancementCriteria++;
        }

        console.log(`  With location: ${tournamentsWithLocation}/${tournaments.length}`);
        console.log(`  With notes: ${tournamentsWithNotes}/${tournaments.length}`);
        console.log(`  With photo albums: ${tournamentsWithPhotoAlbums}/${tournaments.length}`);
        console.log(`  With advancement criteria: ${tournamentsWithAdvancementCriteria}/${tournaments.length}`);

        // 2. Check Tournament Results Completeness
        console.log('\n📊 TOURNAMENT RESULTS ANALYSIS');
        console.log('--------------------------------');

        const results = await db.collection('tournamentresults').find({}).toArray();
        console.log(`Total tournament results: ${results.length}\n`);

        let withRoundRobin = 0;
        let withBracket = 0;
        let withTotalStats = 0;
        let withDivision = 0;
        let withSeed = 0;
        let withBodFinish = 0;

        // Round robin field counts
        let rrFieldCounts = { round1: 0, round2: 0, round3: 0, rrWon: 0, rrLost: 0, rrWinPercentage: 0 };

        // Bracket field counts
        let bracketFieldCounts = { r16Won: 0, r16Lost: 0, qfWon: 0, qfLost: 0, sfWon: 0, sfLost: 0, finalsWon: 0, finalsLost: 0, bracketWon: 0, bracketLost: 0 };

        for (const r of results) {
            if (r.roundRobinScores) {
                withRoundRobin++;
                if (r.roundRobinScores.round1 !== undefined) rrFieldCounts.round1++;
                if (r.roundRobinScores.round2 !== undefined) rrFieldCounts.round2++;
                if (r.roundRobinScores.round3 !== undefined) rrFieldCounts.round3++;
                if (r.roundRobinScores.rrWon !== undefined) rrFieldCounts.rrWon++;
                if (r.roundRobinScores.rrLost !== undefined) rrFieldCounts.rrLost++;
                if (r.roundRobinScores.rrWinPercentage !== undefined) rrFieldCounts.rrWinPercentage++;
            }
            if (r.bracketScores) {
                withBracket++;
                if (r.bracketScores.r16Won !== undefined) bracketFieldCounts.r16Won++;
                if (r.bracketScores.r16Lost !== undefined) bracketFieldCounts.r16Lost++;
                if (r.bracketScores.qfWon !== undefined) bracketFieldCounts.qfWon++;
                if (r.bracketScores.qfLost !== undefined) bracketFieldCounts.qfLost++;
                if (r.bracketScores.sfWon !== undefined) bracketFieldCounts.sfWon++;
                if (r.bracketScores.sfLost !== undefined) bracketFieldCounts.sfLost++;
                if (r.bracketScores.finalsWon !== undefined) bracketFieldCounts.finalsWon++;
                if (r.bracketScores.finalsLost !== undefined) bracketFieldCounts.finalsLost++;
                if (r.bracketScores.bracketWon !== undefined) bracketFieldCounts.bracketWon++;
                if (r.bracketScores.bracketLost !== undefined) bracketFieldCounts.bracketLost++;
            }
            if (r.totalStats) withTotalStats++;
            if (r.division) withDivision++;
            if (r.seed !== undefined) withSeed++;
            if (r.totalStats?.bodFinish !== undefined) withBodFinish++;
        }

        console.log('Summary Counts:');
        console.log(`  With roundRobinScores: ${withRoundRobin}/${results.length} (${(withRoundRobin / results.length * 100).toFixed(1)}%)`);
        console.log(`  With bracketScores: ${withBracket}/${results.length} (${(withBracket / results.length * 100).toFixed(1)}%)`);
        console.log(`  With totalStats: ${withTotalStats}/${results.length} (${(withTotalStats / results.length * 100).toFixed(1)}%)`);
        console.log(`  With division: ${withDivision}/${results.length} (${(withDivision / results.length * 100).toFixed(1)}%)`);
        console.log(`  With seed: ${withSeed}/${results.length} (${(withSeed / results.length * 100).toFixed(1)}%)`);
        console.log(`  With bodFinish: ${withBodFinish}/${results.length} (${(withBodFinish / results.length * 100).toFixed(1)}%)`);

        console.log('\nRound Robin Field Detail:');
        for (const [field, count] of Object.entries(rrFieldCounts)) {
            console.log(`  ${field}: ${count}/${withRoundRobin}`);
        }

        console.log('\nBracket Field Detail:');
        for (const [field, count] of Object.entries(bracketFieldCounts)) {
            console.log(`  ${field}: ${count}/${withBracket}`);
        }

        // 3. Sample Check - Show data for a few tournaments
        console.log('\n📊 SAMPLE TOURNAMENT DATA');
        console.log('--------------------------');

        const sampleTournaments = await db.collection('tournaments')
            .find({ status: 'completed' })
            .sort({ bodNumber: -1 })
            .limit(3)
            .toArray();

        for (const t of sampleTournaments) {
            console.log(`\nBOD #${t.bodNumber} (${new Date(t.date).toLocaleDateString()}):`);
            console.log(`  Format: ${t.format}`);
            console.log(`  Location: ${t.location || 'N/A'}`);
            console.log(`  Photo Albums: ${t.photoAlbums || 'N/A'}`);

            const tResults = await db.collection('tournamentresults')
                .find({ tournamentId: t._id })
                .sort({ 'totalStats.bodFinish': 1 })
                .limit(2)
                .toArray();

            console.log(`  Results found: ${tResults.length}`);

            if (tResults.length > 0) {
                const champion = tResults[0];
                console.log(`  Champion (BOD Finish ${champion.totalStats?.bodFinish}):`);
                console.log(`    RR: ${champion.roundRobinScores?.rrWon || 0}-${champion.roundRobinScores?.rrLost || 0}`);
                console.log(`    Bracket: ${champion.bracketScores?.bracketWon || 0}-${champion.bracketScores?.bracketLost || 0}`);
                console.log(`    Total: ${champion.totalStats?.totalWon || 0}-${champion.totalStats?.totalLost || 0}`);

                if (champion.bracketScores?.finalsWon !== undefined) {
                    console.log(`    Finals Score: ${champion.bracketScores.finalsWon}-${champion.bracketScores.finalsLost}`);
                }
            }
        }

        // 4. Summary
        console.log('\n\n🎯 VERIFICATION SUMMARY');
        console.log('========================');

        const issues = [];
        if (withRoundRobin / results.length < 0.9) {
            issues.push(`⚠️ Only ${(withRoundRobin / results.length * 100).toFixed(1)}% of results have roundRobinScores`);
        }
        if (withBracket / results.length < 0.9) {
            issues.push(`⚠️ Only ${(withBracket / results.length * 100).toFixed(1)}% of results have bracketScores`);
        }
        if (withTotalStats / results.length < 0.95) {
            issues.push(`⚠️ Only ${(withTotalStats / results.length * 100).toFixed(1)}% of results have totalStats`);
        }
        if (tournamentsWithPhotoAlbums === 0) {
            issues.push(`⚠️ No tournaments have photo albums imported`);
        }

        if (issues.length === 0) {
            console.log('✅ All historical data appears complete and ready for display!');
        } else {
            console.log('Issues found:');
            issues.forEach(i => console.log(`  ${i}`));
        }

        console.log(`\n✅ Verification complete`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

verifyHistoricalData().catch(console.error);
