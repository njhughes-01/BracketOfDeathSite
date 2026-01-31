# BACKEND - Express/TypeScript API

## OVERVIEW

Express 4.18 + Mongoose 8 + Keycloak auth. Handles tournament lifecycle, player stats, real-time scoring via SSE.

## STRUCTURE

```
src/backend/
├── controllers/     # Request handlers (extend BaseCrudController)
├── routes/          # Express Router definitions
├── models/          # Mongoose schemas (use base.ts pattern)
├── services/        # Business logic (email, seeding, deletion)
├── middleware/      # auth, validation, errorHandler
├── types/           # TypeScript interfaces
└── utils/           # Validation, sanitization helpers
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add endpoint | `routes/*.ts` → wire to controller |
| New model | Copy pattern from `models/base.ts` |
| Auth logic | `middleware/auth.ts` |
| Email sending | `services/EmailService.ts` |
| Live tournament | `controllers/LiveTournamentController.ts` |
| Player CRUD | `controllers/PlayerController.ts` |

## CONVENTIONS

### Controllers
- Extend `BaseCrudController` for standard CRUD
- Use `this.asyncHandler()` for all async methods
- Return `ApiResponse` shape: `{ success, data, message, pagination }`

### Routes
- Declare specific routes BEFORE `/:id` (route collision)
- Stack: `requireAuth` → `validateRequest` → `controller.method`
- Use `validateObjectId` middleware for `:id` params

### Models
- Always use `createIndexes()` helper at bottom
- Unique constraints: Player.name, Tournament.bodNumber
- Use `findByIdAndUpdateSafe()` (runs validators)

### Request Types
```typescript
interface RequestWithAuth extends Request {
  user: { id: string; email: string; roles: string[]; isAdmin: boolean }
}
```

## ANTI-PATTERNS

- **No raw `any`** - Use `unknown` or proper types
- **No empty catch** - Always log or rethrow
- **No direct model.save()** - Use safe update helpers
- **No hardcoded secrets** - Use env vars

## KEY FILES

| File | Lines | Purpose |
|------|-------|---------|
| `LiveTournamentController.ts` | 1600+ | Tournament state machine, SSE |
| `TournamentController.ts` | 1100+ | CRUD, aggregation pipelines |
| `Tournament.ts` | 545 | Core schema, status transitions |

## MODELS REFERENCE

| Model | Unique Index | Relationships |
|-------|--------------|---------------|
| Player | `name` | Referenced by Tournament, Match |
| Tournament | `bodNumber` | Has Players, Matches, Results |
| Match | `tournamentId + matchNumber` | Links Tournament → Players |
| TournamentResult | `tournamentId + players` | Historical stats |
| SystemSettings | singleton | Email/branding config |

## VALIDATION

- Tennis scores: `utils/tennisValidation.ts`
- `maxPlayers` must be power of 2
- Status transitions enforced (no reopening completed)
- `gamesWon <= gamesPlayed` constraint

## TESTING

```bash
# From project root
npm test                    # Unit tests (mocked)
npm run test:integration    # Real MongoDB
```

Tests in `src/backend/tests/` and `tests/unit/backend/`
