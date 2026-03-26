# Deploy to dockhand (10.50.50.101)

## Quick Deployment (Single Command)

### Method 1: Download and Run Script
```bash
curl -sSL https://raw.githubusercontent.com/njhughes-01/BracketOfDeathSite/main/deploy-dockhand.sh | bash
```

### Method 2: Clone and Run
```bash
git clone https://github.com/njhughes-01/BracketOfDeathSite.git
cd BracketOfDeathSite
./deploy-dockhand.sh
```

### Method 3: Manual Deployment
```bash
# Create deployment directory
mkdir -p ~/bod-production
cd ~/bod-production

# Download docker-compose file
wget https://raw.githubusercontent.com/njhughes-01/BracketOfDeathSite/main/docker-compose.ghcr.yml

# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u njhughes-01 --password-stdin

# Pull and start
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

---

## What Gets Deployed

### Docker Images (from GHCR)
All images are pre-built with latest security patches (March 26, 2026):

```
ghcr.io/njhughes-01/bracketofdeath-backend:latest
ghcr.io/njhughes-01/bracketofdeath-frontend:latest
ghcr.io/njhughes-01/bracketofdeath-secrets-init:latest
ghcr.io/njhughes-01/bracketofdeath-keycloak-init:latest
ghcr.io/njhughes-01/bracketofdeath-data-init:latest
```

Plus official images:
- MongoDB 8.0.19 (secure)
- Keycloak 26.5.6 (secure)
- PostgreSQL 15.17 (secure)

### Services Started
- **Frontend**: http://10.50.50.101:5173
- **Backend API**: http://10.50.50.101:3001
- **Keycloak**: http://10.50.50.101:8081 (admin only)
- **MongoDB**: port 27018 (internal)
- **PostgreSQL**: port 5432 (internal)

---

## Post-Deployment

### Verify Services
```bash
cd ~/bod-production
docker compose -f docker-compose.ghcr.yml ps
```

Expected output:
```
NAME                  STATUS              PORTS
bod-backend           Up (healthy)        0.0.0.0:3001->3000/tcp
bod-frontend          Up (healthy)        0.0.0.0:5173->5173/tcp
bod-keycloak          Up (healthy)        0.0.0.0:8081->8080/tcp
bod-keycloak-db       Up (healthy)
bod-mongodb           Up (healthy)        0.0.0.0:27018->27017/tcp
```

### Test Endpoints
```bash
# Backend API health check
curl http://localhost:3001/api/health

# Frontend (should return HTML)
curl http://localhost:5173

# Keycloak health check
curl http://localhost:8081/health/ready
```

### View Logs
```bash
# All services
docker compose -f docker-compose.ghcr.yml logs -f

# Specific service
docker logs -f bod-backend
docker logs -f bod-frontend
```

---

## Update Existing Deployment

```bash
cd ~/bod-production

# Pull latest images
docker compose -f docker-compose.ghcr.yml pull

# Restart with new images
docker compose -f docker-compose.ghcr.yml up -d

# Or use the deploy script again
curl -sSL https://raw.githubusercontent.com/njhughes-01/BracketOfDeathSite/main/deploy-dockhand.sh | bash
```

---

## Environment Configuration

### Default .env (Auto-generated with secure passwords)
The deployment script creates a `.env` file with:
- Random secure passwords for all services
- Default configuration for dockhand
- Production mode enabled

### Custom Configuration
Edit `~/bod-production/.env`:

```bash
# Application URLs
APP_URL=http://10.50.50.101:5173
CORS_ORIGIN=http://10.50.50.101:5173

# Ports
PORT=5173              # Frontend port
BACKEND_PORT=3001      # Backend API port

# Database passwords (auto-generated, change if needed)
MONGO_INITDB_ROOT_PASSWORD=<random>
KEYCLOAK_DB_PASSWORD=<random>
KEYCLOAK_ADMIN_PASSWORD=<random>
JWT_SECRET=<random>
KEYCLOAK_CLIENT_SECRET=<random>

# Optional: Email (Mailjet)
MAILJET_API_KEY=
MAILJET_API_SECRET=
MAILJET_SENDER_EMAIL=noreply@bracketofdeath.com

# Optional: Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

After editing `.env`:
```bash
docker compose -f docker-compose.ghcr.yml restart
```

---

## Troubleshooting

### Port Conflicts
If ports 5173, 3001, or 8081 are in use:

1. **Check what's using the port:**
```bash
lsof -i :5173
lsof -i :3001
```

2. **Stop conflicting services:**
```bash
# If old BOD version is running
cd /path/to/old/bod
docker compose down
```

3. **Or change ports in .env:**
```bash
echo "PORT=8080" >> .env
docker compose -f docker-compose.ghcr.yml up -d
```

### Services Not Starting
```bash
# Check logs for errors
docker logs bod-backend
docker logs bod-keycloak

# Common issues:
# - Missing GITHUB_TOKEN for GHCR login
# - Port conflicts
# - Insufficient disk space
```

### Database Connection Issues
```bash
# Check MongoDB is healthy
docker exec bod-mongodb mongosh --eval "db.adminCommand('ping')"

# Check PostgreSQL is healthy
docker exec bod-keycloak-db pg_isready -U keycloak
```

### Reset Everything
```bash
cd ~/bod-production

# Stop and remove everything (including volumes)
docker compose -f docker-compose.ghcr.yml down -v

# Re-deploy
./deploy-dockhand.sh
```

---

## Backup & Restore

### Backup Databases
```bash
# MongoDB
docker exec bod-mongodb mongodump --out /tmp/backup
docker cp bod-mongodb:/tmp/backup ./mongodb-backup-$(date +%Y%m%d)

# PostgreSQL (Keycloak)
docker exec bod-keycloak-db pg_dump -U keycloak keycloak > keycloak-backup-$(date +%Y%m%d).sql
```

### Restore Databases
```bash
# MongoDB
docker cp ./mongodb-backup-YYYYMMDD bod-mongodb:/tmp/restore
docker exec bod-mongodb mongorestore /tmp/restore

# PostgreSQL
cat keycloak-backup-YYYYMMDD.sql | docker exec -i bod-keycloak-db psql -U keycloak keycloak
```

---

## Monitoring

### Check Resource Usage
```bash
docker stats bod-backend bod-frontend bod-mongodb
```

### Check Disk Space
```bash
docker system df
df -h
```

### Prune Old Images
```bash
docker image prune -a
```

---

## Security Notes

1. ✅ All images use latest security patches (as of March 26, 2026)
2. ✅ Passwords auto-generated with `openssl rand -base64 32`
3. ✅ Secrets stored in Docker volumes (not in env vars)
4. ⚠️  Default configuration is HTTP only - add reverse proxy (Caddy/Nginx) for HTTPS
5. ⚠️  MongoDB port 27018 is exposed - restrict access or remove port mapping

### Production Checklist
- [ ] Change auto-generated passwords in .env
- [ ] Set up HTTPS reverse proxy
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Enable monitoring/alerting
- [ ] Review Keycloak security settings

---

## Support

**Documentation:**
- Main README: https://github.com/njhughes-01/BracketOfDeathSite
- Security Updates: SECURITY_UPDATES.md
- Deployment Status: DEPLOYMENT_STATUS.md

**Quick Access:**
- Site: http://10.50.50.101:5173
- API: http://10.50.50.101:3001/api
- Keycloak Admin: http://10.50.50.101:8081/admin

---

**Last Updated:** 2026-03-26 17:35 MDT  
**Maintained by:** Nathan Hughes (@njhughes-01)
