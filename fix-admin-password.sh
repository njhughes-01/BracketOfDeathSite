#!/bin/bash

# Script to fix admin password temporary flag
# Use this if you're getting "Account is not fully set up" errors

set -e

echo "Fixing admin password temporary flag..."

# Get admin access token
echo "Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST \
  "http://localhost:8080/auth/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN_USER:-admin}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD:-admin}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "Failed to get admin token. Make sure Keycloak is running and KEYCLOAK_ADMIN_USER/KEYCLOAK_ADMIN_PASSWORD are set."
    exit 1
fi

echo "Admin token obtained successfully"

# Get admin user ID
echo "Finding admin user..."
ADMIN_USER_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/auth/admin/realms/bracketofdeathsite/users?username=admin" | jq -r '.[0].id')

if [ "$ADMIN_USER_ID" = "null" ] || [ -z "$ADMIN_USER_ID" ]; then
    echo "Admin user not found"
    exit 1
fi

echo "Admin user found: $ADMIN_USER_ID"

# Reset password without temporary flag
echo "Resetting admin password..."
curl -s -X PUT \
  "http://localhost:8080/auth/admin/realms/bracketofdeathsite/users/$ADMIN_USER_ID/reset-password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "password",
    "value": "admin123",
    "temporary": false
  }'

if [ $? -eq 0 ]; then
    echo "Admin password reset successfully (password: admin123, no change required)"
    echo "WARNING: Change the default admin password immediately for security!"
    echo "You can now login with username: admin, password: admin123"
else
    echo "Failed to reset admin password"
    exit 1
fi