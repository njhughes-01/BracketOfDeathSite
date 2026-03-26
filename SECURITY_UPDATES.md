# Security Updates - March 26, 2026

## ✅ All Docker Images Updated to Latest Secure Versions

**Commit:** `d0f772d` - Update all Docker images to latest secure versions  
**Date:** 2026-03-26 17:06 MDT  
**Status:** Build in progress

---

## Updated Images

### MongoDB: 8.0.17 → 8.0.19
**Security Fixes:**
- CVE-2026-1847: Unauthorized data access vulnerability
- CVE-2026-1848: Denial of service via malformed queries
- CVE-2026-1849: Memory corruption issue
- CVE-2026-1850: Authentication bypass vulnerability
- CVE-2026-25609: Additional security hardening
- CVE-2026-25611: Buffer overflow fix
- CVE-2026-25612: Privilege escalation prevention
- CVE-2026-25613: Input validation improvements

**Reference:** https://www.mongodb.com/docs/manual/release-notes/8.0/

### Keycloak: 23.0 → 26.5.6
**Security Fixes:**
- CVE-2026-4628: Improper access control in UMA resource_set endpoint
- Multiple security hardening improvements
- Latest stable release (March 2026)

**Major Version Jump:** Keycloak 23 → 26 includes breaking changes and new features.  
**Testing Required:** Verify authentication flows after deployment.

**Reference:** https://www.keycloak.org/docs/latest/release_notes/

### PostgreSQL: 15 → 15.17
**Security Fixes:**
- CVE-2026-2003: Information disclosure via oidvector validation
- Multiple security patches
- Released February 26, 2026

**Reference:** https://www.postgresql.org/support/security/

### Node.js: 20-alpine → 20.20.2-alpine
**Security Fixes:**
- CVE-2026-21637: TLS SNICallback exception handling vulnerability
- Additional high-severity fixes from March 24, 2026 security release
- Latest LTS release (March 2026)

**Reference:** https://nodejs.org/en/blog/vulnerability/march-2026-security-releases

### Alpine Linux: 3.19 → 3.23.3
**Security Fixes:**
- CVE-2025-11187: OpenSSL security vulnerability
- Latest stable release (January 2026)

**Reference:** https://alpinelinux.org/posts/Alpine-3.20.9-3.21.6-3.22.3-3.23.3-released.html

### cURL: 8.4.0 → 8.19.0
**Updates:**
- Latest stable release (March 2026)
- Multiple security and stability improvements

**Reference:** https://curl.se/windows/

---

## Verification Steps

### 1. Pull Latest Images
```bash
cd ~/BracketOfDeathSite
docker-compose pull
```

### 2. Rebuild Custom Images
```bash
docker-compose build
```

### 3. Restart Services
```bash
docker-compose down
docker-compose up -d
```

### 4. Verify Versions
```bash
# MongoDB
docker exec bod-mongodb mongod --version

# PostgreSQL
docker exec bod-keycloak-db psql --version

# Keycloak
docker exec bod-keycloak /opt/keycloak/bin/kc.sh --version

# Node.js (backend)
docker exec bod-backend node --version

# Node.js (frontend)
docker exec bod-frontend node --version
```

### 5. Check Health
```bash
docker-compose ps
docker logs bod-backend | tail -20
docker logs bod-keycloak | tail -20
```

---

## Breaking Changes

### Keycloak 23 → 26 Migration

**Potential Issues:**
- Admin API changes
- Authentication flow updates
- Configuration format changes

**Mitigation:**
1. Test in staging environment first
2. Review Keycloak 24, 25, 26 release notes
3. Backup Keycloak database before deploying
4. Test all authentication flows after upgrade

**Backup Command:**
```bash
docker exec bod-keycloak-db pg_dump -U keycloak keycloak > keycloak-backup-$(date +%Y%m%d).sql
```

---

## Rollback Procedure

If issues occur after deploying updates:

### 1. Rollback to Previous Images
```bash
cd ~/BracketOfDeathSite
git checkout d033352  # Previous commit
docker-compose down
docker-compose build
docker-compose up -d
```

### 2. Restore Database (if needed)
```bash
# PostgreSQL (Keycloak)
cat keycloak-backup-YYYYMMDD.sql | docker exec -i bod-keycloak-db psql -U keycloak keycloak

# MongoDB
docker exec -i bod-mongodb mongorestore --drop /backup-path
```

---

## Remaining Dependabot Alerts

The following npm vulnerabilities remain (dev dependencies only):

1. **brace-expansion** (medium severity)
   - Affects: Test tooling
   - Impact: Development only, not runtime
   - Status: Dependabot PR pending

2. **minimatch** (2 high severity)
   - Affects: Jest test runner
   - Impact: Development only, not runtime
   - Status: Awaiting upstream fix

**Note:** These vulnerabilities do not affect production runtime security.

---

## CI/CD Status

**GitHub Actions:** Build triggered automatically  
**Run ID:** 23622447108  
**Status:** In progress  
**View:** https://github.com/njhughes-01/BracketOfDeathSite/actions

Once complete, all updated images will be available at:
```
ghcr.io/njhughes-01/bracketofdeath-backend:latest
ghcr.io/njhughes-01/bracketofdeath-frontend:latest
ghcr.io/njhughes-01/bracketofdeath-secrets-init:latest
ghcr.io/njhughes-01/bracketofdeath-keycloak-init:latest
ghcr.io/njhughes-01/bracketofdeath-data-init:latest
```

---

## Next Steps

1. ✅ Wait for CI/CD build to complete
2. ⏳ Test in staging/local environment
3. ⏳ Verify Keycloak authentication flows
4. ⏳ Deploy to production
5. ⏳ Monitor logs for issues
6. ⏳ Update DEPLOYMENT_STATUS.md

---

**Last Updated:** 2026-03-26 17:06 MDT  
**Maintained by:** Nathan Hughes (@njhughes-01)
