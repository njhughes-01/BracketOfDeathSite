"""
Excel Data Analyzer for BOD Scores History

Analyzes all tabs in the Excel files to identify any data not captured in JSON exports.
Compares columns and data structure across tabs.

Usage: python scripts/analyze_excel_data.py
"""

import pandas as pd
import json
import os
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent.parent / 'json'
EXCEL_FILE = DATA_DIR / 'BOD Scores History.xlsx'

def analyze_excel():
    print("📊 Excel Data Analysis for BOD Scores History")
    print("=" * 50)
    
    if not EXCEL_FILE.exists():
        print(f"❌ Excel file not found: {EXCEL_FILE}")
        return
    
    # Load all sheets
    print(f"\n📁 Loading: {EXCEL_FILE.name}")
    xl = pd.ExcelFile(EXCEL_FILE)
    
    print(f"\n📋 Found {len(xl.sheet_names)} sheets:")
    for i, sheet in enumerate(xl.sheet_names):
        print(f"  {i+1}. {sheet}")
    
    # Analyze each sheet
    all_columns = {}
    sheet_summaries = []
    
    for sheet_name in xl.sheet_names:
        print(f"\n{'=' * 50}")
        print(f"📄 Sheet: {sheet_name}")
        print("-" * 50)
        
        df = pd.read_excel(xl, sheet_name=sheet_name)
        
        # Basic info
        print(f"  Rows: {len(df)}, Columns: {len(df.columns)}")
        
        # Store columns
        all_columns[sheet_name] = list(df.columns)
        
        # Show columns
        print(f"  Columns: {', '.join(str(c) for c in df.columns[:15])}")
        if len(df.columns) > 15:
            print(f"           ... and {len(df.columns) - 15} more")
        
        # Check for unique columns not in typical JSON exports
        typical_json_cols = {
            'Date', 'Format', 'Player 1', 'Player 2', 'Teams (Round Robin)', 
            'Teams (Summary)', 'Teams (Bracket)', 'Division', 'Division.1',
            'Round-1', 'Round-2', 'Round-3', 'RR Won', 'RR Lost', 'RR Played',
            'RR Win %', 'RR Rank', 'Seed', 'Seed.1', 'R16 Matchup',
            'R16 Won', 'R16 Lost', 'QF Won', 'QF Lost', 'SF Won', 'SF Lost',
            'Finals Won', 'Finals Lost', 'Bracket Won', 'Bracket Lost', 'Bracket Played',
            'Total Won', 'Total Lost', 'Total Played', 'Win %', 'Final Rank', 'BOD Finish'
        }
        
        unique_cols = [c for c in df.columns if str(c) not in typical_json_cols]
        if unique_cols:
            print(f"\n  📌 Columns NOT in typical JSON exports:")
            for col in unique_cols[:10]:
                # Sample values
                non_null = df[col].dropna()
                sample = str(non_null.iloc[0])[:50] if len(non_null) > 0 else 'N/A'
                print(f"      - {col}: sample='{sample}'")
        
        sheet_summaries.append({
            'name': sheet_name,
            'rows': len(df),
            'cols': len(df.columns),
            'unique_cols': unique_cols
        })
    
    # Cross-sheet comparison
    print(f"\n\n{'=' * 50}")
    print("📊 CROSS-SHEET ANALYSIS")
    print("=" * 50)
    
    # Find unique columns across all sheets
    all_unique_cols = set()
    for summary in sheet_summaries:
        all_unique_cols.update(summary['unique_cols'])
    
    print(f"\n📌 All unique columns NOT in typical JSON exports:")
    for col in sorted(all_unique_cols):
        sheets_with_col = [s['name'] for s in sheet_summaries if col in s['unique_cols']]
        print(f"  - {col} (in {len(sheets_with_col)} sheets)")
    
    # Compare with JSON files
    print(f"\n\n{'=' * 50}")
    print("📊 JSON vs EXCEL COMPARISON")
    print("=" * 50)
    
    # Load Champions.json
    champions_file = DATA_DIR / 'Champions.json'
    if champions_file.exists():
        with open(champions_file, 'r') as f:
            champions = json.load(f)
        
        if champions:
            print(f"\nChampions.json columns ({len(champions[0].keys())} fields):")
            for key in sorted(champions[0].keys()):
                print(f"  - {key}")
            
            # Check if any Excel-only data exists
            excel_champion_sheet = None
            for sheet_name in xl.sheet_names:
                if 'champion' in sheet_name.lower():
                    excel_champion_sheet = sheet_name
                    break
            
            if excel_champion_sheet:
                df = pd.read_excel(xl, sheet_name=excel_champion_sheet)
                excel_cols = set(str(c) for c in df.columns)
                json_cols = set(champions[0].keys())
                
                excel_only = excel_cols - json_cols
                if excel_only:
                    print(f"\n⚠️ Columns in Excel '{excel_champion_sheet}' but NOT in Champions.json:")
                    for col in excel_only:
                        print(f"    - {col}")
    
    # Load All Scores.json
    scores_file = DATA_DIR / 'All Scores.json'
    if scores_file.exists():
        with open(scores_file, 'r') as f:
            scores = json.load(f)
        
        if scores:
            print(f"\n\nAll Scores.json columns ({len(scores[0].keys())} fields):")
            for key in sorted(scores[0].keys())[:20]:
                print(f"  - {key}")
            if len(scores[0].keys()) > 20:
                print(f"  ... and {len(scores[0].keys()) - 20} more")
    
    # Summary
    print(f"\n\n{'=' * 50}")
    print("🎯 SUMMARY")
    print("=" * 50)
    print(f"Total sheets analyzed: {len(xl.sheet_names)}")
    print(f"Unique columns not in typical JSON: {len(all_unique_cols)}")
    
    # Identify potentially missing data
    important_missing = ['Suffering', 'Home', 'Tiebreaker', 'Photo', 'Video', 'Award']
    found_missing = []
    for col in all_unique_cols:
        col_str = str(col).lower()
        for keyword in important_missing:
            if keyword.lower() in col_str:
                found_missing.append(col)
                break
    
    if found_missing:
        print(f"\n⚠️ Potentially important data not in JSON:")
        for col in found_missing:
            print(f"    - {col}")
    else:
        print("\n✅ No obviously important data missing from JSON exports")

if __name__ == '__main__':
    analyze_excel()
