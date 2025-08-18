const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DATA_DIR = '/app/data';

const STATUS_FILE = '/app/status/import-completed';

console.log('Starting comprehensive data import (All Players, Champions, All Scores, Individual Tournaments)...');

async function simpleImport() {
  // Check if import has already been completed
  if (fs.existsSync(STATUS_FILE)) {
    const completedDate = fs.readFileSync(STATUS_FILE, 'utf8').trim();
    console.log(`Data import already completed on: ${completedDate}`);
    console.log('Skipping import. To force re-import, delete the status file.');
    return;
  }

  if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('bracket_of_death');
    
    // Clear existing data and drop collections to bypass validation
    await db.collection('tournaments').drop().catch(() => {});
    await db.collection('tournamentresults').drop().catch(() => {});
    console.log('Dropped existing tournament collections');
    
    // Recreate collections without validation
    await db.createCollection('tournaments');
    await db.createCollection('tournamentresults');
    console.log('Created new collections without validation');
    
    // Import players first
    await importPlayers(db);
    console.log('Players import completed');
    
    // Import champions/tournament metadata
    await importChampions(db);
    console.log('Champions metadata import completed');
    
    // Import all scores data (comprehensive historical data)
    await importAllScores(db);
    console.log('All scores import completed');
    
    // Get all tournament files from the data directory (as backup/validation)
    const files = fs.readdirSync(DATA_DIR);
    const validFiles = files.filter(file => 
      file.endsWith('.json') && 
      file !== 'All Players.json' && 
      file !== 'All Scores.json' && 
      file !== 'Champions.json' &&
      file.match(/^\d{4}-\d{2}-\d{2}/) // Match date pattern YYYY-MM-DD
    );
    
    console.log(`Found ${validFiles.length} tournament files to process`);
    
    let totalTournaments = 0;
    let totalResults = 0;
    
    for (const fileName of validFiles) {
      const filePath = path.join(DATA_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${fileName}`);
        continue;
      }
      
      console.log(`\nProcessing ${fileName}...`);
      
      const result = await importTournamentFile(db, filePath);
      if (result) {
        totalTournaments++;
        totalResults += result.resultsCount;
        console.log(`✓ Imported tournament with ${result.resultsCount} team results`);
      } else {
        console.log(`✗ Failed to import ${fileName}`);
      }
    }
    
    console.log(`\n=== Comprehensive Import Summary ===`);
    console.log(`Players imported: From All Players.json`);
    console.log(`Champions metadata: Applied to tournaments`);
    console.log(`All Scores data: Comprehensive historical records imported`);
    console.log(`Individual tournament files: ${totalTournaments} processed`);
    console.log(`Additional team results: ${totalResults} from individual files`);
    console.log(`Comprehensive import completed successfully!`);
    
    // Create status file to indicate completion
    const statusDir = path.dirname(STATUS_FILE);
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }
    fs.writeFileSync(STATUS_FILE, new Date().toISOString());
    console.log(`Status file created: ${STATUS_FILE}`);
    
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function importTournamentFile(db, filePath) {
  const fileName = path.basename(filePath);
  const tournamentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Extract tournament info from filename
  const [datePart, formatPart] = fileName.replace('.json', '').split(' ');
  const tournamentDate = new Date(datePart);
  
  // Check if tournament already exists by date (avoid duplicates with Champions.json data)
  const existingTournament = await db.collection('tournaments').findOne({
    date: {
      $gte: new Date(tournamentDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
      $lte: new Date(tournamentDate.getTime() + 24 * 60 * 60 * 1000)  // 1 day after
    }
  });
  
  if (existingTournament) {
    console.log(`  Tournament already exists for ${datePart} (BOD #${existingTournament.bodNumber}), skipping tournament creation`);
    
    // Still process team results for this existing tournament
    const validTeamData = tournamentData.filter(team => {
      // Skip summary/aggregate rows
      if (!team['Teams (Round Robin)'] || 
          team['Teams (Round Robin)'] === "Tiebreakers" ||
          team.Date === "Home" || 
          team.Date === null) {
        return false;
      }
      
      // New format (2024+) has Player 1 and Player 2 fields
      if (team['Player 1'] && team['Player 2']) {
        return true;
      }
      
      // Old format - check if Teams (Round Robin) has two players
      if (team['Teams (Round Robin)']) {
        const teamName = team['Teams (Round Robin)'];
        // Check if it contains ' & ' indicating two players
        if (teamName.includes(' & ') && teamName.split(' & ').length === 2) {
          return true;
        }
      }
      
      return false;
    });
    
    if (validTeamData.length === 0) {
      console.log(`  No valid team data found for existing tournament`);
      return null;
    }
    
    console.log(`  Found ${validTeamData.length} valid team records for existing tournament`);
    
    // Use existing tournament ID
    const tournamentId = existingTournament._id;
    
    // Process team results (rest of the function continues below)
    return await processTeamResults(db, tournamentId, validTeamData);
  }
  
  // Generate BOD number (YYYYMM format) - only for tournaments not in Champions.json
  const year = tournamentDate.getFullYear();
  const month = tournamentDate.getMonth() + 1;
  const bodNumber = parseInt(`${year}${month.toString().padStart(2, '0')}`);
  
  // Normalize format
  let format = 'Mixed';
  if (formatPart === 'M') format = 'M';
  else if (formatPart === 'W') format = 'W';
  else if (formatPart === 'Mixed') format = 'Mixed';
  
  // Filter valid team data - handle both old and new formats
  const validTeamData = tournamentData.filter(team => {
    // Skip summary/aggregate rows
    if (!team['Teams (Round Robin)'] || 
        team['Teams (Round Robin)'] === "Tiebreakers" ||
        team.Date === "Home" || 
        team.Date === null) {
      return false;
    }
    
    // New format (2024+) has Player 1 and Player 2 fields
    if (team['Player 1'] && team['Player 2']) {
      return true;
    }
    
    // Old format - check if Teams (Round Robin) has two players
    if (team['Teams (Round Robin)']) {
      const teamName = team['Teams (Round Robin)'];
      // Check if it contains ' & ' indicating two players
      if (teamName.includes(' & ') && teamName.split(' & ').length === 2) {
        return true;
      }
    }
    
    return false;
  });
  
  if (validTeamData.length === 0) {
    console.log(`  No valid team data found`);
    return null;
  }
  
  console.log(`  Found ${validTeamData.length} valid team records`);
  
  // Create simple tournament document
  const tournament = {
    bodNumber: bodNumber,
    date: tournamentDate,
    format: format,
    location: 'Tournament Location',
    advancementCriteria: 'Standard tournament advancement rules',
    notes: `${format} tournament on ${datePart} with ${validTeamData.length} teams`,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Insert tournament
  let tournamentId;
  try {
    const tournamentResult = await db.collection('tournaments').insertOne(tournament);
    tournamentId = tournamentResult.insertedId;
    console.log(`  ✓ Created tournament BOD #${bodNumber}`);
  } catch (error) {
    console.log(`  ✗ Failed to create tournament: ${error.message}`);
    return null;
  }
  
  // Process team results
  return await processTeamResults(db, tournamentId, validTeamData);
}

async function processTeamResults(db, tournamentId, validTeamData) {
  // Import team results
  const teamResults = [];
  let playersFound = 0;
  let playersNotFound = 0;
  
  for (const teamData of validTeamData) {
    let player1Name, player2Name;
    
    // Handle different data formats
    if (teamData['Player 1'] && teamData['Player 2']) {
      // New format (2024+)
      player1Name = teamData['Player 1'];
      player2Name = teamData['Player 2'];
    } else if (teamData['Teams (Round Robin)']) {
      // Old format - extract players from team name
      const teamName = teamData['Teams (Round Robin)'];
      const players = teamName.split(' & ');
      if (players.length === 2) {
        player1Name = players[0].trim();
        player2Name = players[1].trim();
      } else {
        console.log(`  Could not parse team: ${teamName}`);
        continue;
      }
    } else {
      console.log(`  Missing player data for team`);
      continue;
    }
    
    // Find players
    const player1 = await db.collection('players').findOne({ name: player1Name });
    const player2 = await db.collection('players').findOne({ name: player2Name });
    
    if (!player1 || !player2) {
      if (!player1) playersNotFound++;
      if (!player2) playersNotFound++;
      continue;
    }
    
    playersFound += 2;
    
    // Check for duplicates before inserting
    const existingResult = await db.collection('tournamentresults').findOne({
      tournamentId: tournamentId,
      players: { $all: [player1._id, player2._id] }
    });
    
    if (existingResult) {
      console.log(`  Skipping duplicate team result for ${player1Name} & ${player2Name}`);
      continue;
    }
    
    // Create team result with minimal required fields
    const teamResult = {
      tournamentId: tournamentId,
      players: [player1._id, player2._id],
      division: teamData['Division'] || '',
      seed: parseInt(teamData['Seed']) || undefined,
      roundRobinScores: {
        round1: parseInt(teamData['Round-1']) || 0,
        round2: parseInt(teamData['Round-2']) || 0,
        round3: parseInt(teamData['Round-3']) || 0,
        rrWon: parseInt(teamData['RR Won']) || 0,
        rrLost: parseInt(teamData['RR Lost']) || 0,
        rrPlayed: parseInt(teamData['RR Played']) || 0,
        rrWinPercentage: parseFloat(teamData['RR Win%']) || 0,
        rrRank: parseFloat(teamData['RR Rank']) || 0
      },
      bracketScores: {
        r16Won: parseInt(teamData['R16 Won']) || 0,
        r16Lost: parseInt(teamData['R16 Lost']) || 0,
        qfWon: parseInt(teamData['QF Won']) || 0,
        qfLost: parseInt(teamData['QF Lost']) || 0,
        sfWon: parseInt(teamData['SF Won']) || 0,
        sfLost: parseInt(teamData['SF Lost']) || 0,
        finalsWon: parseInt(teamData['Finals Won']) || 0,
        finalsLost: parseInt(teamData['Finals Lost']) || 0,
        bracketWon: parseInt(teamData['Bracket Won']) || 0,
        bracketLost: parseInt(teamData['Bracket Lost']) || 0,
        bracketPlayed: parseInt(teamData['Bracket Played']) || 0
      },
      totalStats: {
        totalWon: parseInt(teamData['Total Won']) || 0,
        totalLost: parseInt(teamData['Total Lost']) || 0,
        totalPlayed: parseInt(teamData['Total Played']) || 0,
        winPercentage: parseFloat(teamData['Win %']) || 0,
        finalRank: parseFloat(teamData['Final Rank']) || 0,
        bodFinish: parseInt(teamData['BOD Finish']) || 0,
        home: teamData['Home'] === 'Home' || false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    teamResults.push(teamResult);
  }
  
  console.log(`  Players found: ${playersFound}, not found: ${playersNotFound}`);
  
  // Insert team results
  if (teamResults.length > 0) {
    try {
      await db.collection('tournamentresults').insertMany(teamResults);
      console.log(`  ✓ Inserted ${teamResults.length} team results`);
    } catch (error) {
      console.log(`  ✗ Failed to insert team results: ${error.message}`);
      // Try individual inserts as fallback
      let successCount = 0;
      for (const result of teamResults) {
        try {
          await db.collection('tournamentresults').insertOne(result);
          successCount++;
        } catch (e) {
          console.log(`    Failed individual insert: ${e.message}`);
        }
      }
      console.log(`  ✓ Individual inserts: ${successCount}/${teamResults.length}`);
    }
  }
  
  return { resultsCount: teamResults.length };
}

async function importPlayers(db) {
  console.log('Importing players...');
  
  const playersFile = path.join(DATA_DIR, 'All Players.json');
  if (!fs.existsSync(playersFile)) {
    console.log('All Players.json not found, skipping player import');
    return;
  }
  
  const playersData = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
  const players = [];
  
  for (const player of playersData) {
    // Get the full name from the first column (which has a weird key)
    const fullName = player['457 Unique Players'] || player.name || '';
    
    // Skip if essential data is missing
    if (!fullName || fullName.trim() === '') {
      console.log('Skipping player with missing name:', player);
      continue;
    }
    
    // Check if player already exists
    const existingPlayer = await db.collection('players').findOne({ name: fullName });
    if (existingPlayer) {
      continue; // Skip if player already exists
    }
    
    // Split full name into first and last names
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Create simple player document - only include email if we have a real one
    const cleanPlayer = {
      name: fullName,
      firstName: firstName,
      lastName: lastName,
      phone: player.phone || player.Phone || '',
      city: player.city || player.City || '',
      state: player.state || player.State || '',
      gamesPlayed: parseInt(player['Games Played'] || 0) || 0,
      gamesWon: parseInt(player['Games Won'] || 0) || 0,
      winningPercentage: parseFloat(player['Winning %'] || 0) || 0,
      bodsPlayed: parseInt(player["BOD's Played"] || 0) || 0,
      bestResult: parseInt(player['Best Result'] || 0) || 0,
      avgFinish: parseFloat(player['AVG Finish'] || 0) || 0,
      tournaments: parseInt(player['Tournaments'] || 0) || 0,
      individualChampionships: parseInt(player['individualChampionships'] || 0) || 0,
      divisionChampionships: parseInt(player['divisionChampionships'] || 0) || 0,
      totalChampionships: parseInt(player['totalChampionships'] || 0) || 0,
      division: player['Division'] || null,
      drawingSequence: player['Drawing Sequence'] || null,
      pairing: player['Pairing'] || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Only add email if we have one from the source data
    const email = player.email || player.Email || '';
    if (email && email.includes('@')) {
      cleanPlayer.email = email;
    }
    
    players.push(cleanPlayer);
  }
  
  if (players.length > 0) {
    try {
      await db.collection('players').insertMany(players);
      console.log(`  ✓ Imported ${players.length} players`);
    } catch (error) {
      console.log(`  ✗ Bulk insert failed, trying individual inserts...`);
      let successCount = 0;
      let failureCount = 0;
      
      for (const player of players) {
        try {
          await db.collection('players').insertOne(player);
          successCount++;
        } catch (insertError) {
          failureCount++;
          console.log(`    Failed to insert player: ${player.name}`);
        }
      }
      
      console.log(`  Individual insert results: ${successCount} successful, ${failureCount} failed`);
    }
  } else {
    console.log('  No new players to import');
  }
  
  // Show final count
  const finalPlayersCount = await db.collection('players').countDocuments();
  console.log(`  Total players in database: ${finalPlayersCount}`);
}

async function importChampions(db) {
  console.log('Importing champions metadata and creating tournaments...');
  
  const championsFile = path.join(DATA_DIR, 'Champions.json');
  if (!fs.existsSync(championsFile)) {
    console.log('Champions.json not found, skipping champions import');
    return;
  }
  
  const championsData = JSON.parse(fs.readFileSync(championsFile, 'utf8'));
  let createdTournaments = 0;
  
  for (const champData of championsData) {
    // Skip summary/aggregate rows or invalid data
    if (!champData.Format || champData.Format.includes('(') || champData.Date === null || !champData['BOD#']) {
      continue;
    }
    
    // Filter out future dates (likely data errors)
    const tournamentDate = new Date(champData.Date);
    if (tournamentDate > new Date()) {
      console.log(`  Skipping future date: BOD #${champData['BOD#']} - ${tournamentDate.toDateString()}`);
      continue;
    }
    
    const bodNumber = champData['BOD#'];
    
    // Normalize format to detailed format types
    const format = champData.Format;
    let normalizedFormat = 'Mixed Doubles'; // Default
    if (format === 'Men\'s Singles') normalizedFormat = 'Men\'s Singles';
    else if (format === 'Men\'s Doubles') normalizedFormat = 'Men\'s Doubles';
    else if (format === 'Women\'s Doubles') normalizedFormat = 'Women\'s Doubles';
    else if (format === 'Mixed Doubles') normalizedFormat = 'Mixed Doubles';
    
    // Check if tournament already exists
    const existingTournament = await db.collection('tournaments').findOne({ bodNumber: bodNumber });
    if (existingTournament) {
      continue;
    }
    
    // Create tournament with proper BOD number
    const tournament = {
      bodNumber: bodNumber,
      date: tournamentDate,
      format: normalizedFormat,
      location: champData.Location || 'Tournament Location',
      advancementCriteria: champData['Advancement Criteria'] || 'Standard tournament advancement rules',
      notes: champData.Notes || `${normalizedFormat} tournament on ${tournamentDate.toDateString()}`,
      photoAlbums: champData['Photo Albums'] || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      await db.collection('tournaments').insertOne(tournament);
      createdTournaments++;
      console.log(`  ✓ Created BOD #${bodNumber}: ${normalizedFormat} - ${tournamentDate.toDateString()}`);
    } catch (error) {
      console.log(`  ✗ Failed to create BOD #${bodNumber}: ${error.message}`);
    }
  }
  
  console.log(`  ✓ Created ${createdTournaments} tournaments from Champions data`);
}

async function importAllScores(db) {
  console.log('Importing all scores data...');
  
  const allScoresFile = path.join(DATA_DIR, 'All Scores.json');
  if (!fs.existsSync(allScoresFile)) {
    console.log('All Scores.json not found, skipping all scores import');
    return;
  }
  
  const allScoresData = JSON.parse(fs.readFileSync(allScoresFile, 'utf8'));
  const allTeamResults = [];
  
  console.log(`  Processing ${allScoresData.length} score records...`);
  
  let matchedTournaments = 0;
  let unmatchedRecords = 0;
  
  for (const scoreData of allScoresData) {
    // Skip invalid records
    if (!scoreData.Date || !scoreData['Player 1'] || !scoreData['Player 2']) {
      continue;
    }
    
    // Convert date
    const scoreDate = new Date(scoreData.Date);
    if (isNaN(scoreDate.getTime())) continue;
    
    // Find the tournament by matching the date (within a reasonable range)
    const tournament = await db.collection('tournaments').findOne({
      date: {
        $gte: new Date(scoreDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
        $lte: new Date(scoreDate.getTime() + 24 * 60 * 60 * 1000)  // 1 day after
      }
    });
    
    if (!tournament) {
      unmatchedRecords++;
      if (unmatchedRecords <= 5) {
        console.log(`  Could not match tournament for date: ${scoreDate.toDateString()}`);
      }
      continue;
    }
    
    matchedTournaments++;
    
    // Find players
    const player1 = await db.collection('players').findOne({ name: scoreData['Player 1'] });
    const player2 = await db.collection('players').findOne({ name: scoreData['Player 2'] });
    
    if (!player1 || !player2) {
      continue;
    }
    
    // Create comprehensive team result
    const teamResult = {
      tournamentId: tournament._id,
      players: [player1._id, player2._id],
      division: scoreData.Division || scoreData['Division.1'] || '',
      seed: parseInt(scoreData.Seed) || undefined,
      roundRobinScores: {
        round1: parseInt(scoreData['Round-1']) || 0,
        round2: parseInt(scoreData['Round-2']) || 0,
        round3: parseInt(scoreData['Round-3']) || 0,
        rrWon: parseInt(scoreData['RR Won']) || 0,
        rrLost: parseInt(scoreData['RR Lost']) || 0,
        rrPlayed: parseInt(scoreData['RR Played']) || 0,
        rrWinPercentage: parseFloat(scoreData['RR Win %']) || 0,
        rrRank: parseFloat(scoreData['RR Rank']) || 0
      },
      bracketScores: {
        r16Won: parseInt(scoreData['R16 Won']) || 0,
        r16Lost: parseInt(scoreData['R16 Lost']) || 0,
        qfWon: parseInt(scoreData['QF Won']) || 0,
        qfLost: parseInt(scoreData['QF Lost']) || 0,
        sfWon: parseInt(scoreData['SF Won']) || 0,
        sfLost: parseInt(scoreData['SF Lost']) || 0,
        finalsWon: parseInt(scoreData['Finals Won']) || 0,
        finalsLost: parseInt(scoreData['Finals Lost']) || 0,
        bracketWon: parseInt(scoreData['Bracket Won']) || 0,
        bracketLost: parseInt(scoreData['Bracket Lost']) || 0,
        bracketPlayed: parseInt(scoreData['Bracket Played']) || 0
      },
      totalStats: {
        totalWon: parseInt(scoreData['Total Won']) || 0,
        totalLost: parseInt(scoreData['Total Lost']) || 0,
        totalPlayed: parseInt(scoreData['Total Played']) || 0,
        winPercentage: parseFloat(scoreData['Win%']) || 0,
        finalRank: parseFloat(scoreData['Final Rank']) || 0,
        bodFinish: parseInt(scoreData['BOD Finish']) || 0,
        home: false
      },
      bracketMatchup: scoreData['Bracket Matchup'] || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    allTeamResults.push(teamResult);
  }
  
  console.log(`  Matched ${matchedTournaments} records to tournaments, ${unmatchedRecords} unmatched`);
  
  // Insert team results (with duplicate checking)
  if (allTeamResults.length > 0) {
    let insertedCount = 0;
    let duplicateCount = 0;
    
    for (const teamResult of allTeamResults) {
      const existing = await db.collection('tournamentresults').findOne({
        tournamentId: teamResult.tournamentId,
        players: { $all: teamResult.players }
      });
      
      if (!existing) {
        try {
          await db.collection('tournamentresults').insertOne(teamResult);
          insertedCount++;
        } catch (e) {
          // Skip validation errors
          console.log(`    Failed to insert team result: ${e.message}`);
        }
      } else {
        duplicateCount++;
      }
    }
    
    console.log(`  ✓ Inserted ${insertedCount} new team results from All Scores`);
    console.log(`  ⚠ Skipped ${duplicateCount} duplicate results`);
  }
}

simpleImport();