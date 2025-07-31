#!/bin/bash

echo "🎾 Bracket of Death Tournament Management System Setup"
echo "===================================================="

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p data/logs/backend
mkdir -p data/init-status

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please review and update the .env file with your specific configuration!"
fi

# Build and start the services
echo "🐳 Building and starting Docker services..."
docker-compose up --build -d

echo ""
echo "🎉 Setup complete! Services are starting up..."
echo ""
echo "🔗 Access URLs:"
echo "   • Web Application: http://localhost:8080"
echo "   • API Backend: Available via frontend proxy at /api"
echo "   • All services communicate internally via Docker network"
echo "   • MongoDB: Internal access only (service name: mongodb:27017)"
echo ""
echo "🔑 Default Keycloak Admin Credentials:"
echo "   • Username: admin"
echo "   • Password: keycloak123"
echo ""
echo "🔑 Default Tournament Admin User:"
echo "   • Username: admin"
echo "   • Password: admin123"
echo "   • Email: admin@bracketofdeathsite.com"
echo ""
echo "📊 To view service status: docker-compose ps"
echo "📋 To view logs: docker-compose logs -f [service-name]"
echo "🛑 To stop services: docker-compose down"
echo ""
echo "⏳ Please wait a few minutes for all services to fully initialize..."
echo "   The system will automatically:"
echo "   1. Set up MongoDB with historical data"
echo "   2. Configure Keycloak with authentication realm"
echo "   3. Start the web application"