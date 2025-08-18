#!/usr/bin/env python3
"""
Calculate Championships from Scores Data
========================================

This script calculates championship counts by analyzing the All Scores.json
data for "BOD Finish": 1 records, then updates the player data with correct
championship counts.
"""

import json
from collections import defaultdict

def calculate_championships_from_scores():
    """Calculate championship counts from All Scores data"""
    
    print("=== CHAMPIONSHIP CALCULATION FROM SCORES DATA ===")
    
    # Read All Scores data
    with open('json/All Scores.json', 'r', encoding='utf-8') as f:
        all_scores = json.load(f)
    
    print(f"Processing {len(all_scores)} score records...")
    
    # Count championships per player (BOD Finish = 1)
    player_championships = defaultdict(int)
    
    for entry in all_scores:
        if entry.get('BOD Finish') == 1:  # Champion
            # Both players on the winning team get a championship
            player1 = entry.get('Player 1')
            player2 = entry.get('Player 2')
            
            if player1:
                player_championships[player1] += 1
            if player2:
                player_championships[player2] += 1
    
    print(f"Found {len(player_championships)} players with championships")
    
    # Show top champions
    top_champions = sorted(player_championships.items(), key=lambda x: x[1], reverse=True)[:10]
    print("\nTop Champions:")
    for name, count in top_champions:
        print(f"  {name}: {count} championships")
    
    # Read current player data
    with open('json/All Players.json', 'r', encoding='utf-8') as f:
        players = json.load(f)
    
    print(f"\nUpdating championship counts for {len(players)} players...")
    
    # Update player data with correct championship counts
    updated_count = 0
    for player in players:
        player_name = player['name']
        championships = player_championships.get(player_name, 0)
        
        # Update championship fields
        player['individualChampionships'] = championships
        player['divisionChampionships'] = 0  # We don't have division-specific data
        player['totalChampionships'] = championships
        
        if championships > 0:
            updated_count += 1
    
    # Save updated player data
    with open('json/All Players.json', 'w', encoding='utf-8') as f:
        json.dump(players, f, indent=2)
    
    print(f"SUCCESS: Updated {updated_count} players with championship data")
    print(f"Total championships awarded: {sum(player_championships.values())}")
    
    # Show some statistics
    championship_distribution = defaultdict(int)
    for count in player_championships.values():
        championship_distribution[count] += 1
    
    print("\nChampionship Distribution:")
    for champ_count in sorted(championship_distribution.keys(), reverse=True):
        player_count = championship_distribution[champ_count]
        print(f"  {champ_count} championships: {player_count} players")

if __name__ == "__main__":
    calculate_championships_from_scores()
    print("\nChampionship calculation complete!")