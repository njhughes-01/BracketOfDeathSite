---
description: How to keep the codebase vector database up to date
---

# Update Vector Database

The vector database used by the `codebase-vector-db` MCP server needs to be refreshed periodically to ensure it has the latest code changes.

## When to Update

- After pulling changes from remote (`git pull`)
- After switching branches (`git checkout`)
- After significant refactoring or code additions
- Before starting a complex task that relies on semantic search

## How to Update

1.  Open the `codebase-vector-db` MCP server (if not running/managed automatically).
2.  Use the `refresh_index` tool.
    - This can be done via the agent: "Please refresh the vector database index."
    - Or manually if you have a UI for tool calling.

## Troubleshooting

- If the server fails to start with "Cannot find module ... lancedb ...", try:
    - Re-installing dependencies in `tools/codebase-vector-db`: `npm install --force`
    - Rebuilding: `npm run build`
