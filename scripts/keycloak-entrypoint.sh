#!/bin/sh
# Keycloak entrypoint - sources secrets before starting Keycloak

# Source generated secrets if available
if [ -f "/secrets/.generated_secrets" ]; then
    echo "Loading secrets from /secrets/.generated_secrets..."
    . /secrets/.generated_secrets
    export KEYCLOAK_ADMIN_PASSWORD
fi

# Start Keycloak
exec /opt/keycloak/bin/kc.sh "$@"
