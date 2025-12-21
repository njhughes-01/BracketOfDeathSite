---
description: Run comprehensive validation (Lint, Types, Unit Tests, Security, Build)
---

# Comprehensive Codebase Validation

This command executes a full suite of validation checks to ensure the codebase is healthy, secure, and production-ready.

## Phase 1: Static Analysis (Linting & Types)

First, we ensure code quality and type safety across both Backend and Frontend.

```bash
echo "🔍 Starting Phase 1: Static Analysis..."

# 1. Backend Linting
echo "  > Linting Backend..."
npm run lint

# 2. Backend Type Checking
echo "  > Type Checking Backend..."
npx tsc --noEmit

# 3. Frontend Linting
echo "  > Linting Frontend..."
cd src/frontend && npm run lint

# 4. Frontend Type Checking
echo "  > Type Checking Frontend..."
npx tsc -b
cd ../..

echo "✅ Phase 1 Complete!"
```

## Phase 2: Unit & Security Testing

Next, we run the unit test suites. This includes the backend logic, frontend components, and the critical security verification suite.

```bash
echo "🧪 Starting Phase 2: Testing..."

# 1. Backend Unit Tests (Jest)
# Covers: Controllers, Models, Services, Utilities (Tennis Validation)
echo "  > Running Backend Unit Tests..."
npm test

# 2. Frontend Unit Tests (Vitest)
# Covers: React Components (MatchScoring, etc.), Utils
echo "  > Running Frontend Unit Tests..."
cd src/frontend && npm test -- --run
cd ../..

# 3. Security Verification (Vitest)
# Covers: VULN-001 (Proxy), VULN-002 (Creds), VULN-003 (Storage)
echo "  > Running Security Verification Suite..."
npx vitest run tests/security/auth_security_fixed.test.ts

echo "✅ Phase 2 Complete!"
```

## Phase 3: Build Verification

Finally, we verify that the application builds successfully for production.

```bash
echo "🏗️ Starting Phase 3: Production Build..."

# 1. Backend Build
echo "  > Building Backend..."
npm run build

# 2. Frontend Build
echo "  > Building Frontend..."
cd src/frontend && npm run build
cd ../..

echo "✅ Phase 3 Complete!"
```

## Phase 4: Integration (Optional / Requires Env)

These tests require a running Docker environment (`docker-compose up`).

```bash
# Only run if you have the stack up and running
# echo "🚀 Starting Phase 4: Integration..."
#
# 1. Playwright E2E
# cd src/frontend && npx playwright test
#
# 2. Lifecycle Script (Requires Admin Token)
# node scripts/verify_full_lifecycle.js <YOUR_ADMIN_TOKEN>
```

## validation Summary

If all phases passed:
1.  **Code Style & Safety:** ✅ Verified
2.  **Business Logic:** ✅ Verified (Tennis rules, Tournament lifecycle)
3.  **Security:** ✅ Verified (No default creds, protected proxy, secure tokens)
4.  **Build Integrity:** ✅ Verified (Backend and Frontend compile)