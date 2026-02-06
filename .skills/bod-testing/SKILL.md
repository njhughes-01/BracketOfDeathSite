---
name: bod-testing
description: Bracket of Death test development with Vitest (frontend) and Jest (backend). Use when writing unit tests, integration tests, or fixing test failures. Knows test patterns, mocking conventions, and TDD workflow.
---

# BOD Testing

Write and maintain tests for Bracket of Death.

## Stack
- **Frontend:** Vitest + React Testing Library
- **Backend:** Jest + Supertest

## Running Tests

```bash
# Frontend tests
cd src/frontend && npm test

# Backend tests  
cd src/backend && npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Frontend Testing (Vitest)

### Setup
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
```

### Component Test Pattern
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

// Wrap with providers if needed
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const onClickMock = vi.fn();
    renderWithProviders(<MyComponent onClick={onClickMock} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClickMock).toHaveBeenCalled();
  });
});
```

### Mocking API Calls
```typescript
import { vi } from 'vitest';
import apiClient from '../services/apiClient';

vi.mock('../services/apiClient');

describe('Component with API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches data on mount', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { items: [] } });
    
    render(<MyComponent />);
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/endpoint');
    });
  });
});
```

### Mocking Auth Context
```typescript
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    isAdmin: false,
  }),
}));
```

## Backend Testing (Jest)

### Controller Test Pattern
```typescript
import request from 'supertest';
import app from '../server';
import MyModel from '../models/MyModel';

jest.mock('../models/MyModel');

describe('GET /api/myroute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with data', async () => {
    (MyModel.find as jest.Mock).mockResolvedValue([{ id: '1', name: 'Test' }]);
    
    const response = await request(app)
      .get('/api/myroute')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-mode', 'true');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('returns 404 when not found', async () => {
    (MyModel.findById as jest.Mock).mockResolvedValue(null);
    
    const response = await request(app)
      .get('/api/myroute/invalid-id')
      .set('x-test-mode', 'true');
    
    expect(response.status).toBe(404);
  });
});
```

### Test Mode Headers
For backend tests without Keycloak:
```typescript
.set('x-test-mode', 'true')
.set('x-test-user-id', 'test-user-123')
.set('x-test-is-admin', 'true')
```

### Service Test Pattern
```typescript
import { myFunction } from '../services/MyService';
import MyModel from '../models/MyModel';

jest.mock('../models/MyModel');

describe('MyService', () => {
  it('processes data correctly', async () => {
    (MyModel.findById as jest.Mock).mockResolvedValue({ id: '1', status: 'active' });
    
    const result = await myFunction('1');
    
    expect(result).toBeDefined();
    expect(MyModel.findById).toHaveBeenCalledWith('1');
  });
});
```

## TDD Workflow

1. **Write failing test first**
2. **Implement minimum code to pass**
3. **Refactor while keeping tests green**
4. **Commit with test + implementation**

## Test Naming Convention

```typescript
describe('ComponentName', () => {
  describe('when [condition]', () => {
    it('should [expected behavior]', () => {
      // ...
    });
  });
});
```

## Self-Improvement

When tests fail unexpectedly:
1. Check `references/patterns.md` for testing patterns
2. If new pattern discovered, add it
3. If flaky test fixed, document in `references/known-issues.md`

See `references/patterns.md` for test patterns and `references/known-issues.md` for test-related bugs.
