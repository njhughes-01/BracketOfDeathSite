const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.resolve(__dirname, 'dist/index.js');
const query = process.argv[2] || "TODO";

console.error('Starting Vector DB Server from:', serverPath);
console.error('Querying for:', query);

const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

let buffer = '';
let searchSent = false;

server.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');

    while (lines.length > 1) {
        const line = lines.shift();
        if (!line.trim()) continue;

        try {
            const response = JSON.parse(line);
            if (response.id === 2) {
                if (response.result && response.result.content) {
                    const contentText = response.result.content[0].text;
                    try {
                        const results = JSON.parse(contentText);
                        console.log(JSON.stringify(results, null, 2));
                    } catch (e) {
                        console.log(contentText);
                    }
                } else if (response.error) {
                    console.error('Error:', response.error);
                }
                process.exit(0);
            }
        } catch (e) { }
    }
    buffer = lines.join('\n');
});

server.stderr.on('data', (data) => {
    const msg = data.toString();
    //console.error('Server Log:', msg.trim()); // Relay logs if needed, but keeping it clean for now
    if (msg.includes('Indexing complete') && !searchSent) {
        console.error('Indexing finished. Sending search...');
        searchSent = true;
        server.stdin.write(JSON.stringify(searchRequest) + '\n');
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
        clientInfo: { name: 'query-script', version: '1.0.0' }
    }
};

// 2. Call search_codebase
const searchRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
        name: 'search_codebase',
        arguments: {
            query: query,
            limit: 20
        }
    }
};

// Send Initialize immediately
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Timeout (3 minutes to allow for slow embedding)
setTimeout(() => {
    console.error('Timeout waiting for search results');
    process.exit(1);
}, 180000);
