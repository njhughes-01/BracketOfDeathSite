# Frontend Dockerfile - Development/Production
FROM node:20-alpine

# Install system dependencies for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (no --force for system-agnostic builds)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Start Vite dev server
CMD ["npm", "run", "dev"]