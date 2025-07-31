# 🚀 Bracket of Death - Deployment Steps

## Prerequisites Check

Before deploying, ensure you have:

1. **Docker Desktop** installed and running
2. **WSL2 integration** enabled in Docker Desktop settings
3. At least **2GB free disk space**

## Step-by-Step Deployment

### 1. Enable Docker in WSL2

```bash
# In your WSL2 terminal, check if Docker is available:
docker --version
docker-compose --version

# If not available, enable WSL2 integration:
# 1. Open Docker Desktop
# 2. Go to Settings → Resources → WSL Integration
# 3. Enable integration with your WSL2 distro
# 4. Restart WSL2: wsl --shutdown (in Windows PowerShell)
```

### 2. Navigate to Project Directory

```bash
cd /mnt/c/Github/BracketOfDeathSite
```

### 3. Start the Complete Stack

```bash
# Start all services in background
docker-compose up -d

# Watch the logs to see startup progress
docker-compose logs -f
```

### 4. Monitor the Startup Process

The startup will happen in this order:

1. **MongoDB** starts and initializes (30-60 seconds)
2. **Data Import** runs once to import your JSON files (1-3 minutes)
3. **Backend** starts and connects to database (30 seconds)
4. **Frontend** builds and starts (2-3 minutes)

### 5. Check Service Status

```bash
# Check all services are healthy
docker-compose ps

# Should show all services as "healthy" or "running"
```

### 6. Access Your Application

- **Frontend UI**: http://localhost:8080
- **Backend API**: Available via proxy at http://localhost:8080/api/health
- **MongoDB**: localhost:27017 (if you need direct access)

## Expected Output During Startup

### MongoDB Initialization:
```
mongodb | Starting MongoDB initialization...
mongodb | Created database: bracket_of_death
mongodb | Created user: bodapp
mongodb | MongoDB initialization completed successfully!
```

### Data Import:
```
bod-data-init | Starting data import process...
bod-data-init | Connected to MongoDB
bod-data-init | Importing players...
bod-data-init | Imported 45 players
bod-data-init | Importing tournaments and results...
bod-data-init | Found 32 tournament files
bod-data-init | Data import completed successfully!
```

### Backend Startup:
```
backend | Server starting...
backend | Connected to MongoDB
backend | Server running on port 3000
```

### Frontend Build:
```
frontend | Building application...
frontend | Build completed successfully
frontend | Starting nginx...
```

## Verification Steps

### 1. Test the API
```bash
# Check backend health
curl http://localhost:8080/api/health

# Check players endpoint
curl http://localhost:8080/api/players | jq
```

### 2. Test the Frontend
- Open http://localhost:8080 in your browser
- You should see the Bracket of Death dashboard
- Navigate to Players, Tournaments, and Results pages

### 3. Verify Data Import
```bash
# Connect to MongoDB and check data
docker exec -it mongodb mongosh -u bodadmin -p bodpassword123 --authenticationDatabase admin

# In MongoDB shell:
use bracket_of_death
db.players.countDocuments()      // Should show your imported players
db.tournaments.countDocuments()  // Should show your tournaments
db.tournamentresults.countDocuments() // Should show results
```

## Troubleshooting

### If startup fails:

1. **Check logs for specific service:**
   ```bash
   docker-compose logs mongodb
   docker-compose logs data-init
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **Restart specific service:**
   ```bash
   docker-compose restart backend
   ```

3. **Full restart:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Common Issues:

1. **Port conflicts**: If ports 8080, 3000, or 27017 are in use:
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :8080
   
   # Stop conflicting services or edit docker-compose.yml to use different ports
   ```

2. **Data import timeout**: If data import takes too long:
   ```bash
   # Check data-init logs
   docker-compose logs data-init
   
   # Restart data import if needed
   docker-compose up data-init --force-recreate
   ```

3. **Build failures**: If frontend or backend fail to build:
   ```bash
   # Rebuild services
   docker-compose build --no-cache
   docker-compose up -d
   ```

## Success Indicators

✅ **All services show "healthy" status**  
✅ **Frontend loads at http://localhost:8080**  
✅ **API responds at http://localhost:8080/api/health**  
✅ **Players page shows imported player data**  
✅ **Tournaments page shows your tournament history**  

## Next Steps After Successful Deployment

1. **Create your first backup:**
   ```bash
   ./scripts/backup.sh
   ```

2. **Test the backup system:**
   ```bash
   ls -la ./backups/
   ```

3. **Explore your data** in the web interface

4. **Read the Docker documentation:**
   ```bash
   cat README-Docker.md
   ```

## Data Persistence

Your data is now stored in:
- `./data/mongodb/` - Main database files (YOUR BACKUP POINT)
- `./data/logs/` - Application logs
- `./data/init-status/` - Import completion tracker

Even if you run `docker-compose down`, your data will persist in these directories.

## Ready to Deploy?

Run these commands in order:

```bash
cd /mnt/c/Github/BracketOfDeathSite
docker-compose up -d
docker-compose logs -f
```

Then wait for all services to be healthy and visit http://localhost:8080!