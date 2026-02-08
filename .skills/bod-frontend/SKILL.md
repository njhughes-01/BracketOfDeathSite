---
name: bod-frontend
description: Bracket of Death frontend development with React, TypeScript, Vite, and TailwindCSS. Use when building UI components, pages, forms, or fixing frontend issues. Knows project patterns, API client usage, auth context, and component conventions.
---

# BOD Frontend Development

Build React/TypeScript components for Bracket of Death tournament management.

## Stack
- React 18 + TypeScript
- Vite dev server (port 5173)
- TailwindCSS + DaisyUI
- React Router v6
- Vitest for testing

## Project Structure
```
src/frontend/src/
├── components/       # Reusable UI components
│   ├── common/       # Generic (Button, Modal, ErrorBoundary)
│   ├── admin/        # Admin-only components
│   └── tournament/   # Tournament-specific
├── pages/            # Route pages
│   ├── admin/        # Admin pages
│   └── public/       # Public pages
├── services/         # API clients
├── hooks/            # Custom React hooks
├── context/          # React context providers
├── types/            # TypeScript interfaces
└── utils/            # Utilities (logger, helpers)
```

## Key Patterns

### API Client
Always use `apiClient` from `services/apiClient.ts`:
```typescript
import apiClient from '../services/apiClient';

// GET
const { data } = await apiClient.get<Tournament[]>('/tournaments');

// POST
const { data } = await apiClient.post<Tournament>('/tournaments', payload);
```

### Auth Context
```typescript
import { useAuth } from '../context/AuthContext';

const { user, isAuthenticated, isAdmin, logout } = useAuth();
```

### Logger (Production-Safe)
```typescript
import logger from '../utils/logger';

logger.info('Component mounted');
logger.error('Failed to load', error);
// Only logs in development mode
```

### Component Pattern
```typescript
interface Props {
  tournamentId: string;
  onSuccess?: () => void;
}

export const MyComponent: React.FC<Props> = ({ tournamentId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ... implementation

  if (loading) return <div className="loading loading-spinner" />;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      {/* content */}
    </div>
  );
};
```

### Form Pattern (with react-hook-form)
```typescript
import { useForm } from 'react-hook-form';

interface FormData {
  name: string;
  email: string;
}

const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('name', { required: true })} className="input input-bordered" />
  {errors.name && <span className="text-error">Required</span>}
</form>
```

## DaisyUI Classes
- Buttons: `btn btn-primary`, `btn btn-secondary`, `btn btn-ghost`
- Cards: `card bg-base-100 shadow-xl`
- Forms: `input input-bordered`, `select select-bordered`
- Alerts: `alert alert-success`, `alert alert-error`, `alert alert-warning`
- Loading: `loading loading-spinner`
- Modals: `modal`, `modal-box`, `modal-action`

## Testing
Run tests: `npm test` from `src/frontend/`
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent tournamentId="123" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Error Handling
Wrap pages with ErrorBoundary:
```typescript
import ErrorBoundary from '../components/common/ErrorBoundary';

<ErrorBoundary>
  <MyPage />
</ErrorBoundary>
```

## Self-Improvement

When encountering issues:
1. Check `references/patterns.md` for existing solutions
2. If new pattern discovered, update `references/patterns.md`
3. If bug found, add to `references/known-issues.md` with fix

See `references/patterns.md` for component patterns and `references/known-issues.md` for past bugs and fixes.
