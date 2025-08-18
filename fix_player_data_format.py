#!/usr/bin/env python3
"""
Fix Player Data Format for Application
=====================================

This script converts the extracted "All Players.json" data to match
the format expected by the frontend application.

Current format (from Excel):
- "Player Name" -> name
- "BOD's Played" -> bodsPlayed  
- "Best Result" -> bestResult
- "AVG Finish" -> avgFinish
- "Games Played" -> gamesPlayed
- "Games Won" -> gamesWon
- "Winning %" -> winningPercentage

Required format (by app):
- name, bodsPlayed, bestResult, avgFinish, gamesPlayed, gamesWon, winningPercentage
- Additional fields: individualChampionships, divisionChampionships, totalChampionships
- ID fields: _id, id
"""

import json
import uuid
from datetime import datetime

def fix_player_data():
    """Convert All Players.json to application format"""
    
    # Read the extracted player data
    with open('json/All Players.json', 'r', encoding='utf-8') as f:
        extracted_players = json.load(f)
    
    print(f"Processing {len(extracted_players)} players...")
    
    # Convert to application format
    app_format_players = []
    
    for i, player in enumerate(extracted_players):
        # Generate IDs
        player_id = str(uuid.uuid4())
        
        # Helper function to safely convert numbers
        def safe_int(value, default=0):
            try:
                return int(value) if value not in [None, '', '#DIV/0!', 'N/A'] else default
            except (ValueError, TypeError):
                return default
        
        def safe_float(value, default=0.0):
            try:
                return float(value) if value not in [None, '', '#DIV/0!', 'N/A'] else default
            except (ValueError, TypeError):
                return default

        # Map fields to expected format
        app_player = {
            "_id": player_id,
            "id": player_id,
            "name": player.get("Player Name") or player.get("480 Unique Players") or player.get("457 Unique Players") or "Unknown Player",
            "bodsPlayed": safe_int(player.get("BOD's Played"), 0),
            "bestResult": safe_int(player.get("Best Result"), 99),
            "avgFinish": safe_float(player.get("AVG Finish"), 99.0),
            "gamesPlayed": safe_int(player.get("Games Played"), 0),
            "gamesWon": safe_int(player.get("Games Won"), 0),
            "winningPercentage": safe_float(player.get("Winning %"), 0.0),
            
            # Default values for fields not in extracted data
            "individualChampionships": 0,
            "divisionChampionships": 0, 
            "totalChampionships": 0,
            "drawingSequence": i + 1,
            "pairing": None,
            
            # Timestamps
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
        
        app_format_players.append(app_player)
    
    # Save the converted data
    with open('json/All Players.json', 'w', encoding='utf-8') as f:
        json.dump(app_format_players, f, indent=2)
    
    print(f"SUCCESS: Converted {len(app_format_players)} players to application format")
    
    # Show sample
    if app_format_players:
        print("\nSample converted player:")
        sample = app_format_players[0]
        print(f"  Name: {sample['name']}")
        print(f"  BODs Played: {sample['bodsPlayed']}")
        print(f"  Best Result: {sample['bestResult']}")
        print(f"  Win Rate: {sample['winningPercentage']:.1%}")
        print(f"  Games: {sample['gamesWon']}/{sample['gamesPlayed']}")

def calculate_championships():
    """Calculate championship counts from All Scores data"""
    
    # Read All Scores to calculate championships
    try:
        with open('json/All Scores.json', 'r', encoding='utf-8') as f:
            all_scores = json.load(f)
        
        # Count championships per player (BOD Finish = 1)
        player_championships = {}
        
        for entry in all_scores:
            if entry.get('BOD Finish') == 1:  # Champion
                player1 = entry.get('Player 1')
                player2 = entry.get('Player 2')
                
                if player1:
                    player_championships[player1] = player_championships.get(player1, 0) + 1
                if player2:
                    player_championships[player2] = player_championships.get(player2, 0) + 1
        
        print(f"\nChampionship data calculated from {len(all_scores)} score records")
        print(f"Found {len(player_championships)} players with championships")
        
        # Update player data with championship counts
        with open('json/All Players.json', 'r', encoding='utf-8') as f:
            players = json.load(f)
        
        updated_count = 0
        for player in players:
            player_name = player['name']
            championships = player_championships.get(player_name, 0)
            
            if championships > 0:
                player['totalChampionships'] = championships
                player['individualChampionships'] = championships  # For now, treat all as individual
                updated_count += 1
        
        # Save updated data
        with open('json/All Players.json', 'w', encoding='utf-8') as f:
            json.dump(players, f, indent=2)
            
        print(f"SUCCESS: Updated {updated_count} players with championship data")
        
        # Show top champions
        top_champions = sorted(player_championships.items(), key=lambda x: x[1], reverse=True)[:5]
        print("\nTop Champions:")
        for name, count in top_champions:
            print(f"  {name}: {count} championships")
            
    except Exception as e:
        print(f"WARNING: Could not calculate championships: {e}")

if __name__ == "__main__":
    print("=== PLAYER DATA FORMAT CONVERTER ===")
    fix_player_data()
    calculate_championships()
    print("\nPlayer data ready for application!")