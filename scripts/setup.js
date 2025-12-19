#!/usr/bin/env node
/**
 * Bracket of Death - Automated Setup Script
 * Generates secrets and configures network access.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const readline = require('readline');

const ENV_FILE = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE_FILE = path.join(__dirname, '..', '.env.example');

// Fields that should have generated secrets
const SECRET_FIELDS = [
    'MONGO_INITDB_ROOT_PASSWORD',
    'KEYCLOAK_ADMIN_PASSWORD',
    'KEYCLOAK_DB_PASSWORD',
    'KEYCLOAK_CLIENT_SECRET',
    'JWT_SECRET',
];

// Placeholder patterns that indicate a secret needs generation
const PLACEHOLDER_PATTERNS = [
    /your_.*_here/i,
    /change_me/i,
    /placeholder/i,
    /^$/,
];

/**
 * Generate a cryptographically secure random string.
 */
function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

/**
 * Get the local network IP address.
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
}

/**
 * Parse an .env file into an object.
 */
function parseEnvFile(content) {
    const env = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) {
            continue;
        }
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
    }
    return env;
}

/**
 * Serialize an object back to .env format, preserving comments and structure.
 */
function updateEnvContent(originalContent, updates) {
    const lines = originalContent.split('\n');
    const result = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) {
            result.push(line);
            continue;
        }
        const [key] = trimmed.split('=');
        const keyTrimmed = key.trim();
        if (updates.hasOwnProperty(keyTrimmed)) {
            result.push(`${keyTrimmed}=${updates[keyTrimmed]}`);
        } else {
            result.push(line);
        }
    }
    return result.join('\n');
}

/**
 * Prompt user for input.
 */
function prompt(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

/**
 * Main setup function.
 */
async function main() {
    console.log('🎾 Bracket of Death - Automated Setup');
    console.log('=====================================\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        // Step 1: Check/Create .env
        let envContent;
        if (fs.existsSync(ENV_FILE)) {
            console.log('📄 Found existing .env file.');
            const overwrite = await prompt(rl, 'Do you want to regenerate secrets? (y/N): ');
            if (overwrite.toLowerCase() !== 'y') {
                console.log('⏭️  Skipping secret generation.');
                envContent = fs.readFileSync(ENV_FILE, 'utf-8');
            } else {
                envContent = fs.readFileSync(ENV_FILE, 'utf-8');
            }
        } else {
            console.log('📄 Creating .env from .env.example...');
            if (!fs.existsSync(ENV_EXAMPLE_FILE)) {
                console.error('❌ Error: .env.example not found!');
                process.exit(1);
            }
            envContent = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf-8');
        }

        const env = parseEnvFile(envContent);
        const updates = {};

        // Step 2: Generate Secrets
        console.log('\n🔐 Generating secrets...');
        for (const field of SECRET_FIELDS) {
            const currentValue = env[field] || '';
            const needsGeneration = PLACEHOLDER_PATTERNS.some((p) => p.test(currentValue));
            if (needsGeneration) {
                const newSecret = generateSecret();
                updates[field] = newSecret;
                console.log(`   ✅ Generated new ${field}`);
            } else {
                console.log(`   ⏭️  ${field} already set, skipping.`);
            }
        }

        // Step 3: Network Configuration
        console.log('\n🌐 Configuring network access...');
        const localIP = getLocalIP();
        console.log(`   📍 Detected local IP: ${localIP || 'N/A'}`);

        const fqdn = await prompt(rl, 'Enter your FQDN (or press Enter to skip): ');

        // Build CORS origins
        const corsOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
        if (localIP) {
            corsOrigins.push(`http://${localIP}:5173`);
        }
        if (fqdn) {
            corsOrigins.push(`http://${fqdn}`);
            corsOrigins.push(`https://${fqdn}`);
        }
        updates['CORS_ORIGIN'] = corsOrigins.join(',');
        console.log(`   ✅ CORS_ORIGIN: ${updates['CORS_ORIGIN']}`);

        // Build VITE_ALLOWED_HOSTS
        const allowedHosts = ['localhost', '127.0.0.1'];
        if (localIP) {
            allowedHosts.push(localIP);
        }
        if (fqdn) {
            allowedHosts.push(fqdn);
        }
        updates['VITE_ALLOWED_HOSTS'] = allowedHosts.join(',');
        console.log(`   ✅ VITE_ALLOWED_HOSTS: ${updates['VITE_ALLOWED_HOSTS']}`);

        // Step 4: Save .env
        console.log('\n💾 Saving .env...');
        const newEnvContent = updateEnvContent(envContent, updates);
        fs.writeFileSync(ENV_FILE, newEnvContent, 'utf-8');
        console.log('   ✅ .env saved successfully!');

        console.log('\n🎉 Setup complete!');
        console.log('   Run `docker compose up --build` to start the application.');

    } finally {
        rl.close();
    }
}

main().catch((err) => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
});
