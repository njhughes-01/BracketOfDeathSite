#!/usr/bin/env python3
"""
BOD Data Extraction from Excel - Complete Implementation
=======================================================

This script extracts all tournament data from the corrected Excel file
(BOD Scores History_2025-08-01.xlsx) and generates individual JSON files
for each tournament, plus aggregate files.

The Excel file contains:
- 44 sheets total: Champions, All Scores, RM, All Players, plus individual tournament sheets
- Tournament sheets named like "2025-08-02 W", "2024-08-31 Mixed", etc.
- Consistent column structure with Player 1, Player 2, scores, seeds, matchups

Usage: python extract_bod_data_from_excel.py
"""

import pandas as pd
import json
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Any

class BODExcelDataExtractor:
    def __init__(self, excel_file: str = "json/BOD Scores History_2025-08-01.xlsx", output_dir: str = "json"):
        self.excel_file = excel_file
        self.output_dir = output_dir
        self.xl_file = None
        self.all_tournament_data = []
        self.all_player_stats = {}
        self.champions_data = []
        
    def load_excel_file(self):
        """Load the Excel file and get sheet names"""
        print(f"Loading Excel file: {self.excel_file}")
        self.xl_file = pd.ExcelFile(self.excel_file)
        print(f"Found {len(self.xl_file.sheet_names)} sheets")
        return self.xl_file.sheet_names
        
    def identify_tournament_sheets(self, sheet_names: List[str]) -> List[str]:
        """Identify tournament sheets based on naming patterns"""
        tournament_sheets = []
        # Pattern: YYYY-MM-DD Format (like "2025-08-02 W", "2024-08-31 Mixed")
        date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}\s+[A-Za-z]+')
        
        for sheet_name in sheet_names:
            if date_pattern.match(sheet_name):
                tournament_sheets.append(sheet_name)
        
        print(f"Found {len(tournament_sheets)} tournament sheets")
        return sorted(tournament_sheets, reverse=True)  # Most recent first
        
    def extract_date_and_format_from_sheet_name(self, sheet_name: str) -> tuple:
        """Extract date and format from sheet name"""
        parts = sheet_name.split(' ', 1)
        if len(parts) == 2:
            date_str = parts[0]
            format_str = parts[1]
            
            # Normalize format names
            format_mapping = {
                'M': "Men's",
                'W': "Women's", 
                'Mixed': 'Mixed',
                'Men': "Men's",
                'Women': "Women's"
            }
            
            normalized_format = format_mapping.get(format_str, format_str)
            return date_str, normalized_format
        return None, None
        
    def extract_tournament_data(self, sheet_name: str) -> List[Dict]:
        """Extract data from a single tournament sheet"""
        print(f"Processing tournament: {sheet_name}")
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name=sheet_name)
            
            # Clean up the dataframe - remove rows where key fields are empty
            df = df.dropna(subset=['Player 1', 'Player 2'], how='any')
            
            # Extract date and format
            date_str, format_name = self.extract_date_and_format_from_sheet_name(sheet_name)
            
            tournament_entries = []
            
            for _, row in df.iterrows():
                entry = {}
                
                # Basic tournament info
                if date_str:
                    try:
                        entry['Date'] = datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y-%m-%d')
                    except:
                        entry['Date'] = date_str
                        
                entry['Format'] = format_name or row.get('Format', '')
                
                # Player information
                entry['Player 1'] = str(row['Player 1']).strip()
                entry['Player 2'] = str(row['Player 2']).strip()
                
                # Team names
                if pd.notna(row.get('Teams (Round Robin)')):
                    entry['Teams (Round Robin)'] = str(row['Teams (Round Robin)']).strip()
                if pd.notna(row.get('Teams (Summary)')):
                    entry['Teams (Summary)'] = str(row['Teams (Summary)']).strip()
                if pd.notna(row.get('Teams (Bracket)')):
                    entry['Teams (Bracket)'] = str(row['Teams (Bracket)']).strip()
                    
                # Division information
                if pd.notna(row.get('Division')):
                    entry['Division'] = str(row['Division']).strip()
                if pd.notna(row.get('Division.1')):
                    entry['Division.1'] = str(row['Division.1']).strip()
                    
                # Round Robin data
                for round_col in ['Round-1', 'Round-2', 'Round-3']:
                    if round_col in row and pd.notna(row[round_col]):
                        entry[round_col] = int(row[round_col])
                        
                for stat in ['RR Won', 'RR Lost', 'RR Played']:
                    if stat in row and pd.notna(row[stat]):
                        entry[stat] = int(row[stat])
                        
                if 'RR Win%' in row and pd.notna(row['RR Win%']):
                    entry['RR Win %'] = float(row['RR Win%'])
                elif 'RR Win %' in row and pd.notna(row['RR Win %']):
                    entry['RR Win %'] = float(row['RR Win %'])
                    
                if 'RR Rank' in row and pd.notna(row['RR Rank']):
                    entry['RR Rank'] = float(row['RR Rank'])
                    
                # Seeding information
                for seed_col in ['Seed', 'Seed.1']:
                    if seed_col in row and pd.notna(row[seed_col]):
                        entry[seed_col] = int(row[seed_col])
                        
                # Bracket matchup information
                for matchup_col in ['R16 Matchup', 'Bracket Matchup', 'R16 Match ID']:
                    if matchup_col in row and pd.notna(row[matchup_col]):
                        if isinstance(row[matchup_col], str):
                            entry[matchup_col] = row[matchup_col]
                        else:
                            entry[matchup_col] = int(row[matchup_col])
                            
                # Bracket scores
                bracket_rounds = ['R16', 'QF', 'SF', 'Finals']
                for round_name in bracket_rounds:
                    for stat in ['Won', 'Lost']:
                        col_name = f'{round_name} {stat}'
                        if col_name in row and pd.notna(row[col_name]):
                            entry[col_name] = int(row[col_name])
                            
                # Bracket totals
                for stat in ['Bracket Won', 'Bracket Lost', 'Bracket Played']:
                    if stat in row and pd.notna(row[stat]):
                        entry[stat] = int(row[stat])
                        
                # Total stats
                for stat in ['Total Won', 'Total Lost', 'Total Played']:
                    if stat in row and pd.notna(row[stat]):
                        entry[stat] = int(row[stat])
                        
                if 'Win %' in row and pd.notna(row['Win %']):
                    entry['Win %'] = float(row['Win %'])
                elif 'Win%' in row and pd.notna(row['Win%']):
                    entry['Win %'] = float(row['Win%'])
                    
                # Final ranking
                for rank_col in ['Final Rank', 'BOD Finish']:
                    if rank_col in row and pd.notna(row[rank_col]):
                        entry[rank_col] = int(row[rank_col])
                        
                # Additional fields that might exist
                for field in ['Home', 'Location', 'Notes']:
                    if field in row and pd.notna(row[field]):
                        entry[field] = str(row[field]).strip()
                        
                tournament_entries.append(entry)
                
            print(f"  Extracted {len(tournament_entries)} team entries")
            return tournament_entries
            
        except Exception as e:
            print(f"  Error processing {sheet_name}: {e}")
            return []
            
    def extract_champions_data(self) -> List[Dict]:
        """Extract champions data from Champions sheet"""
        print("Processing Champions sheet...")
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='Champions')
            
            champions = []
            for _, row in df.iterrows():
                if pd.notna(row.get('Date')) and str(row['Date']).strip() not in ['', 'nan']:
                    champion_entry = {}
                    
                    # Copy all available fields
                    for col in df.columns:
                        if pd.notna(row[col]) and str(row[col]).strip() not in ['', 'nan']:
                            champion_entry[col] = row[col]
                            
                    champions.append(champion_entry)
                    
            print(f"  Extracted {len(champions)} champion records")
            return champions
            
        except Exception as e:
            print(f"  Error processing Champions sheet: {e}")
            return []
            
    def extract_all_players_data(self) -> List[Dict]:
        """Extract all players data from All Players sheet"""
        print("Processing All Players sheet...")
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='All Players')
            
            players = []
            for _, row in df.iterrows():
                player_entry = {}
                
                # Copy all available fields, handling the special column name
                for col in df.columns:
                    if pd.notna(row[col]) and str(row[col]).strip() not in ['', 'nan']:
                        # Normalize the column name for the player name field
                        if 'Unique Players' in col:
                            player_entry['Player Name'] = str(row[col]).strip()
                        else:
                            player_entry[col] = row[col]
                            
                if 'Player Name' in player_entry:
                    players.append(player_entry)
                    
            print(f"  Extracted {len(players)} player records")
            return players
            
        except Exception as e:
            print(f"  Error processing All Players sheet: {e}")
            return []
            
    def extract_all_scores_data(self) -> List[Dict]:
        """Extract all scores data from All Scores sheet"""
        print("Processing All Scores sheet...")
        
        try:
            df = pd.read_excel(self.excel_file, sheet_name='All Scores')
            
            all_scores = []
            for _, row in df.iterrows():
                if pd.notna(row.get('Player 1')) and pd.notna(row.get('Player 2')):
                    score_entry = {}
                    
                    # Copy all available fields
                    for col in df.columns:
                        if pd.notna(row[col]):
                            if isinstance(row[col], datetime):
                                score_entry[col] = row[col].strftime('%Y-%m-%d')
                            elif str(row[col]).strip() not in ['', 'nan']:
                                score_entry[col] = row[col]
                                
                    all_scores.append(score_entry)
                    
            print(f"  Extracted {len(all_scores)} score records")
            return all_scores
            
        except Exception as e:
            print(f"  Error processing All Scores sheet: {e}")
            return []
            
    def save_individual_tournament_files(self, tournament_sheets: List[str]):
        """Extract and save individual tournament JSON files"""
        print("\nExtracting individual tournament files...")
        
        for sheet_name in tournament_sheets:
            tournament_data = self.extract_tournament_data(sheet_name)
            
            if tournament_data:
                # Create filename from sheet name
                filename = f"{sheet_name}.json"
                filepath = os.path.join(self.output_dir, filename)
                
                # Save to JSON
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(tournament_data, f, indent=2, default=str)
                    
                print(f"  Saved: {filepath}")
                
                # Store for aggregate processing
                self.all_tournament_data.extend(tournament_data)
                
    def save_aggregate_files(self):
        """Save the aggregate JSON files"""
        print("\nSaving aggregate files...")
        
        # Save Champions.json
        champions_data = self.extract_champions_data()
        if champions_data:
            champions_path = os.path.join(self.output_dir, "Champions.json")
            with open(champions_path, 'w', encoding='utf-8') as f:
                json.dump(champions_data, f, indent=2, default=str)
            print(f"  Saved: {champions_path}")
            
        # Save All Players.json  
        all_players_data = self.extract_all_players_data()
        if all_players_data:
            all_players_path = os.path.join(self.output_dir, "All Players.json")
            with open(all_players_path, 'w', encoding='utf-8') as f:
                json.dump(all_players_data, f, indent=2, default=str)
            print(f"  Saved: {all_players_path}")
            
        # Save All Scores.json
        all_scores_data = self.extract_all_scores_data()
        if all_scores_data:
            all_scores_path = os.path.join(self.output_dir, "All Scores.json")
            with open(all_scores_path, 'w', encoding='utf-8') as f:
                json.dump(all_scores_data, f, indent=2, default=str)
            print(f"  Saved: {all_scores_path}")
            
    def validate_extraction(self, tournament_sheets: List[str]):
        """Validate the extraction results"""
        print("\n=== VALIDATION SUMMARY ===")
        
        # Count files created
        json_files = [f for f in os.listdir(self.output_dir) if f.endswith('.json')]
        tournament_files = [f for f in json_files if f.replace('.json', '') in tournament_sheets]
        
        print(f"Tournament sheets processed: {len(tournament_sheets)}")
        print(f"Tournament JSON files created: {len(tournament_files)}")
        print(f"Aggregate files: {len([f for f in json_files if f in ['Champions.json', 'All Players.json', 'All Scores.json']])}")
        
        # Sample validation - check a recent tournament
        if tournament_files:
            sample_file = tournament_files[0]
            sample_path = os.path.join(self.output_dir, sample_file)
            with open(sample_path, 'r', encoding='utf-8') as f:
                sample_data = json.load(f)
                
            print(f"\nSample validation ({sample_file}):")
            print(f"  Teams in file: {len(sample_data)}")
            if sample_data:
                sample_entry = sample_data[0]
                print(f"  Sample entry keys: {list(sample_entry.keys())}")
                print(f"  Player 1: {sample_entry.get('Player 1')}")
                print(f"  Player 2: {sample_entry.get('Player 2')}")
                print(f"  Date: {sample_entry.get('Date')}")
                print(f"  Format: {sample_entry.get('Format')}")
                
    def run_full_extraction(self):
        """Run the complete extraction process"""
        print("=== BOD EXCEL DATA EXTRACTION ===")
        print(f"Excel file: {self.excel_file}")
        print(f"Output directory: {self.output_dir}")
        print()
        
        # Load Excel file
        sheet_names = self.load_excel_file()
        
        # Identify tournament sheets
        tournament_sheets = self.identify_tournament_sheets(sheet_names)
        
        if not tournament_sheets:
            print("ERROR: No tournament sheets found!")
            return False
            
        # Extract and save individual tournament files
        self.save_individual_tournament_files(tournament_sheets)
        
        # Save aggregate files
        self.save_aggregate_files()
        
        # Validate results
        self.validate_extraction(tournament_sheets)
        
        print("\n=== EXTRACTION COMPLETE ===")
        print("All tournament data has been extracted from the Excel file")
        print("and saved as individual JSON files plus aggregate files.")
        return True

def main():
    import sys
    
    excel_file = "json/BOD Scores History_2025-08-01.xlsx"
    output_dir = "json"
    
    if len(sys.argv) > 1:
        excel_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_dir = sys.argv[2]
        
    if not os.path.exists(excel_file):
        print(f"ERROR: Excel file not found: {excel_file}")
        sys.exit(1)
        
    extractor = BODExcelDataExtractor(excel_file, output_dir)
    success = extractor.run_full_extraction()
    
    if not success:
        print("EXTRACTION FAILED!")
        sys.exit(1)
        
    print("SUCCESS: Data extraction completed successfully!")

if __name__ == "__main__":
    main()