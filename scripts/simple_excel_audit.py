"""
Simplified Excel Audit - Find Missing Data
"""
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / 'json'
EXCEL_FILE = DATA_DIR / 'BOD Scores History.xlsx'

print("=" * 60)
print("EXCEL DATA AUDIT - Finding Missing/Not Displayed Data")
print("=" * 60)

xl = pd.ExcelFile(EXCEL_FILE)
print(f"\nSheets in Excel: {xl.sheet_names}\n")

# Check each sheet
for sheet in xl.sheet_names:
    df = pd.read_excel(xl, sheet_name=sheet)
    print(f"--- {sheet} ({len(df)} rows, {len(df.columns)} cols) ---")
    print(f"Columns: {list(df.columns)}")
    print()

# Compare Champions sheet with JSON
print("\n" + "=" * 60)
print("CHAMPIONS SHEET vs Champions.json")
print("=" * 60)

import json
with open(DATA_DIR / 'Champions.json', 'r') as f:
    json_data = json.load(f)

json_cols = set(json_data[0].keys()) if json_data else set()
champ_df = pd.read_excel(xl, sheet_name='Champions')
excel_cols = set(str(c) for c in champ_df.columns)

print(f"\nJSON columns: {sorted(json_cols)}")
print(f"\nExcel columns: {sorted(excel_cols)}")

excel_only = excel_cols - json_cols
if excel_only:
    print(f"\n⚠️ In Excel but NOT in JSON: {excel_only}")

# Check All Scores
print("\n" + "=" * 60)
print("ALL SCORES SHEET vs All Scores.json")  
print("=" * 60)

with open(DATA_DIR / 'All Scores.json', 'r') as f:
    scores_json = json.load(f)

scores_json_cols = set(scores_json[0].keys()) if scores_json else set()
scores_df = pd.read_excel(xl, sheet_name='All Scores')  
scores_excel_cols = set(str(c) for c in scores_df.columns)

print(f"\nJSON columns ({len(scores_json_cols)}): {sorted(scores_json_cols)}")
print(f"\nExcel columns ({len(scores_excel_cols)}): {sorted(scores_excel_cols)}")

excel_only_scores = scores_excel_cols - scores_json_cols
if excel_only_scores:
    print(f"\n⚠️ In Excel but NOT in JSON: {excel_only_scores}")

# Check All Players
print("\n" + "=" * 60)
print("ALL PLAYERS SHEET vs All Players.json")
print("=" * 60)

with open(DATA_DIR / 'All Players.json', 'r') as f:
    players_json = json.load(f)

players_json_cols = set(players_json[0].keys()) if players_json else set()
players_df = pd.read_excel(xl, sheet_name='All Players')
players_excel_cols = set(str(c) for c in players_df.columns)

print(f"\nJSON columns ({len(players_json_cols)}): {sorted(players_json_cols)}")
print(f"\nExcel columns ({len(players_excel_cols)}): {sorted(players_excel_cols)}")

excel_only_players = players_excel_cols - players_json_cols
if excel_only_players:
    print(f"\n⚠️ In Excel but NOT in JSON: {excel_only_players}")

# Summary of data NOT being displayed in frontend
print("\n" + "=" * 60)
print("DATA NOT CURRENTLY DISPLAYED IN FRONTEND")
print("=" * 60)

not_displayed = [
    ('Tiebreakers', 'Champions sheet - number of tiebreakers in tournament'),
    ('Avg RR Games', 'Champions sheet - average round robin games per team'),
    ('AVG Games', 'Champions sheet - average total games per team'),
    ('R16 Matchup', 'All Scores - matchup opponent name in R16'),
    ('# Games', 'Champions sheet - champion total games (derivable from W+L)'),
    ('# Games.1', 'Champions sheet - finalist total games (derivable from W+L.1)'),
]

for col, desc in not_displayed:
    print(f"  - {col}: {desc}")
