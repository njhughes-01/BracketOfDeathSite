#!/bin/sh
# Auto-generate secrets if not already set via environment
# This runs at container startup and exports generated values

SECRETS_FILE="/secrets/.generated_secrets"

generate_secret() {
    # Generate a 32-character random string
    head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# Check if secrets already exist
if [ -f "$SECRETS_FILE" ]; then
    echo "✅ Secrets already generated, loading from file..."
    . "$SECRETS_FILE"
else
    echo "🔐 Generating new secrets..."
    
    MONGO_PASSWORD=$(generate_secret)
    KEYCLOAK_ADMIN_PASSWORD=$(generate_secret)
    KEYCLOAK_DB_PASSWORD=$(generate_secret)
    KEYCLOAK_CLIENT_SECRET=$(generate_secret)
    JWT_SECRET=$(generate_secret)
    
    # Save to file for persistence across restarts
    cat > "$SECRETS_FILE" << EOF
export MONGO_PASSWORD="$MONGO_PASSWORD"
export KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD"
export KEYCLOAK_DB_PASSWORD="$KEYCLOAK_DB_PASSWORD"
export KEYCLOAK_CLIENT_SECRET="$KEYCLOAK_CLIENT_SECRET"
export JWT_SECRET="$JWT_SECRET"
EOF

    echo "✅ Secrets generated and saved!"
    echo ""
    echo "📋 Generated secrets (save these for production):"
    echo "   MONGO_PASSWORD=$MONGO_PASSWORD"
    echo "   KEYCLOAK_ADMIN_PASSWORD=$KEYCLOAK_ADMIN_PASSWORD"
    echo "   KEYCLOAK_DB_PASSWORD=$KEYCLOAK_DB_PASSWORD"
    echo "   KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET"
    echo "   JWT_SECRET=$JWT_SECRET"
fi

echo ""
echo "🚀 Secrets initialization complete!"
