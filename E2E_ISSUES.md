# Bracket of Death E2E Test Issues

**Generated:** 2026-02-05 21:55
**Last Updated:** 2026-02-06 04:52
**Total Issues:** 4 (All Resolved ✅)

## Summary

- 🔴 **Critical:** 0 (was 1)
- 🟠 **High:** 0 (was 2)
- 🟡 **Medium:** 0 (was 1)

## Fixes Applied

### Commit f19cf32: `fix: Register Now button uses apiClient with auth token`
- Replaced raw axios with apiClient in OpenTournaments.tsx
- Added `getOpenTournaments()`, `joinTournament()`, `getTournamentPlayerStats()` to api.ts

### Commit e6042a3: `fix: properly logout user when token refresh fails`
- Added `setLogoutHandler` export to api.ts
- Updated AuthContext to register logout handler
- 401 refresh failures now trigger proper logout

### Commit a9151ee: `fix: use id instead of _id for tournament identification`
- Fixed frontend using wrong field name (API returns `id`, not `_id`)

---

## Issues (All Resolved)

### ✅ BOD-001: Register Now button unresponsive on Open Events page

**Severity:** High → **Resolved**
**Flow:** Player Registration
**Status:** ~~Open~~ **Fixed**

**Root Cause:** OpenTournaments.tsx used raw `axios` instead of `apiClient`, lacking auth token.

**Fix:** Commit f19cf32 - switched to apiClient methods.

---

### ✅ BOD-002: Session logged out unexpectedly during navigation

**Severity:** High → **Resolved**
**Flow:** Tournament Creation
**Status:** ~~Open~~ **Fixed**

**Root Cause:** API interceptor didn't call `logout()` on failed 401 refresh.

**Fix:** Commit e6042a3 - added logout handler integration.

---

### ✅ BOD-003: Network error loading player stats on tournament manage page

**Severity:** Medium → **Resolved**
**Flow:** Tournament Management
**Status:** ~~Open~~ **Fixed**

**Root Cause:** Missing `getTournamentPlayerStats()` method in ApiClient.

**Fix:** Commit f19cf32 - added the missing method connecting to `/tournaments/:id/player-stats`.

---

### ✅ BOD-004: Register Now button non-functional even with Registration Open status

**Severity:** Critical → **Resolved**
**Flow:** Player Registration
**Status:** ~~Open~~ **Fixed**

**Root Cause:** 
1. Raw axios without auth (f19cf32)
2. Frontend used `_id` but API returns `id` (a9151ee)

**Fix:** Both commits above.

**Verification:** Successfully registered admin user to BOD #44 tournament. Database confirmed player in `registeredPlayers` array.

---

## Verification Results

**Test Date:** 2026-02-06 04:51 CST

| Step | Result |
|------|--------|
| Login as admin | ✅ Pass |
| Navigate to Open Events | ✅ Pass |
| View tournament cards (BOD #44, #46) | ✅ Pass |
| Click Register Now | ✅ Pass |
| Registration count updates (0→1) | ✅ Pass |
| Database entry created | ✅ Pass |

**All E2E issues resolved!** 🎉
