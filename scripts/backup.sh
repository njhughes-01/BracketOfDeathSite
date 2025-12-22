#!/bin/bash

# Bracket of Death - Database Backup Script
# This script creates a complete backup of your tournament data

set -e

# Configuration
BACKUP_DIR="./backups/$(date +%Y-%m-%d_%H-%M-%S)"
CONTAINER_NAME="mongodb"
DB_NAME="bracket_of_death"
DB_USER="${MONGO_INITDB_ROOT_USERNAME:-bodadmin}"
DB_PASS="${MONGO_PASSWORD:-bodpassword123}"

echo "🏆 Bracket of Death - Database Backup"
echo "======================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if MongoDB container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Error: MongoDB container '$CONTAINER_NAME' is not running"
    echo "   Please start the stack with: docker-compose up -d"
    exit 1
fi

echo "📦 Creating backup in: $BACKUP_DIR"

# Backup MongoDB data using mongodump
echo "🔄 Backing up MongoDB database..."
docker exec "$CONTAINER_NAME" mongodump \
    --username="$DB_USER" \
    --password="$DB_PASS" \
    --authenticationDatabase=admin \
    --db="$DB_NAME" \
    --out=/tmp/backup

# Copy the backup from container to host
docker cp "$CONTAINER_NAME:/tmp/backup/$DB_NAME" "$BACKUP_DIR/"

# Backup data files (MongoDB data directory)
echo "🔄 Backing up data files..."
cp -r "./data/mongodb" "$BACKUP_DIR/mongodb-data"

# Create backup metadata
echo "🔄 Creating backup metadata..."
cat > "$BACKUP_DIR/backup-info.txt" << EOF
Bracket of Death Database Backup
================================
Backup Date: $(date)
Database Name: $DB_NAME
MongoDB Version: $(docker exec "$CONTAINER_NAME" mongod --version | head -1)
Container Name: $CONTAINER_NAME

Backup Contents:
- $DB_NAME/           # MongoDB dump (use with mongorestore)
- mongodb-data/       # Raw MongoDB data files
- backup-info.txt     # This file

Restore Instructions:
1. Using mongorestore: 
   docker exec -i $CONTAINER_NAME mongorestore --username=$DB_USER --password=$DB_PASS --authenticationDatabase=admin --db=$DB_NAME --drop /path/to/$DB_NAME/

2. Using data files:
   - Stop the stack: docker-compose down
   - Replace ./data/mongodb with mongodb-data from this backup
   - Start the stack: docker-compose up -d

Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)
EOF

# Create compressed archive
echo "🔄 Creating compressed archive..."
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"

# Clean up temporary directory
rm -rf "$BACKUP_DIR"

# Calculate final size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR.tar.gz" | cut -f1)

echo "✅ Backup completed successfully!"
echo "📁 Backup file: $BACKUP_DIR.tar.gz"
echo "📊 Backup size: $BACKUP_SIZE"
echo ""
echo "💡 To restore this backup:"
echo "   ./scripts/restore.sh $BACKUP_DIR.tar.gz"
echo ""
echo "🔒 Store this backup file in a safe location!"