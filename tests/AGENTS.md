# TESTS - Jest/Vitest Testing

## OVERVIEW

Multi-tier testing: Unit (mocked) → Integration (Docker MongoDB) → E2E (Playwright).

## STRUCTURE

```
tests/
├── unit/                    # Isolated logic tests
│   ├── backend/             # Middleware, services
│   ├── models/              # Requires MongoDB (run via integration)
│   └── liveTournament.*.ts  # Tournament state machine
├── integration/             # Full stack with real DB
│   ├── globalSetup.ts       # Spins up Docker MongoDB
│   └── *.integration.test.ts
├── security/                # Auth security tests
├── e2e/                     # Playwright browser tests
└── setup.ts                 # Global mocks, env loading

src/backend/tests/           # Backend-specific tests (DUPLICATE LOCATION)
src/frontend/src/**/__tests__/ # Frontend component tests
```

## RUNNING TESTS

```bash
# Unit tests only (fast, mocked)
npm test

# Integration tests (requires Docker)
npm run test:integration

# Frontend tests (from src/frontend/)
npx vitest run

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## CONVENTIONS

### Unit Tests
- Heavily mock dependencies (`jest.mock()`)
- `tests/setup.ts` mutes console output
- Use module aliases: `@/models/Tournament`

### Integration Tests
- Real MongoDB on port 27018 via Docker
- `globalSetup.ts` runs `docker-compose -f docker-compose.test.yml up`
- **Stateful by design**: Tests in same file can share state
- NO `afterEach` cleanup between sequential tests

### Frontend Tests
- Vitest + jsdom environment
- `@testing-library/react` for component testing
- Setup in `src/frontend/src/test/setup.ts`

## CONFIG FILES

| File | Purpose |
|------|---------|
| `jest.config.js` | Unit tests - excludes integration/e2e |
| `jest.integration.config.js` | Integration - includes Docker setup |
| `jest.integration.ci.config.js` | CI-specific timeouts |
| `src/frontend/vite.config.ts` | Vitest config (in `test` block) |

## TEST PATTERNS

### Mocking Models
```typescript
jest.mock('@/models/Tournament', () => ({
  Tournament: {
    find: jest.fn(),
    findById: jest.fn(),
  }
}));
```

### Integration Auth Bypass
```typescript
// In test environment, use header
headers: { 'x-test-mode': 'true' }
```

### Frontend API Mock
```typescript
vi.mock('@/services/api', () => ({
  apiClient: {
    getPlayers: vi.fn().mockResolvedValue({ data: [] })
  }
}));
```

## ANTI-PATTERNS

- **Don't mix unit/integration** - Keep isolated
- **Don't skip cleanup** in integration (use shared state intentionally)
- **Don't use `.spec.js`** - Use `.test.ts` (Playwright excluded)

## KNOWN ISSUES

- Test locations fragmented (3 places for frontend)
- `tests/setup.js` is compiled output (should be gitignored)
- One E2E test is `.js` instead of `.ts`
- Some model tests in `tests/unit/models/` require MongoDB

## FILE NAMING

```
*.test.ts           # Jest unit/integration
*.integration.test.ts  # Integration (explicit)
*.spec.ts           # Playwright E2E
```
