#!/bin/bash
echo "=== Checking GitHub Container Registry Image Timestamps ==="
docker pull ghcr.io/njhughes-01/bracketofdeath-backend:latest 2>&1 | grep -E "(Digest|Status)"

echo -e "\n=== Latest Git Commit ==="
git log -1 --oneline

echo -e "\n=== GitHub Actions Latest Backend Build ==="
gh run list --workflow="Build and Push to GHCR" --limit 1 --json conclusion,createdAt,headSha,name
