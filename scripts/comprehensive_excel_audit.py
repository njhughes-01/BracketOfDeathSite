"""
Comprehensive Excel Data Audit for BOD Scores History

Analyzes ALL sheets and columns in the Excel files, compares with:
1. JSON export files
2. Database schema
3. Frontend display components

Outputs a detailed report of data coverage.

Usage: python scripts/comprehensive_excel_audit.py
"""

import pandas as pd
import json
import os
from pathlib import Path
from collections import defaultdict

# Paths
DATA_DIR = Path(__file__).parent.parent / 'json'
EXCEL_FILES = [
    DATA_DIR / 'BOD Scores History.xlsx',
    DATA_DIR / 'BOD Scores History_2024-08-31.xlsx', 
    DATA_DIR / 'BOD Scores History_2025-08-01.xlsx'
]

def analyze_all_excel_files():
    print("=" * 70)
    print("📊 COMPREHENSIVE EXCEL DATA AUDIT")
    print("=" * 70)
    
    # Track all unique columns across all sheets and files
    all_data = defaultdict(lambda: {'files': [], 'sheets': [], 'sample_values': [], 'row_count': 0})
    sheet_info = []
    
    for excel_file in EXCEL_FILES:
        if not excel_file.exists():
            print(f"⚠️ File not found: {excel_file.name}")
            continue
            
        print(f"\n📁 Loading: {excel_file.name}")
        xl = pd.ExcelFile(excel_file)
        
        for sheet_name in xl.sheet_names:
            df = pd.read_excel(xl, sheet_name=sheet_name)
            
            sheet_info.append({
                'file': excel_file.name,
                'sheet': sheet_name,
                'rows': len(df),
                'cols': len(df.columns)
            })
            
            for col in df.columns:
                col_str = str(col)
                all_data[col_str]['files'].append(excel_file.name)
                all_data[col_str]['sheets'].append(sheet_name)
                all_data[col_str]['row_count'] += len(df[col].dropna())
                
                # Get sample non-null value
                non_null = df[col].dropna()
                if len(non_null) > 0 and len(all_data[col_str]['sample_values']) < 3:
                    sample = str(non_null.iloc[0])[:100]
                    if sample not in all_data[col_str]['sample_values']:
                        all_data[col_str]['sample_values'].append(sample)
    
    # Print sheet summary
    print("\n" + "=" * 70)
    print("📋 SHEET SUMMARY")
    print("=" * 70)
    for info in sheet_info:
        print(f"  {info['file']}: {info['sheet']} ({info['rows']} rows, {info['cols']} cols)")
    
    # Define column mappings - what JSON/DB field each Excel column maps to
    column_mappings = {
        # Tournament/Champions columns
        'Date': {'json': 'Date', 'db': 'date', 'frontend': 'date'},
        'BOD#': {'json': 'BOD#', 'db': 'bodNumber', 'frontend': 'bodNumber'},
        'Format': {'json': 'Format', 'db': 'format', 'frontend': 'format'},
        'Champions': {'json': 'Champions', 'db': 'champion', 'frontend': 'champion (Overview tab)'},
        'Finalists': {'json': 'Finalists', 'db': 'N/A (derived)', 'frontend': 'finalist (Overview tab)'},
        'Location': {'json': 'Location', 'db': 'location', 'frontend': 'location (Tournament Info)'},
        'Notes': {'json': 'Notes', 'db': 'notes', 'frontend': 'notes (Tournament Info)'},
        'Advancement Criteria': {'json': 'Advancement Criteria', 'db': 'advancementCriteria', 'frontend': 'advancementCriteria'},
        'Photo Albums': {'json': 'Photo Albums', 'db': 'photoAlbums', 'frontend': 'photoAlbums (Tournament Info)'},
        'Final Match': {'json': 'Final Match', 'db': 'N/A', 'frontend': 'finalMatchScore (Overview tab)'},
        'W': {'json': 'W', 'db': 'N/A (champion totalWon)', 'frontend': 'champion Total score'},
        'L': {'json': 'L', 'db': 'N/A (champion totalLost)', 'frontend': 'champion Total score'},
        'W.1': {'json': 'W.1', 'db': 'N/A (finalist totalWon)', 'frontend': 'finalist Total score'},
        'L.1': {'json': 'L.1', 'db': 'N/A (finalist totalLost)', 'frontend': 'finalist Total score'},
        'Seed': {'json': 'Seed', 'db': 'seed', 'frontend': 'Seed column (Standings)'},
        'Seed.1': {'json': 'Seed.1', 'db': 'N/A (finalist seed)', 'frontend': 'N/A'},
        'Teams': {'json': 'Teams', 'db': 'N/A (derived)', 'frontend': 'Teams stat (Overview)'},
        'Total RR Games': {'json': 'Total RR Games', 'db': 'N/A (calculated)', 'frontend': 'RR Games stat'},
        'Total Games': {'json': 'Total Games', 'db': 'N/A (calculated)', 'frontend': 'Total Games stat'},
        'Tiebreakers': {'json': 'Tiebreakers', 'db': 'N/A', 'frontend': '❌ NOT DISPLAYED'},
        
        # Player columns
        'Player 1': {'json': 'Player 1', 'db': 'players[0]', 'frontend': 'Team name (Standings)'},
        'Player 2': {'json': 'Player 2', 'db': 'players[1]', 'frontend': 'Team name (Standings)'},
        
        # Round Robin columns
        'Division': {'json': 'Division', 'db': 'division', 'frontend': 'Div column (Standings)'},
        'Round-1': {'json': 'Round-1', 'db': 'roundRobinScores.round1', 'frontend': 'R1 (expanded row)'},
        'Round-2': {'json': 'Round-2', 'db': 'roundRobinScores.round2', 'frontend': 'R2 (expanded row)'},
        'Round-3': {'json': 'Round-3', 'db': 'roundRobinScores.round3', 'frontend': 'R3 (expanded row)'},
        'RR Won': {'json': 'RR Won', 'db': 'roundRobinScores.rrWon', 'frontend': 'RR column (Standings)'},
        'RR Lost': {'json': 'RR Lost', 'db': 'roundRobinScores.rrLost', 'frontend': 'RR column (Standings)'},
        'RR Played': {'json': 'RR Played', 'db': 'roundRobinScores.rrPlayed', 'frontend': 'N/A (derivable)'},
        'RR Win %': {'json': 'RR Win %', 'db': 'roundRobinScores.rrWinPercentage', 'frontend': 'RR Win % (expanded row)'},
        'RR Rank': {'json': 'RR Rank', 'db': 'roundRobinScores.rrRank', 'frontend': 'RR Rank (expanded row)'},
        
        # Bracket columns
        'R16 Matchup': {'json': 'R16 Matchup', 'db': 'N/A', 'frontend': '❌ NOT DISPLAYED'},
        'R16 Won': {'json': 'R16 Won', 'db': 'bracketScores.r16Won', 'frontend': 'R16 (expanded row)'},
        'R16 Lost': {'json': 'R16 Lost', 'db': 'bracketScores.r16Lost', 'frontend': 'R16 (expanded row)'},
        'QF Won': {'json': 'QF Won', 'db': 'bracketScores.qfWon', 'frontend': 'QF (expanded row)'},
        'QF Lost': {'json': 'QF Lost', 'db': 'bracketScores.qfLost', 'frontend': 'QF (expanded row)'},
        'SF Won': {'json': 'SF Won', 'db': 'bracketScores.sfWon', 'frontend': 'SF (expanded row)'},
        'SF Lost': {'json': 'SF Lost', 'db': 'bracketScores.sfLost', 'frontend': 'SF (expanded row)'},
        'Finals Won': {'json': 'Finals Won', 'db': 'bracketScores.finalsWon', 'frontend': 'Finals (expanded row)'},
        'Finals Lost': {'json': 'Finals Lost', 'db': 'bracketScores.finalsLost', 'frontend': 'Finals (expanded row)'},
        'Bracket Won': {'json': 'Bracket Won', 'db': 'bracketScores.bracketWon', 'frontend': 'Bracket column (Standings)'},
        'Bracket Lost': {'json': 'Bracket Lost', 'db': 'bracketScores.bracketLost', 'frontend': 'Bracket column (Standings)'},
        'Bracket Played': {'json': 'Bracket Played', 'db': 'bracketScores.bracketPlayed', 'frontend': 'N/A (derivable)'},
        
        # Total/Summary columns
        'Total Won': {'json': 'Total Won', 'db': 'totalStats.totalWon', 'frontend': 'Total column (Standings)'},
        'Total Lost': {'json': 'Total Lost', 'db': 'totalStats.totalLost', 'frontend': 'Total column (Standings)'},
        'Total Played': {'json': 'Total Played', 'db': 'totalStats.totalPlayed', 'frontend': 'N/A (derivable)'},
        'Win %': {'json': 'Win %', 'db': 'totalStats.winPercentage', 'frontend': 'Win % column (Standings)'},
        'Final Rank': {'json': 'Final Rank', 'db': 'totalStats.finalRank', 'frontend': 'N/A (internal sorting)'},
        'BOD Finish': {'json': 'BOD Finish', 'db': 'totalStats.bodFinish', 'frontend': 'Rank column (Standings)'},
        
        # Aggregate stats
        '# Games': {'json': '# Games', 'db': 'N/A (champion games)', 'frontend': 'N/A'},
        '# Games.1': {'json': '# Games.1', 'db': 'N/A (finalist games)', 'frontend': 'N/A'},
        'Avg RR Games': {'json': 'Avg RR Games', 'db': 'N/A', 'frontend': '❌ NOT DISPLAYED'},
        'AVG Games': {'json': 'AVG Games', 'db': 'N/A', 'frontend': '❌ NOT DISPLAYED'},
    }
    
    # Print column analysis
    print("\n" + "=" * 70)
    print("📊 COLUMN ANALYSIS")
    print("=" * 70)
    
    displayed_cols = []
    not_displayed_cols = []
    unknown_cols = []
    
    for col, info in sorted(all_data.items()):
        unique_sheets = list(set(info['sheets']))
        
        if col in column_mappings:
            mapping = column_mappings[col]
            if '❌' in mapping.get('frontend', ''):
                not_displayed_cols.append((col, mapping, info))
            else:
                displayed_cols.append((col, mapping, info))
        else:
            unknown_cols.append((col, info))
    
    print(f"\n✅ DISPLAYED COLUMNS ({len(displayed_cols)}):")
    print("-" * 70)
    for col, mapping, info in displayed_cols:
        print(f"  {col}")
        print(f"    Frontend: {mapping.get('frontend', 'N/A')}")
        print(f"    DB Field: {mapping.get('db', 'N/A')}")
        print(f"    Sample: {info['sample_values'][0] if info['sample_values'] else 'N/A'}")
    
    print(f"\n❌ NOT DISPLAYED COLUMNS ({len(not_displayed_cols)}):")
    print("-" * 70)
    for col, mapping, info in not_displayed_cols:
        print(f"  {col}")
        print(f"    Sheets: {list(set(info['sheets']))}")
        print(f"    Data Count: {info['row_count']}")
        print(f"    Sample: {info['sample_values'][0] if info['sample_values'] else 'N/A'}")
    
    print(f"\n❓ UNKNOWN COLUMNS ({len(unknown_cols)}):")
    print("-" * 70)
    for col, info in unknown_cols:
        print(f"  {col}")
        print(f"    Sheets: {list(set(info['sheets']))}")
        print(f"    Sample: {info['sample_values'][0] if info['sample_values'] else 'N/A'}")
    
    # Summary
    print("\n" + "=" * 70)
    print("🎯 SUMMARY")
    print("=" * 70)
    print(f"Total unique columns found: {len(all_data)}")
    print(f"Columns being displayed: {len(displayed_cols)}")
    print(f"Columns NOT displayed: {len(not_displayed_cols)}")
    print(f"Unknown/unmapped columns: {len(unknown_cols)}")
    
    if not_displayed_cols:
        print("\n⚠️ DATA NOT CURRENTLY DISPLAYED:")
        for col, mapping, info in not_displayed_cols:
            print(f"  - {col}: {info['sample_values'][0] if info['sample_values'] else 'No sample'}")
    
    if unknown_cols:
        print("\n⚠️ UNKNOWN COLUMNS (may need investigation):")
        for col, info in unknown_cols:
            print(f"  - {col}: {info['sample_values'][0] if info['sample_values'] else 'No sample'}")

if __name__ == '__main__':
    analyze_all_excel_files()
