/**
 * Diagnostic script to check tournament data status in MongoDB.
 * Run this to verify if tournament results data exists.
 *
 * Usage: node scripts/check-tournament-data.js
 */

const { MongoClient } = require("mongodb");

const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/bracket_of_death";

async function checkData() {
    console.log("🔍 Checking tournament data status...\n");
    console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}\n`);

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log("✅ Connected to MongoDB\n");

        const db = client.db("bracket_of_death");

        // Check collections
        const collections = await db.listCollections().toArray();
        console.log("📁 Collections found:", collections.map((c) => c.name).join(", "));
        console.log("");

        // Check tournaments
        const tournamentsCount = await db.collection("tournaments").countDocuments();
        console.log(`🏆 Tournaments: ${tournamentsCount} records`);

        if (tournamentsCount > 0) {
            const sample = await db.collection("tournaments").findOne({}, { sort: { bodNumber: -1 } });
            console.log(`   Latest: BOD #${sample?.bodNumber} - ${sample?.format} (${sample?.date?.toDateString?.() || sample?.date})`);
        }

        // Check players
        const playersCount = await db.collection("players").countDocuments();
        console.log(`👥 Players: ${playersCount} records`);

        if (playersCount > 0) {
            const sample = await db.collection("players").findOne({});
            console.log(`   Sample: ${sample?.name}`);
        }

        // Check tournament results
        const resultsCount = await db.collection("tournamentresults").countDocuments();
        console.log(`📊 Tournament Results: ${resultsCount} records`);

        if (resultsCount > 0) {
            // Get a sample result with tournament info
            const sampleResult = await db.collection("tournamentresults").aggregate([
                { $limit: 1 },
                {
                    $lookup: {
                        from: "tournaments",
                        localField: "tournamentId",
                        foreignField: "_id",
                        as: "tournament",
                    },
                },
                { $unwind: { path: "$tournament", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "players",
                        localField: "players",
                        foreignField: "_id",
                        as: "playerDetails",
                    },
                },
            ]).toArray();

            if (sampleResult.length > 0) {
                const r = sampleResult[0];
                const playerNames = r.playerDetails?.map((p) => p.name).join(" & ") || "Unknown";
                console.log(`   Sample: ${playerNames} - BOD #${r.tournament?.bodNumber || "?"}`);
                console.log(`   Stats: Won ${r.totalStats?.totalWon || 0}, Lost ${r.totalStats?.totalLost || 0}`);
            }
        }

        // Check matches
        const matchesCount = await db.collection("matches").countDocuments();
        console.log(`🎾 Matches: ${matchesCount} records`);

        console.log("\n" + "=".repeat(50));

        // Diagnosis
        if (tournamentsCount === 0) {
            console.log("\n❌ NO TOURNAMENTS FOUND - Data import has NOT been run.");
            console.log("\n   To fix: Run the data import script:");
            console.log("   node scripts/simple-data-import.js");
        } else if (resultsCount === 0) {
            console.log("\n⚠️  TOURNAMENTS EXIST BUT NO RESULTS");
            console.log("   Tournament data exists but result scores are missing.");
            console.log("\n   To fix: Re-run the data import script:");
            console.log("   node scripts/simple-data-import.js");
        } else {
            console.log("\n✅ DATA LOOKS GOOD!");
            console.log(`   ${tournamentsCount} tournaments, ${resultsCount} team results, ${playersCount} players`);

            // Check if a specific tournament has results
            const tournamentWithResults = await db.collection("tournaments").findOne({ bodNumber: { $exists: true } });
            if (tournamentWithResults) {
                const resultCount = await db.collection("tournamentresults").countDocuments({
                    tournamentId: tournamentWithResults._id,
                });
                console.log(`\n   BOD #${tournamentWithResults.bodNumber}: ${resultCount} team results`);
            }
        }

        console.log("");
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.log("\n   Make sure MongoDB is running and accessible.");
        process.exit(1);
    } finally {
        await client.close();
    }
}

checkData();
