/**
 * Debug script to trace the exact issue with tournament result lookups.
 * This will compare what the tournament aggregation finds vs what getResultsByTournament returns.
 * 
 * Usage: node scripts/debug-tournament-results.js
 */

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bracket_of_death";

async function debugResults() {
    console.log("🔍 Debugging tournament result lookup issue...\n");

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db("bracket_of_death");

        // Find a tournament with known results (e.g., a completed one or with high player count indicator)
        const tournamentsWithResults = await db.collection("tournaments").aggregate([
            {
                $lookup: {
                    from: "tournamentresults",
                    localField: "_id",
                    foreignField: "tournamentId",
                    as: "results",
                },
            },
            {
                $addFields: {
                    resultCount: { $size: "$results" },
                },
            },
            { $match: { resultCount: { $gt: 0 } } },
            { $sort: { bodNumber: -1 } },
            { $limit: 3 },
            { $project: { results: 0 } }
        ]).toArray();

        if (tournamentsWithResults.length === 0) {
            console.log("❌ No tournaments found with linked results!");
            console.log("\nChecking if results exist at all...");

            const sampleResult = await db.collection("tournamentresults").findOne({});
            if (sampleResult) {
                console.log("\n✅ TournamentResults exist but are NOT linked to tournaments!");
                console.log("Sample result tournamentId:", sampleResult.tournamentId, typeof sampleResult.tournamentId);

                // Try to find what tournament this should link to
                const sampleTournament = await db.collection("tournaments").findOne({});
                if (sampleTournament) {
                    console.log("Sample tournament _id:", sampleTournament._id, typeof sampleTournament._id);

                    // Check if they match
                    const resultTournamentId = sampleResult.tournamentId;
                    const tournamentId = sampleTournament._id;

                    console.log("\n--- ID Format Comparison ---");
                    console.log("Result.tournamentId:", resultTournamentId?.toString());
                    console.log("Tournament._id:", tournamentId?.toString());
                    console.log("Are they ObjectIds?", resultTournamentId instanceof ObjectId, tournamentId instanceof ObjectId);

                    // Try direct lookup
                    const directMatch = await db.collection("tournaments").findOne({ _id: resultTournamentId });
                    console.log("\nDirect lookup (result.tournamentId → tournament):", directMatch ? "FOUND" : "NOT FOUND");
                }
            } else {
                console.log("❌ tournamentresults collection is EMPTY!");
            }
            return;
        }

        console.log(`✅ Found ${tournamentsWithResults.length} tournaments with linked results:\n`);

        for (const t of tournamentsWithResults) {
            console.log(`== BOD #${t.bodNumber} ==`);
            console.log(`   _id: ${t._id}`);
            console.log(`   date: ${t.date}`);
            console.log(`   format: ${t.format}`);

            // Now simulate what getResultsByTournament does
            const results = await db.collection("tournamentresults")
                .find({ tournamentId: t._id })
                .toArray();

            console.log(`   Results via find({ tournamentId: _id }): ${results.length}`);

            if (results.length > 0) {
                const sample = results[0];
                console.log(`   Sample result: players=${sample.players?.length || 0}, totalWon=${sample.totalStats?.totalWon || 0}`);
            }
            console.log("");
        }

        // Also verify by finding a known specific tournament (BOD 42 or similar)
        console.log("\n--- Checking specific tournaments by bodNumber ---");
        for (const bodNum of [42, 40, 38, 1]) {
            const t = await db.collection("tournaments").findOne({ bodNumber: bodNum });
            if (t) {
                const results = await db.collection("tournamentresults")
                    .find({ tournamentId: t._id })
                    .toArray();
                console.log(`BOD #${bodNum}: _id=${t._id}, results=${results.length}`);
            }
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

debugResults();
