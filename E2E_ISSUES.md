# Bracket of Death E2E Test Issues

**Generated:** 2026-02-05 21:55
**Total Issues:** 4

## Summary

- 🔴 **Critical:** 1
- 🟠 **High:** 2
- 🟡 **Medium:** 1

## Issues

### 🟠 BOD-001: Register Now button unresponsive on Open Events page

**Severity:** High
**Flow:** Player Registration
**Status:** Open

**Steps to Reproduce:**
1. Login as admin
2. Create tournament with Open Registration
3. Navigate to Open Events
4. Click 'Register Now' on tournament card

**Expected:** Registration modal or form should appear

**Actual:** Nothing happens - button click has no visible effect

---

### 🟠 BOD-002: Session logged out unexpectedly during navigation

**Severity:** High
**Flow:** Tournament Creation
**Status:** Open

**Steps to Reproduce:**
1. Login as admin
2. Create tournament successfully
3. Navigate to Open Events
4. Click tournament card or navigate to /tournaments
5. User is logged out and shown login page

**Expected:** User should remain logged in while navigating

**Actual:** User session ends and is redirected to login page

---

### 🟡 BOD-003: Network error loading player stats on tournament manage page

**Severity:** Medium
**Flow:** Tournament Management
**Status:** Open

**Steps to Reproduce:**
1. Login as admin
2. Navigate to tournament manage page
3. View Player Leaderboard section

**Expected:** Player stats should load

**Actual:** Shows 'Network error loading player stats'

---

### 🔴 BOD-004: Register Now button non-functional even with Registration Open status

**Severity:** Critical
**Flow:** Player Registration
**Status:** Open

**Steps to Reproduce:**
1. Create tournament with Open Registration type
2. Change tournament status to 'Registration Open' via manage page
3. Navigate to Open Events page
4. Click 'Register Now' button on tournament card

**Expected:** Registration modal/form should appear allowing user to sign up

**Actual:** Button click has no effect - no modal, no navigation, no console errors visible

---

