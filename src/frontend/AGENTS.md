# FRONTEND - React/Vite/Tailwind

## OVERVIEW

React 19 + Vite 7 + TailwindCSS 3. Keycloak auth via context. Dark-mode-first design.

## STRUCTURE

```
src/frontend/src/
├── pages/           # Route components (file = route)
├── components/      # Reusable UI (grouped by domain)
│   ├── admin/       # Editable* components (barrel export)
│   ├── tournament/  # Match, bracket, scoring
│   ├── users/       # User management
│   └── ui/          # Generic (Card, Modal, Spinner)
├── contexts/        # AuthContext (Keycloak)
├── hooks/           # useApi, usePermissions, useSystemStatus
├── services/        # api.ts (Axios client)
├── types/           # Mirrors backend types
└── utils/           # tennisValidation (duplicated from backend)
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add page | `pages/*.tsx` + update router |
| API call | Use `useApi()` or `useMutation()` hooks |
| Auth check | `useAuth()` from AuthContext |
| Permissions | `usePermissions()` hook |
| Add API endpoint | `services/api.ts` → ApiClient class |
| Admin component | `components/admin/` + export in index.ts |

## CONVENTIONS

### State Management
- **Auth**: `AuthContext` only (Keycloak)
- **Data**: `useApi`, `usePaginatedApi`, `useMutation` hooks
- **Local**: `useState` for component state
- No Redux/Zustand - keep it simple

### API Pattern
```typescript
// Fetching
const { data, loading, error } = useApi(() => apiClient.getPlayers());

// Mutations
const { mutate, loading } = useMutation((data) => apiClient.createPlayer(data));
```

### Components
- **PascalCase.tsx** for all components
- Tests in `__tests__/` subdirectory OR `*.test.tsx` colocated
- Page tests centralized in `pages/__tests__/`

### Styling
- Tailwind classes only (no CSS files)
- Dark mode: `bg-[#1c2230]`, `border-white/5`
- Font: Lexend
- Icons: Material Symbols Outlined (string class)

## ANTI-PATTERNS

- **No `console.log`** in production code
- **No `interface`** - use `type` instead
- **No inline styles** - use Tailwind
- **No `any`** - type everything
- **No direct localStorage** - use helper hooks

## KEY FILES

| File | Lines | Purpose |
|------|-------|---------|
| `api.ts` | 768 | All endpoints + interceptors |
| `AuthContext.tsx` | 400+ | Keycloak, token refresh |
| `TournamentDetail.tsx` | 1180+ | Multi-tab tournament view |
| `Settings.tsx` | 1159 | Admin email/branding config |
| `TournamentSetup.tsx` | 1109 | 5-step wizard |

## UNIQUE PATTERNS

### Admin Barrel Export
```typescript
// components/admin/index.ts exports all Editable* components
import { EditableText, EditableNumber } from '@/components/admin';
```

### LocalStorage Persistence
Many pages persist UI preferences:
```typescript
const [compact, setCompact] = persistToggle('tournament-compact-view', false);
```

### SSE for Live Updates
```typescript
const eventSource = new EventSource(`/api/tournaments/${id}/events`);
eventSource.onmessage = (e) => handleUpdate(JSON.parse(e.data));
```

## TESTING

```bash
# From src/frontend/
npm run test        # Vitest
npx vitest run      # Single run
```

- Component tests: `__tests__/` folders
- Page tests: `pages/__tests__/`
- Uses `@testing-library/react`
