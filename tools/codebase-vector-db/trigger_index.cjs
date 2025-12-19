const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.resolve(__dirname, 'dist/index.js');

console.log('Starting Vector DB Server from:', serverPath);

const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/stdout, inherit stderr for logs
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

server.on('exit', (code) => {
    if (code !== 0) {
        console.error(`Server exited with code ${code}`);
        process.exit(code);
    }
});

let buffer = '';

server.stdout.on('data', (data) => {
    const chunk = data.toString();
    buffer += chunk;

    // Simple JSON-RPC message framing (assuming line-delimited or finding the matching braces)
    // For this test, we just look for the success response
    if (buffer.includes('"result":true')) {
        console.log('Success: Index refresh triggered and completed (according to immediate response).');
        console.log('Server logs should show indexing progress.');
        // Wait a bit for server logs to flush
        setTimeout(() => {
            process.exit(0);
        }, 5000);
    }
});

// 1. Initialize
const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-script', version: '1.0.0' }
    }
};

// 2. Call refresh_index
const callRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
        name: 'refresh_index',
        arguments: {}
    }
};

// Send requests
setTimeout(() => {
    console.log('Sending Initialize...');
    server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

setTimeout(() => {
    console.log('Sending Refresh Index...');
    server.stdin.write(JSON.stringify(callRequest) + '\n');
}, 2000);
