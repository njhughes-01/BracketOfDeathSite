#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// @ts-ignore
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, } from "@modelcontextprotocol/sdk/types.js";
let lancedb;
let hasLancedb = false;
try {
    // @ts-ignore
    lancedb = await import("@lancedb/lancedb");
    hasLancedb = true;
}
catch (e) {
    console.error("Failed to load lancedb, falling back to in-memory store", e);
}
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import * as dotenv from "dotenv";
dotenv.config();
// Dynamic import for transformers
const transformers = await import("@xenova/transformers");
class McpsError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "McpsError";
    }
}
class CodebaseVectorServer {
    server;
    db = null;
    table = null;
    generateEmbedding = null;
    rootDir;
    vectorDbPath;
    constructor() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.rootDir = path.resolve(__dirname, "../../.."); // Assumes dist/index.js -> tools/codebase-vector-db/ -> root
        this.vectorDbPath = path.join(__dirname, "../../.vector_store");
        this.server = new Server({
            name: "codebase-vector-db",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "search_codebase",
                        description: "Semantic search over the codebase using a vector database. Use this to find relevant code snippets, functions, or architectural patterns given a natural language query.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The natural language query to search for (e.g., 'how is authentication handled?', 'where is the User type defined?')",
                                },
                                limit: {
                                    type: "number",
                                    description: "Number of results to return (default: 5)",
                                    default: 5,
                                },
                            },
                            required: ["query"],
                        },
                    },
                    {
                        name: "refresh_index",
                        description: "Force a re-indexing of the codebase to updating the vector database with the latest changes.",
                        inputSchema: {
                            type: "object",
                            properties: {},
                        },
                    },
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name === "search_codebase") {
                const args = request.params.arguments;
                const query = args.query;
                const limit = args.limit || 5;
                try {
                    const results = await this.search(query, limit);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(results, null, 2),
                            },
                        ],
                    };
                }
                catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error searching codebase: ${error.message}`,
                            },
                        ],
                        isError: true,
                    };
                }
            }
            else if (request.params.name === "refresh_index") {
                try {
                    await this.indexCodebase();
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Codebase re-indexing started successfully.",
                            },
                        ],
                    };
                }
                catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error refreshing index: ${error.message}`,
                            },
                        ],
                        isError: true,
                    };
                }
            }
            else {
                throw new McpsError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        });
    }
    async initEmbedding() {
        const pipe = await transformers.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        this.generateEmbedding = async (text) => {
            const output = await pipe(text, { pooling: "mean", normalize: true });
            return Array.from(output.data);
        };
    }
    async initDB() {
        if (!hasLancedb) {
            console.error("Using in-memory fallback for Vector DB");
            this.db = {
                createTable: async () => this.createMockTable(),
                openTable: async () => this.createMockTable()
            };
            this.table = await this.db.createTable("code_chunks");
            return;
        }
        try {
            await fs.mkdir(this.vectorDbPath, { recursive: true });
            this.db = await lancedb.connect(this.vectorDbPath);
            // Check if table exists, if not create
            const tableNames = await this.db.tableNames();
            if (!tableNames.includes("code_chunks")) {
                // Create dummy data to initialize schema
                const dummyVector = await this.generateEmbedding("init");
                // Explicitly define schema if possible, or infer from data
                // LanceDB node inference is decent.
                this.table = await this.db.createTable("code_chunks", [
                    {
                        id: "init",
                        path: "init",
                        content: "init",
                        vector: dummyVector,
                        startLine: 0,
                        endLine: 0
                    }
                ], { mode: 'overwrite' });
                // Clear init data? Or just leave it, it won't match much.
                await this.table.delete("id = 'init'");
            }
            else {
                this.table = await this.db.openTable("code_chunks");
            }
        }
        catch (e) {
            console.error("Failed to init DB", e);
            throw e;
        }
    }
    createMockTable() {
        const data = [];
        return {
            add: async (rows) => { data.push(...rows); },
            search: (queryVector) => ({
                limit: (n) => ({
                    execute: async () => {
                        // Simple cosine similarity or just return top n
                        // For fallback, just return random or last added?
                        // Let's implement basic cosine similarity for the fallback to be useful!
                        return data.map(row => ({
                            ...row,
                            score: this.cosineSimilarity(queryVector, row.vector)
                        }))
                            .sort((a, b) => b.score - a.score)
                            .slice(0, n);
                    }
                })
            }),
            delete: async () => { data.length = 0; }
        };
    }
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length)
            return 0;
        let dot = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
    }
    async indexCodebase() {
        console.error("Starting codebase indexing...");
        // Find all files
        // Ignore node_modules, dist, .git, artifacts
        const files = await glob("**/*.{ts,tsx,js,jsx,py,md}", {
            cwd: this.rootDir,
            ignore: [
                "**/node_modules/**",
                "**/dist/**",
                "**/.git/**",
                "**/.gemini/**",
                "**/tools/**" // avoid indexing self
            ],
            absolute: true
        });
        console.error(`Found ${files.length} files to index.`);
        const data = [];
        const CHUNK_SIZE = 500; // chars approx (lines?) 
        // Simple chunking by lines for now
        for (const file of files) {
            try {
                const content = await fs.readFile(file, "utf-8");
                const lines = content.split("\n");
                // Chunking strategy: 50 lines with 10 lines overlap
                const linesPerChunk = 50;
                const overlap = 10;
                for (let i = 0; i < lines.length; i += (linesPerChunk - overlap)) {
                    if (i > lines.length)
                        break; // End of file
                    const end = Math.min(i + linesPerChunk, lines.length);
                    const chunkLines = lines.slice(i, end);
                    const chunkContent = chunkLines.join("\n");
                    if (chunkContent.trim().length < 50)
                        continue; // Skip tiny chunks
                    const vector = await this.generateEmbedding(chunkContent);
                    data.push({
                        id: `${file}-${i}-${end}`, // simple unique ID
                        path: path.relative(this.rootDir, file),
                        content: chunkContent,
                        vector: vector,
                        startLine: i + 1,
                        endLine: end
                    });
                    // Optimization: batch insert every 100 chunks
                    if (data.length >= 100) {
                        await this.table?.add(data);
                        data.length = 0;
                    }
                }
            }
            catch (e) {
                console.error(`Error processing file ${file}:`, e);
            }
        }
        // Insert remaining
        if (data.length > 0) {
            await this.table?.add(data);
        }
        console.error("Indexing complete.");
    }
    async search(query, limit) {
        if (!this.table)
            throw new Error("DB not initialized");
        const queryVector = await this.generateEmbedding(query);
        const results = await this.table.search(queryVector).limit(limit).execute();
        return results.map((r) => ({
            path: r.path,
            startLine: r.startLine,
            endLine: r.endLine,
            similarity: r.score, // LanceDB might return _distance or score depending on version
            content: r.content
        }));
    }
    async run() {
        await this.initEmbedding();
        await this.initDB();
        // Start server transport first
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        // Index in background (don't block server startup completely, but maybe needed for first search)
        // For now, let's just trigger it. In production, check checksums.
        // We will clear table and re-index for simplicity in this MVP
        if (this.table) {
            try {
                await this.table.delete("id != ''"); // Clear all
                if (hasLancedb && this.db) {
                    // Force re-create only if real DB
                    const dummyVector = await this.generateEmbedding("init");
                    this.table = await this.db.createTable("code_chunks", [
                        { id: "init", path: "init", content: "init", vector: dummyVector, startLine: 0, endLine: 0 }
                    ], { mode: 'overwrite' });
                    await this.table.delete("id = 'init'");
                }
                this.indexCodebase();
            }
            catch (e) {
                console.error("Re-indexing error", e);
            }
        }
        console.error("Codebase Vector DB Server running on stdio");
    }
}
const server = new CodebaseVectorServer();
server.run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
