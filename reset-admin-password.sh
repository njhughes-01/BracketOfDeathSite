#!/bin/bash

echo "Resetting admin user password..."

# Get admin token from master realm
echo "Getting admin access token..."
ADMIN_TOKEN=$(curl -s -X POST \
  "http://localhost:8080/auth/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD:-admin123}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "Failed to get admin token. Using container exec..."
    
    # Alternative: exec into keycloak container
    docker exec bod-keycloak /opt/keycloak/bin/kcadm.sh config credentials \
        --server http://localhost:8080 \
        --realm master \
        --user admin \
        --password "${KEYCLOAK_ADMIN_PASSWORD:-admin123}"
    
    # Reset the user password
    docker exec bod-keycloak /opt/keycloak/bin/kcadm.sh set-password \
        --server http://localhost:8080 \
        --realm bracketofdeathsite \
        --username admin \
        --new-password admin123
        
    echo "Password reset via container exec"
else
    echo "Got admin token, resetting password via API..."
    
    # Get user ID
    USER_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
      "http://localhost:8080/auth/admin/realms/bracketofdeathsite/users?username=admin&exact=true" | jq -r '.[0].id')
    
    if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
        echo "User not found"
        exit 1
    fi
    
    # Reset password
    curl -X PUT \
      "http://localhost:8080/auth/admin/realms/bracketofdeathsite/users/$USER_ID/reset-password" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "type": "password",
        "value": "admin123",
        "temporary": false
      }'
    
    echo "Password reset successfully"
fi

echo "Testing login..."
curl -X POST \
  "http://localhost:8080/auth/realms/bracketofdeathsite/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=bod-app&username=admin&password=admin123"