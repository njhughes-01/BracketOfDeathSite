#!/bin/bash

# Bracket of Death - Database Restore Script
# This script restores your tournament data from a backup

set -e

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: Please provide a backup file"
    echo "Usage: $0 <backup-file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -la ./backups/*.tar.gz 2>/dev/null || echo "  No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="mongodb"
DB_NAME="bracket_of_death"
DB_USER="${MONGO_INITDB_ROOT_USERNAME:-bodadmin}"
DB_PASS="${MONGO_PASSWORD:-bodpassword123}"

echo "🏆 Bracket of Death - Database Restore"
echo "======================================"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

echo "📂 Restoring from: $BACKUP_FILE"

# Extract backup
RESTORE_DIR="./temp_restore_$(date +%s)"
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR" --strip-components=1

echo "📁 Backup extracted to: $RESTORE_DIR"

# Show backup info if available
if [ -f "$RESTORE_DIR/backup-info.txt" ]; then
    echo ""
    echo "📋 Backup Information:"
    cat "$RESTORE_DIR/backup-info.txt"
    echo ""
fi

# Ask for confirmation
read -p "⚠️  This will replace all current data. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    rm -rf "$RESTORE_DIR"
    exit 1
fi

# Check if MongoDB container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Error: MongoDB container '$CONTAINER_NAME' is not running"
    echo "   Please start the stack with: docker-compose up -d"
    rm -rf "$RESTORE_DIR"
    exit 1
fi

echo "🔄 Starting restore process..."

# Method 1: Try mongorestore first (if dump directory exists)
if [ -d "$RESTORE_DIR/$DB_NAME" ]; then
    echo "🔄 Restoring using mongorestore..."
    
    # Copy backup to container
    docker cp "$RESTORE_DIR/$DB_NAME" "$CONTAINER_NAME:/tmp/restore"
    
    # Restore database
    docker exec "$CONTAINER_NAME" mongorestore \
        --username="$DB_USER" \
        --password="$DB_PASS" \
        --authenticationDatabase=admin \
        --db="$DB_NAME" \
        --drop \
        /tmp/restore
    
    # Clean up
    docker exec "$CONTAINER_NAME" rm -rf /tmp/restore
    
    echo "✅ Database restored using mongorestore"

# Method 2: Use data files if mongodump not available
elif [ -d "$RESTORE_DIR/mongodb-data" ]; then
    echo "🔄 Restoring using data files..."
    echo "   This requires restarting the database..."
    
    # Stop the MongoDB container
    echo "🛑 Stopping MongoDB container..."
    docker-compose stop mongodb
    
    # Backup current data
    echo "💾 Backing up current data..."
    mv "./data/mongodb" "./data/mongodb.backup.$(date +%s)" 2>/dev/null || true
    
    # Restore data files
    echo "📁 Restoring data files..."
    cp -r "$RESTORE_DIR/mongodb-data" "./data/mongodb"
    
    # Start the MongoDB container
    echo "🚀 Starting MongoDB container..."
    docker-compose up -d mongodb
    
    # Wait for MongoDB to be ready
    echo "⏳ Waiting for MongoDB to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker exec "$CONTAINER_NAME" mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        echo "❌ Error: MongoDB did not start within 60 seconds"
        exit 1
    fi
    
    echo "✅ Database restored using data files"
    
else
    echo "❌ Error: No valid restore data found in backup"
    echo "   Expected either '$DB_NAME/' directory or 'mongodb-data/' directory"
    rm -rf "$RESTORE_DIR"
    exit 1
fi

# Verify restore
echo "🔍 Verifying restore..."
PLAYER_COUNT=$(docker exec "$CONTAINER_NAME" mongosh --quiet --eval "
    db = db.getSiblingDB('$DB_NAME');
    db.auth('$DB_USER', '$DB_PASS');
    db.players.countDocuments();
" 2>/dev/null || echo "0")

TOURNAMENT_COUNT=$(docker exec "$CONTAINER_NAME" mongosh --quiet --eval "
    db = db.getSiblingDB('$DB_NAME');
    db.auth('$DB_USER', '$DB_PASS');
    db.tournaments.countDocuments();
" 2>/dev/null || echo "0")

echo "📊 Restore verification:"
echo "   Players: $PLAYER_COUNT"
echo "   Tournaments: $TOURNAMENT_COUNT"

# Clean up
rm -rf "$RESTORE_DIR"

echo ""
echo "✅ Restore completed successfully!"
echo "🎾 Your Bracket of Death data has been restored"
echo ""
echo "🔗 Access your application at: http://localhost:8080"