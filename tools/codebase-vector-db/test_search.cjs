const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
});

console.log('Server started');

const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
    }
};

server.stdin.write(JSON.stringify(request) + '\n');

let buffer = '';
server.stdout.on('data', (data) => {
    buffer += data.toString();
    try {
        const lines = buffer.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            // Handle potential multiple JSONs or fragments?
            // For simple test, just try parse.
            try {
                const response = JSON.parse(line);
                console.log('Received response:', JSON.stringify(response, null, 2));
                if (response.id === 1 || (response.result && response.result.serverInfo)) {
                    console.log('Initialization successful!');
                    server.kill();
                    process.exit(0);
                }
            } catch (e) { }
        }
    } catch (e) {
        // Only partial data received
    }
});

server.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
});

server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
});

setTimeout(() => {
    console.error('Timeout waiting for response');
    server.kill();
    process.exit(1);
}, 10000);
