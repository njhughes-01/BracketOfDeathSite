#!/bin/bash

# Keycloak initialization script
# This script sets up the realm and client configuration

set -e

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
    
    # Check if ANY admin users exist (not just the default "admin" user)
    echo "Checking if any admin users exist..."
    
    # Get all users with admin role
    ADMIN_USERS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
      "http://keycloak:8080/admin/realms/bracketofdeathsite/roles/admin/users" | jq '. | length')
    
    if [ "$ADMIN_USERS" = "0" ]; then
        echo "No admin users found. Creating default admin user to prevent lockout..."
        
        # Create default admin user only if no admins exist
        curl -s -X POST \
          "http://keycloak:8080/admin/realms/bracketofdeathsite/users" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "username": "admin",
            "enabled": true,
            "emailVerified": true,
            "firstName": "Tournament",
            "lastName": "Administrator",
            "email": "admin@bracketofdeathsite.com",
            "credentials": [
              {
                "type": "password",
                "value": "admin123",
                "temporary": false
              }
            ]
          }' > /dev/null
        
        # Get the created user ID
        USER_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
          "http://keycloak:8080/admin/realms/bracketofdeathsite/users?username=admin" | jq -r '.[0].id')
        
        if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
            # Assign admin role to the user
            curl -s -X POST \
              "http://keycloak:8080/admin/realms/bracketofdeathsite/users/$USER_ID/role-mappings/realm" \
              -H "Authorization: Bearer $ADMIN_TOKEN" \
              -H "Content-Type: application/json" \
              -d '[
                {
                  "id": "'$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "http://keycloak:8080/admin/realms/bracketofdeathsite/roles/admin" | jq -r '.id')'",
                  "name": "admin"
                },
                {
                  "id": "'$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "http://keycloak:8080/admin/realms/bracketofdeathsite/roles/user" | jq -r '.id')'",
                  "name": "user"
                }
              ]' > /dev/null
            
            echo "Emergency admin user created successfully (password: admin123, no password change required)"
            echo "WARNING: Change the default admin password immediately for security!"
        else
            echo "Failed to create admin user"
        fi
    else
        echo "Admin users already exist ($ADMIN_USERS found). Skipping default admin creation for security."
    fi
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
        
        # Since this is a new realm, create the initial admin user
        echo "Creating initial admin user for new realm..."
        
        # Create default admin user
        curl -s -X POST \
          "http://keycloak:8080/admin/realms/bracketofdeathsite/users" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "username": "admin",
            "enabled": true,
            "emailVerified": true,
            "firstName": "Tournament",
            "lastName": "Administrator",
            "email": "admin@bracketofdeathsite.com",
            "credentials": [
              {
                "type": "password",
                "value": "admin123",
                "temporary": false
              }
            ]
          }' > /dev/null
        
        # Get the created user ID
        USER_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
          "http://keycloak:8080/admin/realms/bracketofdeathsite/users?username=admin" | jq -r '.[0].id')
        
        if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
            # Assign admin role to the user
            curl -s -X POST \
              "http://keycloak:8080/admin/realms/bracketofdeathsite/users/$USER_ID/role-mappings/realm" \
              -H "Authorization: Bearer $ADMIN_TOKEN" \
              -H "Content-Type: application/json" \
              -d '[
                {
                  "id": "'$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "http://keycloak:8080/admin/realms/bracketofdeathsite/roles/admin" | jq -r '.id')'",
                  "name": "admin"
                },
                {
                  "id": "'$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "http://keycloak:8080/admin/realms/bracketofdeathsite/roles/user" | jq -r '.id')'",
                  "name": "user"
                }
              ]' > /dev/null
            
            echo "Initial admin user created successfully (password: admin123, no password change required)"
            echo "WARNING: Change the default admin password immediately for security!"
        else
            echo "Failed to create admin user"
        fi
    else
        echo "Failed to create realm"
        exit 1
    fi
fi

echo "Keycloak setup completed successfully!"
echo "Keycloak is running internally at: http://keycloak:8080"  
echo "Admin Username: ${KEYCLOAK_ADMIN_USER}"
echo "Realm: bracketofdeathsite"