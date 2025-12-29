#!/bin/bash

# Keycloak initialization script
# This script sets up the realm and client configuration

set -e

# Source generated secrets if available (to get same password as Keycloak)
if [ -f "/secrets/.generated_secrets" ]; then
    echo "Loading secrets from /secrets/.generated_secrets..."
    . /secrets/.generated_secrets
fi

echo "Waiting for Keycloak to be ready..."

# Wait for Keycloak to be healthy
until curl -f http://keycloak:8080/ > /dev/null 2>&1; do
    echo "Waiting for Keycloak..."
    sleep 5
done

echo "Keycloak is ready! Setting up realm..."

# Get admin access token
echo "Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST \
  "http://keycloak:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN_USER}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "Failed to get admin token"
    exit 1
fi

echo "Admin token obtained successfully"

# Check if realm already exists
echo "Checking if realm exists..."
REALM_EXISTS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://keycloak:8080/admin/realms/bracketofdeathsite" \
  -w "%{http_code}" -o /dev/null)

if [ "$REALM_EXISTS" = "200" ]; then
    echo "Realm 'bracketofdeathsite' already exists"
    # Logic to create default admin removed for security (Secure Onboarding)
else
    echo "Creating realm 'bracketofdeathsite'..."
    
    # Update the realm JSON with the actual client secret
    REALM_JSON=$(cat /scripts/keycloak-realm.json | sed "s/\*\*\*\*\*\*\*\*\*\*/${KEYCLOAK_CLIENT_SECRET}/g")
    
    # Create the realm
    curl -s -X POST \
      "http://keycloak:8080/admin/realms" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$REALM_JSON"
    
    if [ $? -eq 0 ]; then
        echo "Realm created successfully"
        echo "Skipping default admin user creation (Secure Onboarding Flow)"
    else
        echo "Failed to create realm"
        exit 1
    fi
fi

echo "Keycloak setup completed successfully!"
echo "Keycloak is running internally at: http://keycloak:8080"  
echo "Admin Username: ${KEYCLOAK_ADMIN_USER}"
echo "Realm: bracketofdeathsite"