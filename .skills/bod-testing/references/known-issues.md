# Testing Known Issues & Fixes

## Table of Contents
- [Vitest Issues](#vitest-issues)
- [Jest Issues](#jest-issues)
- [Mock Issues](#mock-issues)

---

## Vitest Issues

### Issue: Module not found in tests
**Symptom:** `Cannot find module '../services/apiClient'`
**Fix:** Check vitest.config.ts has correct alias paths matching tsconfig
**Date:** 2026-02-06

### Issue: React context not available
**Symptom:** `useAuth must be used within AuthProvider`
**Fix:** Wrap component in test with the required provider:
```typescript
render(
  <AuthProvider>
    <MyComponent />
  </AuthProvider>
);
```
**Date:** 2026-02-06

---

## Jest Issues

### Issue: ESM module errors
**Symptom:** `SyntaxError: Cannot use import statement outside a module`
**Fix:** Add to jest.config.js:
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(problematic-package)/)',
],
```
**Date:** 2026-02-06

### Issue: Mongoose connection in tests
**Symptom:** Tests hang or fail with connection errors
**Fix:** Use in-memory MongoDB or mock the entire model
**Date:** 2026-02-06

---

## Mock Issues

### Issue: Mock not resetting between tests
**Symptom:** Tests pass individually but fail together
**Fix:** Clear mocks in beforeEach:
```typescript
beforeEach(() => {
  vi.clearAllMocks();  // Vitest
  jest.clearAllMocks(); // Jest
});
```
**Date:** 2026-02-06

### Issue: Partial mock not working
**Symptom:** Unmocked methods throw errors
**Fix:** Use `vi.mock` with factory or `jest.requireActual`:
```typescript
vi.mock('../services/myService', async () => {
  const actual = await vi.importActual('../services/myService');
  return {
    ...actual,
    specificFunction: vi.fn(),
  };
});
```
**Date:** 2026-02-06

---

*Add new issues and fixes here as they're discovered*
