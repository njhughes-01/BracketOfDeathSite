# Bracket of Death - Docker Deployment Guide

This guide explains how to deploy and manage the Bracket of Death tennis tournament tracking application using Docker.

## 🚀 Quick Start

### Prerequisites
- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- At least 2GB free disk space

### One-Command Setup

```bash
git clone <repository-url>
cd BracketOfDeathSite
docker compose up
```

That's it! On first run:
- Secrets are automatically generated and saved
- MongoDB is initialized with historical data
- Keycloak authentication is configured
- The application starts at http://localhost:5173

### Access URLs
- **Web Application**: http://localhost:5173
- **API Backend**: http://localhost:5173/api (proxied)

## 🔐 Security

### Automatic Secret Generation

On first startup, unique secrets are automatically generated for:
- MongoDB password
- Keycloak admin password
- Keycloak database password
- Keycloak client secret
- JWT signing key

Secrets are displayed in the console and saved to a Docker volume. **Save these for production backups!**

### Custom Configuration (Optional)

To override defaults, create a `.env` file:

```bash
# Only needed for production or custom config
MONGO_PASSWORD=your_secure_password
KEYCLOAK_ADMIN_PASSWORD=your_secure_password
KEYCLOAK_DB_PASSWORD=your_secure_password
KEYCLOAK_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://yourdomain.com,http://localhost:5173
PORT=5173
```

## 📦 Architecture

The stack consists of these services:

| Service | Description |
|---------|-------------|
| `secrets-init` | Generates secrets on first run |
| `keycloak` | Authentication server (internal) |
| `keycloak-db` | PostgreSQL for Keycloak |
| `mongodb` | MongoDB 7.0 database |
| `keycloak-init` | Configures Keycloak realm |
| `data-init` | Imports JSON tournament data |
| `backend` | Node.js/Express API server |
| `frontend` | React app with Vite dev server |

## 🛠️ Management Commands

### Starting/Stopping

```bash
# Start all services
docker compose up -d

# Stop all services (data persists)
docker compose down

# Stop and remove all data (⚠️ DESTRUCTIVE)
docker compose down -v

# Restart specific service
docker compose restart backend
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# See generated secrets
docker compose logs secrets-init
```

### Reset Secrets

To regenerate all secrets:
```bash
docker volume rm bracketofdeathsite_secrets-data
docker compose up
```

## 🗄️ Data Persistence

Data is stored in Docker volumes:
- `mongodb-data` - Database files
- `keycloak-db-data` - Keycloak database
- `secrets-data` - Generated secrets
- `data-init-status` - Import status

### Backup

```bash
# Backup MongoDB
docker exec bod-mongodb mongodump --out /data/backup -u bodadmin --authenticationDatabase admin

# Copy backup out
docker cp bod-mongodb:/data/backup ./backups/
```

## 🔧 Troubleshooting

### Check Service Status
```bash
docker compose ps
```

### Common Issues

**Port 5173 already in use:**
```bash
PORT=8080 docker compose up
```

**Secrets not working:**
```bash
docker compose logs secrets-init
```

**Database connection failed:**
```bash
docker compose logs backend | grep -i mongo
docker compose restart backend
```

## 🚀 Production Deployment

For production:
1. Let secrets auto-generate, then save them securely
2. Set `NODE_ENV=production` in `.env`
3. Configure `CORS_ORIGIN` with your domain
4. Set up SSL/TLS with a reverse proxy
5. Configure automated backups