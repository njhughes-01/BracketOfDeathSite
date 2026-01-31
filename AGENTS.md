# BRACKET OF DEATH - PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-31 | **Commit:** 42293ac | **Branch:** main

## OVERVIEW

Tennis tournament management app. Express/MongoDB backend + React/Vite frontend + Keycloak auth. Docker-first deployment.

## STRUCTURE

```
BracketOfDeathSite/
├── src/backend/       # Express API (see src/backend/AGENTS.md)
├── src/frontend/      # React SPA (see src/frontend/AGENTS.md)
├── tests/             # Jest unit/integration (see tests/AGENTS.md)
├── scripts/           # Docker init, data migration, utilities
├── json/              # Historical tournament data (2009-2024)
├── docker-compose.yml # Main orchestration (7 services)
└── dist/              # Build output - NEVER EDIT
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API endpoint | `src/backend/routes/*.ts` | Routes → Controllers |
| Database schema | `src/backend/models/*.ts` | Mongoose + base.ts pattern |
| Auth flow | `src/backend/middleware/auth.ts` | Keycloak JWT validation |
| React page | `src/frontend/src/pages/*.tsx` | File = route |
| API client | `src/frontend/src/services/api.ts` | Axios singleton |
| Auth context | `src/frontend/src/contexts/AuthContext.tsx` | Keycloak integration |
| Unit tests | `tests/unit/` | Jest, mocked dependencies |
| Integration tests | `tests/integration/` | Real MongoDB via Docker |

## ARCHON WORKFLOW (CRITICAL)

**This project uses Archon MCP for task management. ALWAYS use Archon over TodoWrite.**

```bash
# Get current tasks
find_tasks(filter_by="status", filter_value="todo")

# Start work
manage_task("update", task_id="...", status="doing")

# Complete
manage_task("update", task_id="...", status="review")
```

Task flow: `todo` → `doing` → `review` → `done`

## COMMANDS

```bash
# Backend
npm run dev           # Start with nodemon
npm run build         # Compile to dist/
npm test              # Unit tests only

# Frontend (from src/frontend/)
npm run dev           # Vite dev server
npm run build         # Production build
npx vitest run        # Frontend tests

# Integration
npm run test:integration    # Requires Docker MongoDB

# Docker
docker-compose up -d        # Full stack
docker-compose logs -f backend  # Debug
```

## CONVENTIONS

- **TypeScript everywhere** - Explicit types at boundaries
- **TDD required** - Write tests first
- **2-space indent**, <120 char lines
- **PascalCase**: Components, Controllers, Models
- **camelCase**: functions, variables, route files
- **UPPER_SNAKE**: environment variables

## ANTI-PATTERNS (FORBIDDEN)

| Pattern | Reason |
|---------|--------|
| `as any`, `@ts-ignore` | Type safety violation |
| `console.log` in frontend | Use proper logging |
| Empty `catch(e) {}` | Always handle errors |
| Edit `dist/` or `json/backup/` | Generated/readonly |
| Commit `.env` with secrets | Security risk |
| Skip Archon task updates | Workflow violation |

## TECHNICAL DEBT (KNOWN ISSUES)

- `DataMigrationController.ts`: 9 TODOs - skeleton implementation
- `LiveTournamentController.ts`: Heavy `any` usage
- Frontend: `console.log` scattered (cleanup needed)
- `@ts-ignore` in `UserController.ts`, `TournamentEdit.tsx`
- Test fragmentation: 3 locations for frontend tests

## ARCHITECTURE NOTES

**Docker Services Chain:**
```
secrets-init → keycloak-db → keycloak → keycloak-init
                                            ↓
            mongodb → data-init → backend → frontend
```

**Auth Flow:**
1. Frontend gets token from Keycloak
2. `api.ts` attaches Bearer token via interceptor
3. Backend validates via JWKS endpoint
4. `req.user` populated with roles

**Data Integrity:**
- Historical tournament edits require `editReason`
- Player stats auto-recalculated on corrections
- Compound indexes prevent duplicate matches/results

## NOTES

- MongoDB pinned to 8.0.17 (CVE-2025-14847)
- Frontend runs Vite dev server in Docker (non-standard)
- Types duplicated between frontend/backend (no shared lib)
- Keycloak test bypass: `x-test-mode: true` header
