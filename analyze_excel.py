#!/usr/bin/env python3
"""
Excel File Analyzer for BOD Scores History
==========================================

This script analyzes the structure of the Excel file to understand
its sheets, columns, and data format before extraction.
"""

import pandas as pd
import os

def analyze_excel_file(filepath):
    """Analyze the structure of the Excel file"""
    print(f"Analyzing Excel file: {filepath}")
    print("=" * 60)
    
    try:
        # Get all sheet names
        xl_file = pd.ExcelFile(filepath)
        sheet_names = xl_file.sheet_names
        
        print(f"Total sheets found: {len(sheet_names)}")
        print(f"Sheet names: {sheet_names}")
        print()
        
        # Analyze each sheet
        for i, sheet_name in enumerate(sheet_names):
            print(f"Sheet {i+1}: '{sheet_name}'")
            print("-" * 40)
            
            try:
                # Read the sheet
                df = pd.read_excel(filepath, sheet_name=sheet_name)
                
                print(f"  Dimensions: {df.shape[0]} rows × {df.shape[1]} columns")
                print(f"  Column names: {list(df.columns)}")
                
                # Show first few rows
                if not df.empty:
                    print(f"  Sample data (first 3 rows):")
                    for idx, row in df.head(3).iterrows():
                        print(f"    Row {idx}: {dict(row.dropna())}")
                
                # Check for date patterns in data
                date_like_columns = []
                for col in df.columns:
                    if any(word in str(col).lower() for word in ['date', 'year', 'month']):
                        date_like_columns.append(col)
                        
                if date_like_columns:
                    print(f"  Date-related columns: {date_like_columns}")
                
                print()
                
            except Exception as e:
                print(f"  Error reading sheet: {e}")
                print()
                
    except Exception as e:
        print(f"Error analyzing file: {e}")

if __name__ == "__main__":
    filepath = "json/BOD Scores History_2025-08-01.xlsx"
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        exit(1)
        
    analyze_excel_file(filepath)