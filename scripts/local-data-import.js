/**
 * Local data import script for development.
 * This version uses local paths instead of Docker paths.
 *
 * Usage: node scripts/local-data-import.js
 */

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/bracket_of_death";
const DATA_DIR = path.join(__dirname, "..", "json");

console.log("Starting local data import...");
console.log(`Data directory: ${DATA_DIR}`);
console.log(
  `MongoDB URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`,
);

async function localImport() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`ERROR: Data directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("\n✅ Connected to MongoDB\n");

    const db = client.db("bracket_of_death");

    // Check existing counts
    const existingTournaments = await db
      .collection("tournaments")
      .countDocuments();
    const existingPlayers = await db.collection("players").countDocuments();
    const existingResults = await db
      .collection("tournamentresults")
      .countDocuments();

    console.log("Current database state:");
    console.log(`  Tournaments: ${existingTournaments}`);
    console.log(`  Players: ${existingPlayers}`);
    console.log(`  Results: ${existingResults}`);

    if (existingResults > 0) {
      console.log("\n✅ Tournament results already exist. Skipping import.");
      console.log(
        "   To force reimport, manually drop the tournamentresults collection.",
      );
      return;
    }

    console.log("\n⚠️ No tournament results found. Running import...\n");

    // Import players first
    await importPlayers(db);

    // Import champions/tournament metadata
    await importChampions(db);

    // Import all scores data
    await importAllScores(db);

    // Process individual tournament files
    await importTournamentFiles(db);

    // Final summary
    const finalTournaments = await db
      .collection("tournaments")
      .countDocuments();
    const finalPlayers = await db.collection("players").countDocuments();
    const finalResults = await db
      .collection("tournamentresults")
      .countDocuments();

    console.log("\n=== Import Complete ===");
    console.log(`  Tournaments: ${finalTournaments}`);
    console.log(`  Players: ${finalPlayers}`);
    console.log(`  Results: ${finalResults}`);
  } catch (error) {
    console.error("Error during import:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function importPlayers(db) {
  console.log("📥 Importing players...");

  const playersFile = path.join(DATA_DIR, "All Players.json");
  if (!fs.existsSync(playersFile)) {
    console.log("  ⚠️ All Players.json not found, skipping");
    return;
  }

  const playersData = JSON.parse(fs.readFileSync(playersFile, "utf8"));
  let imported = 0;

  for (const player of playersData) {
    const fullName = player["457 Unique Players"] || player.name || "";
    if (!fullName?.trim()) continue;

    const existing = await db.collection("players").findOne({ name: fullName });
    if (existing) continue;

    const nameParts = fullName.trim().split(" ");
    await db.collection("players").insertOne({
      name: fullName,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      gamesPlayed: parseInt(player["Games Played"] || 0) || 0,
      gamesWon: parseInt(player["Games Won"] || 0) || 0,
      winningPercentage: parseFloat(player["Winning %"] || 0) || 0,
      bodsPlayed: parseInt(player["BOD's Played"] || 0) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    imported++;
  }

  console.log(`  ✅ Imported ${imported} players`);
}

async function importChampions(db) {
  console.log("📥 Importing tournaments from Champions.json...");

  const championsFile = path.join(DATA_DIR, "Champions.json");
  if (!fs.existsSync(championsFile)) {
    console.log("  ⚠️ Champions.json not found, skipping");
    return;
  }

  const championsData = JSON.parse(fs.readFileSync(championsFile, "utf8"));
  let created = 0;

  for (const champData of championsData) {
    if (!champData.Format || !champData["BOD#"] || champData.Date === null)
      continue;

    const tournamentDate = new Date(champData.Date);
    if (isNaN(tournamentDate.getTime()) || tournamentDate > new Date())
      continue;

    const existing = await db
      .collection("tournaments")
      .findOne({ bodNumber: champData["BOD#"] });
    if (existing) continue;

    await db.collection("tournaments").insertOne({
      bodNumber: champData["BOD#"],
      date: tournamentDate,
      format: champData.Format,
      location: champData.Location || "Tournament Location",
      advancementCriteria:
        champData["Advancement Criteria"] || "Standard rules",
      notes: champData.Notes || "",
      photoAlbums: champData["Photo Albums"] || null,
      // Historical tournament statistics
      tiebreakers: champData.Tiebreakers || null,
      avgRRGames: champData["Avg RR Games"] || null,
      avgGames: champData["AVG Games"] || null,
      championSufferingScore: champData["Suffering Score (W)"] || null,
      finalistSufferingScore: champData["Suffering Score (L)"] || null,
      status: "completed", // Historical tournaments are completed
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    created++;
  }

  console.log(`  ✅ Created ${created} tournaments`);
}

async function importAllScores(db) {
  console.log("📥 Importing scores from All Scores.json...");

  const scoresFile = path.join(DATA_DIR, "All Scores.json");
  if (!fs.existsSync(scoresFile)) {
    console.log("  ⚠️ All Scores.json not found, skipping");
    return;
  }

  const scoresData = JSON.parse(fs.readFileSync(scoresFile, "utf8"));
  let inserted = 0;
  let skipped = 0;

  for (const scoreData of scoresData) {
    if (!scoreData.Date || !scoreData["Player 1"] || !scoreData["Player 2"]) {
      skipped++;
      continue;
    }

    const scoreDate = new Date(scoreData.Date);
    if (isNaN(scoreDate.getTime())) continue;

    // Find tournament by date range
    const tournament = await db.collection("tournaments").findOne({
      date: {
        $gte: new Date(scoreDate.getTime() - 24 * 60 * 60 * 1000),
        $lte: new Date(scoreDate.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (!tournament) {
      skipped++;
      continue;
    }

    // Find players
    const player1 = await db
      .collection("players")
      .findOne({ name: scoreData["Player 1"] });
    const player2 = await db
      .collection("players")
      .findOne({ name: scoreData["Player 2"] });

    if (!player1 || !player2) {
      skipped++;
      continue;
    }

    // Check for duplicates
    const existing = await db.collection("tournamentresults").findOne({
      tournamentId: tournament._id,
      players: { $all: [player1._id, player2._id] },
    });

    if (existing) continue;

    await db.collection("tournamentresults").insertOne({
      tournamentId: tournament._id,
      players: [player1._id, player2._id],
      division: scoreData.Division || "",
      seed: parseInt(scoreData.Seed) || undefined,
      roundRobinScores: {
        round1: parseInt(scoreData["Round-1"]) || 0,
        round2: parseInt(scoreData["Round-2"]) || 0,
        round3: parseInt(scoreData["Round-3"]) || 0,
        rrWon: parseInt(scoreData["RR Won"]) || 0,
        rrLost: parseInt(scoreData["RR Lost"]) || 0,
        rrPlayed: parseInt(scoreData["RR Played"]) || 0,
        rrWinPercentage: parseFloat(scoreData["RR Win %"]) || 0,
        rrRank: parseFloat(scoreData["RR Rank"]) || 0,
      },
      bracketScores: {
        r16Won: parseInt(scoreData["R16 Won"]) || 0,
        r16Lost: parseInt(scoreData["R16 Lost"]) || 0,
        r16Matchup:
          scoreData["Bracket Matchup"] || scoreData["R16 Matchup"] || null,
        qfWon: parseInt(scoreData["QF Won"]) || 0,
        qfLost: parseInt(scoreData["QF Lost"]) || 0,
        sfWon: parseInt(scoreData["SF Won"]) || 0,
        sfLost: parseInt(scoreData["SF Lost"]) || 0,
        finalsWon: parseInt(scoreData["Finals Won"]) || 0,
        finalsLost: parseInt(scoreData["Finals Lost"]) || 0,
        bracketWon: parseInt(scoreData["Bracket Won"]) || 0,
        bracketLost: parseInt(scoreData["Bracket Lost"]) || 0,
        bracketPlayed: parseInt(scoreData["Bracket Played"]) || 0,
      },
      totalStats: {
        totalWon: parseInt(scoreData["Total Won"]) || 0,
        totalLost: parseInt(scoreData["Total Lost"]) || 0,
        totalPlayed: parseInt(scoreData["Total Played"]) || 0,
        winPercentage: parseFloat(scoreData["Win%"]) || 0,
        finalRank: parseFloat(scoreData["Final Rank"]) || 0,
        bodFinish: parseInt(scoreData["BOD Finish"]) || 0,
        home:
          scoreData.Home === true ||
          scoreData.Home === "true" ||
          scoreData.Home === 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    inserted++;
  }

  console.log(`  ✅ Inserted ${inserted} team results (skipped ${skipped})`);
}

async function importTournamentFiles(db) {
  console.log("📥 Processing individual tournament files...");

  const files = fs
    .readdirSync(DATA_DIR)
    .filter(
      (file) =>
        file.endsWith(".json") &&
        file.match(/^\d{4}-\d{2}-\d{2}/) &&
        !["All Players.json", "All Scores.json", "Champions.json"].includes(
          file,
        ),
    );

  console.log(`  Found ${files.length} tournament files`);

  // Already handled by All Scores.json in most cases
  console.log("  ℹ️ Individual files handled via All Scores.json");
}

localImport();
