# Update BOD Site on dockhand (In-Place, Preserve Data)

## Quick Update Steps

### 1. SSH to dockhand
```bash
ssh dockhand
cd /path/to/bod/stack  # Navigate to your current stack directory
```

### 2. Backup current compose file
```bash
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d)
```

### 3. Update image versions in docker-compose.yml
Edit the file and change these image versions:

```yaml
# Find and replace these lines:

# MongoDB
mongo:8.0.17  →  mongo:8.0.19

# Keycloak
quay.io/keycloak/keycloak:23.0  →  quay.io/keycloak/keycloak:26.5.6

# PostgreSQL (if you have this line)
postgres:15  →  postgres:15.17

# GHCR images (if using these)
ghcr.io/njhughes-01/bracketofdeath-backend:latest
ghcr.io/njhughes-01/bracketofdeath-frontend:latest
ghcr.io/njhughes-01/bracketofdeath-secrets-init:latest
ghcr.io/njhughes-01/bracketofdeath-keycloak-init:latest
ghcr.io/njhughes-01/bracketofdeath-data-init:latest
```

### 4. Pull new images
```bash
docker compose pull
```

### 5. Recreate containers (keeps volumes/data)
```bash
docker compose up -d
```

This will:
- ✅ Keep all volumes (data preserved)
- ✅ Update only the container images
- ✅ Restart services with new versions

### 6. Verify
```bash
docker compose ps
docker logs bod-backend | tail -20
curl http://localhost:3001/api/health
curl http://localhost:5173
```

---

## Option 2: Download Updated Compose File

If you want the complete updated file:

```bash
cd /path/to/bod/stack

# Backup current
cp docker-compose.yml docker-compose.yml.backup

# Download updated version
wget -O docker-compose.yml https://raw.githubusercontent.com/njhughes-01/BracketOfDeathSite/main/docker-compose.ghcr.yml

# Or if you cloned the repo, just copy it
cp ~/BracketOfDeathSite/docker-compose.ghcr.yml docker-compose.yml

# Pull and restart (preserves volumes)
docker compose pull
docker compose up -d
```

---

## What Changes in Keycloak 23 → 26

**Important:** Keycloak 26 has breaking changes. Test carefully!

### Before updating:
1. Backup Keycloak database:
```bash
docker exec bod-keycloak-db pg_dump -U keycloak keycloak > keycloak-backup-$(date +%Y%m%d).sql
```

2. Note current admin password (from .env or secrets)

### After updating:
- Admin console URL changed: `/admin` → `/admin/master/console`
- Test all login flows
- Check user authentication still works

### Rollback if needed:
```bash
# Restore old compose file
cp docker-compose.yml.backup docker-compose.yml

# Pull old images and restart
docker compose pull
docker compose up -d

# Restore database if needed
cat keycloak-backup-YYYYMMDD.sql | docker exec -i bod-keycloak-db psql -U keycloak keycloak
```

---

## Exact Image Version Changes

```diff
services:
  keycloak:
-   image: quay.io/keycloak/keycloak:23.0
+   image: quay.io/keycloak/keycloak:26.5.6

  keycloak-db:
-   image: postgres:15
+   image: postgres:15.17

  mongodb:
-   image: mongo:8.0.17
+   image: mongo:8.0.19
```

---

## If Something Goes Wrong

### Rollback:
```bash
cd /path/to/bod/stack
docker compose down
cp docker-compose.yml.backup docker-compose.yml
docker compose pull
docker compose up -d
```

### Check logs:
```bash
docker compose logs -f
```

### Restore databases:
```bash
# MongoDB (if needed)
docker cp ./mongodb-backup bod-mongodb:/tmp/restore
docker exec bod-mongodb mongorestore /tmp/restore

# PostgreSQL (if needed)
cat keycloak-backup-YYYYMMDD.sql | docker exec -i bod-keycloak-db psql -U keycloak keycloak
```

---

## Data Safety

✅ **These commands preserve data:**
- `docker compose pull` - Only downloads new images
- `docker compose up -d` - Recreates containers but keeps volumes
- Volumes are NOT touched unless you use `docker compose down -v`

⚠️ **NEVER run these unless you want to lose data:**
- `docker compose down -v` - Deletes volumes!
- `docker volume rm ...` - Deletes volumes!

---

## Verification Checklist

After update, verify:
- [ ] All containers are running: `docker compose ps`
- [ ] Backend is healthy: `curl http://localhost:3001/api/health`
- [ ] Frontend loads: `curl http://localhost:5173`
- [ ] Can log in to the site
- [ ] Database data is intact (check a tournament or player)
- [ ] Keycloak admin console works: http://localhost:8081/admin

---

**Need the updated compose file?**
I can show you the exact changes or you can download:
```bash
wget https://raw.githubusercontent.com/njhughes-01/BracketOfDeathSite/main/docker-compose.ghcr.yml
```
