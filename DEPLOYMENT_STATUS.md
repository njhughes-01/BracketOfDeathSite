# Bracket of Death - Deployment Status

## ✅ Latest Build: SUCCESS
**Commit:** `1b9288d` - Fix: Display BOD skull logo on landing page  
**Date:** 2026-03-26 08:33 AM MST  
**Workflow:** Build and Push to GHCR  
**Status:** ✅ All jobs passed (4m 58s)

---

## Docker Images Published to GHCR

All images tagged with `latest` and commit SHA:

```
ghcr.io/njhughes-01/bracketofdeath-backend:latest
ghcr.io/njhughes-01/bracketofdeath-frontend:latest
ghcr.io/njhughes-01/bracketofdeath-secrets-init:latest
ghcr.io/njhughes-01/bracketofdeath-keycloak-init:latest
ghcr.io/njhughes-01/bracketofdeath-data-init:latest
```

---

## Features Delivered

### ✅ Public Content from bracketofdeath.net
- **Logo**: Skull with crossed tennis rackets (240x240 JPEG)
- **Tagline**: "Because Tennis"
- **Rules Page**: Complete tournament format and rules
- **FAQ Page**: Interactive accordion with all Q&A content
- **Navigation**: Added Rules and FAQ links

### ✅ Tournament Management Features (Existing)
- User registration and authentication (Keycloak)
- Tournament creation and management
- Player profiles and rankings
- Match scheduling and results tracking
- Admin dashboard
- Ticket purchasing system (Stripe integration)

### ✅ Verified Working
- Landing page with logo and statistics
- Open tournaments listing
- Rules page (full content)
- FAQ page (accordion UI)
- Backend API connectivity
- Database persistence (MongoDB + PostgreSQL)

---

## Deployment Instructions

### Local Development
```bash
cd ~/BracketOfDeathSite
docker-compose up -d
```

Access at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Keycloak: http://localhost:8081

### Production Deployment (Pull from GHCR)

1. **Authenticate with GHCR**
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u njhughes-01 --password-stdin
```

2. **Clone and pull images**
```bash
git clone https://github.com/njhughes-01/BracketOfDeathSite.git
cd BracketOfDeathSite
docker-compose pull
```

3. **Start services**
```bash
docker-compose up -d
```

4. **Check status**
```bash
docker-compose ps
docker logs bod-backend
docker logs bod-frontend
```

---

## Configuration

### Environment Variables
See `.env.example` for required environment variables.

Key settings:
- `KEYCLOAK_ADMIN_USER`: Admin username for Keycloak
- `KEYCLOAK_ADMIN_PASSWORD`: Auto-generated on first run (stored in `/secrets`)
- `MONGODB_URI`: MongoDB connection string
- `DATABASE_URL`: PostgreSQL connection string

### Ports
- `3001`: Backend API
- `5173`: Frontend (development) / `80` (production)
- `8081`: Keycloak admin console
- `27018`: MongoDB (exposed for admin access)

---

## Health Checks

### Verify All Services Running
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep bod
```

Expected output:
```
bod-frontend        Up (healthy)      0.0.0.0:5173->5173/tcp
bod-backend         Up (healthy)      0.0.0.0:3001->3000/tcp
bod-keycloak        Up (healthy)      0.0.0.0:8081->8080/tcp
bod-keycloak-db     Up (healthy)      5432/tcp
bod-mongodb         Up (healthy)      0.0.0.0:27018->27017/tcp
```

### Test Endpoints
```bash
# Frontend
curl -I http://localhost:5173

# Backend API
curl http://localhost:3001/api/health

# Keycloak
curl http://localhost:8081/health/ready
```

---

## Next Steps

### Content Migration from bracketofdeath.net
- [ ] History/Statistics page ("By the Numbers")
- [ ] Events listing (upcoming tournaments calendar)
- [ ] Gallery (tournament photos)
- [ ] Blog/news posts
- [ ] Merch shop integration (optional)

### Technical Improvements
- [ ] Fix Node.js 20 deprecation warning (update docker/setup-buildx-action)
- [ ] Set up production domain and SSL
- [ ] Configure email service (transactional emails)
- [ ] Set up automated backups (MongoDB + PostgreSQL)
- [ ] Performance monitoring

### Documentation
- [ ] User registration guide
- [ ] Tournament organizer manual
- [ ] Admin dashboard guide
- [ ] API documentation

---

## Troubleshooting

### Logo Not Showing
**Issue**: Logo doesn't appear on landing page  
**Cause**: Docker container running old build  
**Fix**: Rebuild frontend container
```bash
docker-compose build frontend
docker-compose up -d frontend
```

### Port Conflicts
**Issue**: `Bind for 0.0.0.0:3001 failed: port is already allocated`  
**Cause**: Another service (e.g., CycleSync) using port 3001  
**Fix**: Stop conflicting service first
```bash
# Check what's using port 3001
lsof -i :3001
# Stop CycleSync if it's running
cd ~/CycleSync && docker-compose down
```

### Database Connection Issues
**Issue**: Backend can't connect to MongoDB  
**Cause**: MongoDB container not healthy yet  
**Fix**: Wait for health check to pass
```bash
docker logs bod-mongodb
docker-compose restart backend
```

---

## Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f bod-backend
docker logs -f bod-frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific
docker-compose restart backend frontend
```

### Update to Latest
```bash
git pull origin main
docker-compose pull
docker-compose up -d
```

### Backup Database
```bash
# MongoDB
docker exec bod-mongodb mongodump --out /tmp/backup

# PostgreSQL (Keycloak)
docker exec bod-keycloak-db pg_dump -U keycloak keycloak > backup.sql
```

---

**Last Updated:** 2026-03-26 09:54 AM MST  
**Maintained by:** Nathan Hughes (@njhughes-01)
