#!/bin/bash

echo "Testing admin user login..."

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Test direct token request
echo "Testing direct token request..."
curl -X POST \
  http://localhost:8080/auth/realms/bracketofdeathsite/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=bod-app&username=admin@bracketofdeathsite.com&password=admin123" \
  -v

echo ""
echo "Test completed."