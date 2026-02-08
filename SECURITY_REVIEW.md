# Security Review — BracketOfDeathSite (feature/phase4-stripe)

**Date:** 2026-02-07  
**Reviewer:** Automated Security Audit  
**Branch:** feature/phase4-stripe

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 2 (FIXED) |
| MEDIUM   | 4     |
| LOW      | 3     |

---

## Findings

### HIGH-1: Webhook Signature Bypass in Production ✅ FIXED

- **Severity:** HIGH
- **File:** `src/backend/controllers/StripeWebhookController.ts:30-42`
- **Description:** When `STRIPE_WEBHOOK_SECRET` was not configured OR `stripe-signature` header was missing, the webhook accepted and processed unverified payloads. An attacker could forge webhook events to create fake tickets, mark payments as complete, or trigger refunds.
- **Fix Applied:** Webhook now rejects requests in production when secret is missing, and always rejects requests without `stripe-signature` header when secret is configured. Dev-only bypass is gated on `NODE_ENV !== 'production'`.

### HIGH-2: Webhook Error Response Leaked Internal Details ✅ FIXED

- **Severity:** HIGH
- **File:** `src/backend/controllers/StripeWebhookController.ts:78`
- **Description:** The webhook returned `error.message` in the 200 response body when processing failed. This could leak internal error details (stack traces, DB errors) to anyone sending requests to the webhook endpoint.
- **Fix Applied:** Removed `error` field from the 200 response. Errors are still logged server-side.

---

### MEDIUM-1: Hardcoded Default Passwords in docker-compose.yml

- **Severity:** MEDIUM
- **File:** `docker-compose.yml:37,50,92`
- **Description:** Default passwords for Keycloak DB (`keycloak123`) and MongoDB (`bodpassword123`) are hardcoded as fallback values. If operators deploy without setting environment variables, these weak defaults are used.
- **Recommendation:** Remove default values and fail fast if env vars are not set. Add a startup check or use the secrets-init service to enforce credential generation.

### MEDIUM-2: Rate Limiting Too Permissive

- **Severity:** MEDIUM
- **File:** `src/backend/server.ts:37-41`
- **Description:** Global rate limit is 1000 requests per 15 minutes per IP. No endpoint-specific rate limiting on sensitive operations:
  - Checkout session creation (`POST /api/checkout/create-session`)
  - Discount code validation (`POST /api/discount-codes/validate`)
  - Slot reservation (`POST /api/tournaments/:id/reserve`)
  - Ticket resend (`POST /api/tickets/:id/resend`) — has app-level limit of 5 but no rate limit
- **Recommendation:** Add stricter rate limits (e.g., 10/min) on checkout, reservation, and discount validation endpoints.

### MEDIUM-3: Slot Reservation DoS Potential

- **Severity:** MEDIUM
- **File:** `src/backend/controllers/CheckoutController.ts` (reserveSlot)
- **Description:** A malicious authenticated user could reserve slots across multiple tournaments to block legitimate registrations. Reservations expire after timeout, but the user could re-reserve. No per-user limit on concurrent active reservations across tournaments.
- **Recommendation:** Add a limit on concurrent active reservations per user (e.g., max 3).

### MEDIUM-4: Auth Debug Info in Non-Production

- **Severity:** MEDIUM
- **File:** `src/backend/middleware/auth.ts:232-234`
- **Description:** When `NODE_ENV !== 'production'`, failed auth returns a `debug` field with the JWT error message. If staging/dev environments are internet-accessible, this leaks auth implementation details.
- **Recommendation:** Only include debug info when `NODE_ENV === 'development'` (not just non-production).

---

### LOW-1: Test Mode Auth Bypass

- **Severity:** LOW
- **File:** `src/backend/middleware/auth.ts:186-199`
- **Description:** When `NODE_ENV === 'test'` and `x-test-mode: true` header is sent, authentication is completely bypassed with arbitrary user identity including admin roles. This is standard test practice and properly gated on `NODE_ENV === 'test'`, but ensure NODE_ENV is never `test` in deployed environments.
- **Recommendation:** Add an additional safeguard like checking for a test-only env var.

### LOW-2: Checkout Session Status Lacks Ownership Check

- **Severity:** LOW
- **File:** `src/backend/controllers/CheckoutController.ts:420-470`
- **Description:** `GET /api/checkout/session/:sessionId` requires auth but does not verify the requesting user owns the session. Any authenticated user with a valid Stripe session ID could view another user's checkout status, including email and metadata.
- **Recommendation:** Verify `session.metadata.userId` matches the requesting user (or allow admin override).

### LOW-3: Transaction Log Exposes stripePaymentIntentId

- **Severity:** LOW
- **File:** `src/backend/controllers/TicketController.ts` (getTournamentTransactions)
- **Description:** The admin transaction log returns `stripePaymentIntentId` in the response. While this is admin-only, it's unnecessary data exposure.
- **Recommendation:** Omit Stripe internal IDs from API responses unless specifically needed.

---

## Areas Reviewed — No Issues Found

### Secrets & Environment ✅
- `.env` is in `.gitignore` (lines 6-8, 20)
- No hardcoded Stripe secret keys in source code (only in test fixtures with `sk_test_123`)
- Frontend only uses `VITE_KEYCLOAK_*` and `VITE_API_URL` — no secret keys exposed
- `stripeSecretKey` field in SystemSettings model uses `select: false` to hide from default queries
- Publishable key is the only Stripe key exposed to frontend (via `getPublishableKey()`)
- Git history: only test fixture values (`sk_test_123`, `sk_test_db`) — no real keys

### Authentication & Authorization ✅
- All admin routes protected by `requireAdmin`
- All superadmin routes (Stripe settings, platform fee) protected by `requireSuperAdmin`
- Superadmin implicitly includes admin access
- JWT validation uses JWKS (RS256) with Keycloak, proper issuer and `azp` validation
- Ticket ownership verified — users can only access their own tickets (`getTicket` checks `ticket.userId`)
- Reservation ownership verified — `createCheckoutSession` and `cancelReservation` check `reservation.userId`

### Stripe Security ✅
- Webhook uses `raw({ type: "application/json" })` for raw body parsing (correct for signature verification)
- Webhook route mounted before body parser middleware
- Checkout amounts come from DB (`tournament.entryFee`, `tournament.earlyBirdFee`) — not user input
- Discount codes validated server-side with DB lookup
- Connect destination charges use server-side platform fee from SystemSettings

### Input Validation ✅
- MongoDB ObjectId validation on all ID parameters (`Types.ObjectId.isValid()`)
- Express-validator used on registration routes
- `sanitizeInput` middleware applied globally
- No `dangerouslySetInnerHTML` found in frontend code
- Discount codes validated server-side with proper `isUsable` and `appliesToTournament` checks

### CORS ✅
- CORS configured with explicit origin whitelist from `CORS_ORIGIN` env var
- Credentials mode enabled
- Helmet security headers applied

### Dependencies ✅
- `npm audit` — 0 vulnerabilities (root)
- `npm audit` — 0 vulnerabilities (frontend)

---

## Recommendations Summary

| Priority | Action |
|----------|--------|
| Done | Hardened webhook signature verification |
| Done | Removed error leaking from webhook response |
| Should Do | Add endpoint-specific rate limits on checkout/reservation/discount endpoints |
| Should Do | Add per-user concurrent reservation limit |
| Should Do | Remove default passwords from docker-compose.yml |
| Nice to Have | Add ownership check to checkout session status endpoint |
| Nice to Have | Restrict debug auth info to development only |
