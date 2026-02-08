# Backend Known Issues & Fixes

## Table of Contents
- [Mongoose Issues](#mongoose-issues)
- [TypeScript Issues](#typescript-issues)
- [Auth Issues](#auth-issues)

---

## Mongoose Issues

### Issue: Virtual properties not in interface
**Symptom:** TypeScript errors when accessing virtuals like `isValid`, `remainingSeconds`
**Fix:** Add virtuals and methods to the Document interface:
```typescript
export interface IMyModel extends Document {
  // Fields
  name: string;
  
  // Virtuals - must be declared
  isActive: boolean;
  
  // Methods - must be declared
  activate(): Promise<void>;
}
```
**Date:** 2026-02-06

### Issue: `_id` vs `id` confusion
**Symptom:** Frontend can't find IDs, TypeScript mismatches
**Fix:** Mongoose virtuals provide `id` (string). Use `id` in interfaces, not `_id`:
```typescript
// Mongoose automatically creates 'id' virtual from '_id'
// Always use 'id' in TypeScript interfaces for API responses
interface ApiResponse {
  id: string;  // Not _id
}
```
**Date:** 2026-02-05

### Issue: Hidden fields not loading
**Symptom:** Fields marked `select: false` return undefined
**Fix:** Use `.select('+fieldName')` to explicitly include:
```typescript
const settings = await SystemSettings.findOne().select('+secretKey +apiKey');
```
**Date:** 2026-02-06

---

## TypeScript Issues

### Issue: sendSuccess pagination type mismatch
**Symptom:** TypeScript error on sendSuccess with status code
**Fix:** Pass `undefined` for pagination when using custom status:
```typescript
// Wrong
this.sendSuccess(res, data, "Created", 201);

// Correct
this.sendSuccess(res, data, "Created", undefined, 201);
```
**Date:** 2026-02-06

### Issue: Stripe API version mismatch
**Symptom:** Type error on apiVersion
**Fix:** Use the version from the installed SDK:
```typescript
// Check node_modules/stripe/types/index.d.ts for correct version
const STRIPE_API_VERSION = '2026-01-28.clover' as const;
```
**Date:** 2026-02-06

---

## Auth Issues

### Issue: User ID extraction
**Symptom:** Can't get user ID from request
**Fix:** Check both `sub` (Keycloak) and `id` (test mode):
```typescript
const userId = (req as any).user?.sub || (req as any).user?.id;
```
**Date:** 2026-02-06

---

*Add new issues and fixes here as they're discovered*
