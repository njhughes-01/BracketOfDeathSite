# Coordination Lessons Learned

Track what works and what doesn't when coordinating development.

## Table of Contents
- [Successful Patterns](#successful-patterns)
- [Failed Patterns](#failed-patterns)
- [Dependency Management](#dependency-management)

---

## Successful Patterns

### Backend-First Development
**When:** Building new features with both API and UI
**Pattern:** Complete and test backend API before starting frontend
**Why:** Frontend team has stable API to work against, fewer integration issues
**Date:** 2026-02-06

### TDD for Complex Logic
**When:** Business logic in services or complex UI state
**Pattern:** Write tests first, then implementation
**Why:** Catches edge cases early, provides documentation
**Date:** 2026-02-06

---

## Failed Patterns

### Parallel Backend+Frontend Without Contract
**What happened:** Frontend built against assumed API shape, had to refactor
**Fix:** Always document API contract before parallel work
**Date:** 2026-02-05

---

## Dependency Management

### Model Changes Require Cascade Updates
When changing a Mongoose model:
1. Update model interface
2. Update any types that extend it
3. Update controllers using the model
4. Update frontend TypeScript interfaces
5. Update tests

### Route Changes Require Frontend Updates
When adding/modifying API routes:
1. Update backend routes
2. Update apiClient in frontend
3. Update any components using that endpoint
4. Update related tests

---

## Task Breakdown Tips

### Good Task Sizes
- Single model + controller + routes = 1 task
- Single page with 2-3 components = 1 task
- Complex component with tests = 1 task

### Too Large
- "Build entire payment system" - break into checkout, tickets, scanner, etc.

### Too Small
- "Add a button" - combine with related changes

---

*Add new lessons here as they're discovered*
