#!/bin/sh
# Backend entrypoint - sources secrets before starting node

# Source generated secrets if available
if [ -f "/secrets/.generated_secrets" ]; then
    echo "Loading secrets from /secrets/.generated_secrets..."
    . /secrets/.generated_secrets
fi

# Start the application
exec node dist/server.js
