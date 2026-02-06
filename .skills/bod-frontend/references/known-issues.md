# Known Issues & Fixes

Track bugs encountered and their solutions for future reference.

## Table of Contents
- [API Client Issues](#api-client-issues)
- [Auth Issues](#auth-issues)
- [Component Issues](#component-issues)
- [Build Issues](#build-issues)

---

## API Client Issues

### Issue: Using raw axios instead of apiClient
**Symptom:** 401 errors not triggering logout, no auth headers
**Fix:** Always import and use `apiClient` from `services/apiClient.ts`
```typescript
// Wrong
import axios from 'axios';
const { data } = await axios.get('/api/tournaments');

// Correct
import apiClient from '../services/apiClient';
const { data } = await apiClient.get<Tournament[]>('/tournaments');
```
**Date:** 2026-02-05

### Issue: Using `_id` instead of `id`
**Symptom:** TypeScript errors, undefined values when accessing IDs
**Fix:** Mongoose virtuals return `id`, not `_id`. Update interfaces:
```typescript
// Wrong
interface Tournament {
  _id: string;
}

// Correct
interface Tournament {
  id: string;
}
```
**Date:** 2026-02-05

---

## Auth Issues

### Issue: Token not refreshing on 401
**Symptom:** Users stuck on login, 401 errors in console
**Fix:** Ensure apiClient interceptor calls logout handler
**Date:** 2026-02-05

---

## Component Issues

### Issue: Console.log in production
**Symptom:** Sensitive data in browser console
**Fix:** Use `logger` utility instead of `console.log`:
```typescript
import logger from '../utils/logger';
logger.info('message'); // Only logs in development
```
**Date:** 2026-02-06

---

## Build Issues

### Issue: Import paths from subdirectories
**Symptom:** Module not found errors for files in `pages/admin/` or `services/`
**Fix:** Use correct relative paths:
```typescript
// From src/frontend/src/pages/admin/SomePage.tsx
import apiClient from '../../services/apiClient';  // Two levels up
import logger from '../../utils/logger';
```
**Date:** 2026-02-06

---

*Add new issues and fixes here as they're discovered*

## How to Add Issues

When you encounter and fix a bug:

1. Add a new section with:
   - **Issue title** (brief description)
   - **Symptom** (what the user/developer sees)
   - **Fix** (code example or explanation)
   - **Date** (when discovered)

2. Categorize under the appropriate heading

3. This helps future agents avoid the same mistakes
