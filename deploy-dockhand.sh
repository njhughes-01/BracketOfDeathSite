#!/bin/bash
# BOD Site Deployment Script for dockhand (10.50.50.101)
# 
# Usage:
#   Local:  ./deploy-dockhand.sh
#   Remote: curl -sSL https://raw.githubusercontent.com/njhughes-01/BracketOfDeathSite/main/deploy-dockhand.sh | bash

set -e

echo "🚀 Bracket of Death - Production Deployment"
echo "============================================"
echo

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/bod-production}"
GHCR_URL="https://raw.githubusercontent.com/njhughes-01/BracketOfDeathSite/main/docker-compose.ghcr.yml"
APP_URL="${APP_URL:-http://10.50.50.101:5173}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-3001}"

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Download latest GHCR compose file
echo "📥 Downloading latest docker-compose.ghcr.yml..."
curl -sSL "$GHCR_URL" -o docker-compose.ghcr.yml

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << EOF
# Bracket of Death Production Environment
# Generated: $(date)

NODE_ENV=production
APP_URL=$APP_URL
CORS_ORIGIN=$APP_URL
PORT=$FRONTEND_PORT

# Database Passwords (CHANGE THESE!)
MONGO_INITDB_ROOT_PASSWORD=$(openssl rand -base64 32)
KEYCLOAK_DB_PASSWORD=$(openssl rand -base64 32)
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
KEYCLOAK_CLIENT_SECRET=$(openssl rand -base64 32)

# Optional Email Configuration
# MAILJET_API_KEY=
# MAILJET_API_SECRET=
# MAILJET_SENDER_EMAIL=noreply@bracketofdeath.com

# Optional Stripe Configuration
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
EOF
    echo "✅ .env file created with secure random passwords"
    echo "⚠️  Review and customize .env before starting services"
    read -p "Press Enter to continue or Ctrl+C to abort..."
fi

# Check if logged in to GHCR
echo "🔐 Checking GitHub Container Registry authentication..."
if ! docker info 2>/dev/null | grep -q "ghcr.io"; then
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "🔑 Logging in to GHCR..."
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u njhughes-01 --password-stdin
    else
        echo "⚠️  Warning: Not logged in to GHCR and GITHUB_TOKEN not set"
        echo "   You may need to run:"
        echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u njhughes-01 --password-stdin"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Stop old version if running
if docker compose -f docker-compose.ghcr.yml ps --services 2>/dev/null | grep -q .; then
    echo "🛑 Stopping old version..."
    docker compose -f docker-compose.ghcr.yml down
fi

# Pull latest images
echo "📦 Pulling latest images from GHCR..."
docker compose -f docker-compose.ghcr.yml pull

# Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.ghcr.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check status
echo
echo "✅ Deployment complete!"
echo
echo "📊 Service Status:"
docker compose -f docker-compose.ghcr.yml ps

# Verify endpoints
echo
echo "🔍 Verifying endpoints..."
if curl -sf "http://localhost:$BACKEND_PORT/api/health" > /dev/null; then
    echo "✅ Backend API: http://localhost:$BACKEND_PORT (healthy)"
else
    echo "⚠️  Backend API: http://localhost:$BACKEND_PORT (not responding)"
fi

if curl -sf "http://localhost:$FRONTEND_PORT" > /dev/null; then
    echo "✅ Frontend: http://localhost:$FRONTEND_PORT (healthy)"
else
    echo "⚠️  Frontend: http://localhost:$FRONTEND_PORT (not responding)"
fi

echo
echo "🌐 Access the site at: $APP_URL"
echo "📊 View logs: docker compose -f docker-compose.ghcr.yml logs -f"
echo "🛑 Stop services: docker compose -f docker-compose.ghcr.yml down"
echo
echo "Deployment directory: $DEPLOY_DIR"
