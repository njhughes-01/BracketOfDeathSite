#!/usr/bin/env python3
"""
Fix Player Data Format for Import Script
=======================================

The import script expects specific field names that don't match our converted format.
This script updates the player data to match what the import script is looking for.
"""

import json
import uuid
from datetime import datetime

def fix_player_format_for_import():
    """Convert player data to format expected by import script"""
    
    # Read our converted player data
    with open('json/All Players.json', 'r', encoding='utf-8') as f:
        players = json.load(f)
    
    print(f"Converting {len(players)} players for import script compatibility...")
    
    # Convert to the format the import script expects
    import_format_players = []
    
    for player in players:
        # The import script looks for these specific fields
        import_player = {
            # Primary identifier field the script expects
            "name": player.get("name", "Unknown Player"),
            
            # Fields the import script looks for
            "Games Played": player.get("gamesPlayed", 0),
            "Games Won": player.get("gamesWon", 0),
            "Winning %": player.get("winningPercentage", 0.0),
            "BOD's Played": player.get("bodsPlayed", 0),
            "Best Result": player.get("bestResult", 99),
            "AVG Finish": player.get("avgFinish", 99.0),
            "Ind Champs": player.get("individualChampionships", 0),
            "Div Champs": player.get("divisionChampionships", 0),
            "Champs": player.get("totalChampionships", 0),
            "Drawing Sequence": player.get("drawingSequence"),
            "Pairing": player.get("pairing"),
            
            # Optional fields
            "email": None,  # We don't have email data
            "phone": "",
            "city": "",
            "state": "",
            "Division": None,
            "Tournaments": player.get("bodsPlayed", 0)  # Use BODs played as tournament count
        }
        
        import_format_players.append(import_player)
    
    # Save the import-compatible format
    with open('json/All Players.json', 'w', encoding='utf-8') as f:
        json.dump(import_format_players, f, indent=2)
    
    print(f"SUCCESS: Converted {len(import_format_players)} players to import-compatible format")
    
    # Show sample
    if import_format_players:
        print("\nSample converted player:")
        sample = import_format_players[0]
        print(f"  Name: {sample['name']}")
        print("  BODs Played:", sample["BOD's Played"])
        print(f"  Best Result: {sample['Best Result']}")
        print(f"  Win Rate: {sample['Winning %']:.1%}")

if __name__ == "__main__":
    print("=== PLAYER DATA FORMAT CONVERTER FOR IMPORT ===")
    fix_player_format_for_import()
    print("\nPlayer data ready for import script!")