#!/bin/bash
echo "=== BOD DATA VALIDATION ==="
echo "Current directory contents:"
ls -la

echo ""
echo "JSON files count:"
find . -name "*.json" | wc -l

echo ""
echo "Recent tournament files (2024-2025):"
ls -1 202*.json 2>/dev/null || echo "No recent tournament files found"

echo ""
echo "Aggregate files:"
ls -1 "All "*.json "Champions.json" 2>/dev/null || echo "No aggregate files found"

echo ""
echo "Sample player data (first 5 lines):"
head -5 "All Players.json" 2>/dev/null || echo "All Players.json not found"

echo ""
echo "Sample tournament data (first 3 lines):"
ls -1 2025*.json | head -1 | xargs head -3 2>/dev/null || echo "No 2025 tournament files found"