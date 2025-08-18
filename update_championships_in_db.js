const { MongoClient } = require('mongodb');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/bracket_of_death?authSource=admin';

console.log('Updating championship data in database...');

async function updateChampionships() {
  // Read the corrected player data with championships
  const playersData = JSON.parse(fs.readFileSync('/app/data/All Players.json', 'utf8'));
  
  console.log(`Processing ${playersData.length} players for championship updates...`);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('bracket_of_death');
    const playersCollection = db.collection('players');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const playerData of playersData) {
      const playerName = playerData.name;
      const championships = playerData.totalChampionships || 0;
      
      if (championships > 0) {
        // Update the player's championship data
        const result = await playersCollection.updateOne(
          { name: playerName },
          {
            $set: {
              individualChampionships: playerData.individualChampionships || 0,
              divisionChampionships: playerData.divisionChampionships || 0,
              totalChampionships: championships,
              updatedAt: new Date()
            }
          }
        );
        
        if (result.matchedCount > 0) {
          updatedCount++;
          console.log(`  ✓ Updated ${playerName}: ${championships} championships`);
        } else {
          notFoundCount++;
          console.log(`  ✗ Player not found: ${playerName}`);
        }
      }
    }
    
    console.log(`\n=== Championship Update Summary ===`);
    console.log(`Players updated: ${updatedCount}`);
    console.log(`Players not found: ${notFoundCount}`);
    
    // Show top champions after update
    const topChampions = await playersCollection
      .find({ totalChampionships: { $gt: 0 } })
      .sort({ totalChampionships: -1 })
      .limit(10)
      .toArray();
      
    console.log(`\nTop Champions in Database:`);
    for (const champion of topChampions) {
      console.log(`  ${champion.name}: ${champion.totalChampionships} championships`);
    }
    
  } catch (error) {
    console.error('Error updating championships:', error);
  } finally {
    await client.close();
  }
}

updateChampionships();