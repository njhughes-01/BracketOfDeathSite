# Bracket of Death - Docker Deployment Guide

This guide explains how to deploy and manage the Bracket of Death tennis tournament tracking application using Docker.

## 🚀 Quick Start

### Prerequisites
- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- At least 2GB free disk space

### First Time Setup

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd BracketOfDeathSite
   ```

2. **Start the complete stack:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8080/api (proxied)
   - MongoDB: localhost:27017

The first startup will automatically import all your JSON tournament data into the database. This process runs only once.

## 📦 Architecture

The stack consists of 4 services:

- **mongodb**: MongoDB 7.0 database with persistent storage
- **data-init**: One-time service that imports JSON data
- **backend**: Node.js/Express API server
- **frontend**: React app served by nginx

## 🗄️ Data Persistence & Backup

### Data Storage Locations

Your tournament data is stored in these host directories:

```
./data/
├── mongodb/          # 📁 DATABASE FILES - Your main backup point
├── logs/
│   ├── mongodb/      # MongoDB logs
│   └── backend/      # Backend application logs
└── init-status/      # Tracks if initial data import is complete
```

### 💾 Creating Backups

**Automatic backup (recommended):**
```bash
./scripts/backup.sh
```

This creates a compressed backup in `./backups/` with:
- Complete database dump
- Raw MongoDB data files
- Backup metadata and restore instructions

**Manual backup:**
```bash
# Simple data directory backup
cp -r ./data/mongodb ./backups/mongodb-backup-$(date +%Y%m%d)
```

### 🔄 Restoring from Backup

```bash
./scripts/restore.sh ./backups/backup-file.tar.gz
```

The restore script will:
- Extract the backup
- Show backup information
- Ask for confirmation
- Restore the database
- Verify the restore was successful

## 🛠️ Management Commands

### Starting/Stopping

```bash
# Start all services
docker-compose up -d

# Stop all services (data persists)
docker-compose down

# Stop and remove all data (⚠️ DESTRUCTIVE)
docker-compose down -v

# Restart specific service
docker-compose restart backend
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Data import logs
docker-compose logs data-init
```

### Database Access

```bash
# MongoDB shell access
docker exec -it mongodb mongosh -u bodadmin -p bodpassword123 --authenticationDatabase admin

# Direct database connection
# Host: localhost:27017
# Username: bodadmin
# Password: bodpassword123
# Database: bracket_of_death
```

## 🔧 Troubleshooting

### Common Issues

**1. Port already in use:**
```bash
# Check what's using the ports
sudo netstat -tulpn | grep :8080
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :27017

# Stop conflicting services or change ports in docker-compose.yml
```

**2. Data import failed:**
```bash
# Check data-init logs
docker-compose logs data-init

# Restart data import
docker-compose up data-init --force-recreate
```

**3. Frontend not loading:**
```bash
# Check if backend is healthy
curl http://localhost:8080/api/health

# Restart frontend
docker-compose restart frontend
```

**4. Database connection issues:**
```bash
# Check MongoDB health
docker exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check backend can connect to database
docker-compose logs backend | grep -i mongo
```

### Health Checks

All services have built-in health checks:

```bash
# Check service status
docker-compose ps

# All healthy services should show "healthy" status
```

## 📈 Monitoring

### Performance Monitoring

```bash
# Resource usage
docker stats

# Disk usage
du -sh ./data/mongodb
df -h
```

### Database Statistics

```bash
# Connect to MongoDB and run:
db = db.getSiblingDB('bracket_of_death')
db.auth('bodadmin', 'bodpassword123')

# Collection counts
db.players.countDocuments()
db.tournaments.countDocuments()
db.tournamentresults.countDocuments()

# Database size
db.stats()
```

## 🔒 Security Notes

- Default passwords are included for development
- For production, change all passwords in docker-compose.yml
- MongoDB runs with authentication enabled
- Frontend nginx includes security headers
- Services run as non-root users where possible

## 📂 Backup Strategy Recommendations

1. **Daily automated backups:**
   ```bash
   # Add to crontab
   0 2 * * * cd /path/to/BracketOfDeathSite && ./scripts/backup.sh
   ```

2. **Before major updates:**
   ```bash
   ./scripts/backup.sh
   ```

3. **Store backups offsite:**
   - Copy to cloud storage (Google Drive, Dropbox, etc.)
   - Use external storage device
   - Consider automated cloud backup solutions

## 🚀 Production Deployment

For production use:

1. **Update passwords in docker-compose.yml**
2. **Set up SSL/TLS termination (nginx proxy)**
3. **Configure proper logging and monitoring**
4. **Set up automated backups**
5. **Consider using Docker Swarm or Kubernetes for high availability**

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all services are healthy: `docker-compose ps`
3. Ensure sufficient disk space: `df -h`
4. Check the JSON data format in the `./json/` directory

Your tournament data is safe as long as the `./data/mongodb/` directory is preserved!