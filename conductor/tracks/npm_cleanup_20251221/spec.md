# Specification: NPM Dependency Cleanup

## Context
The project needs to ensure all npm packages are secure, supported, and necessary.

## Requirements
1.  **Branching:** Use a new branch `npm-cleanup` from `main`.
2.  **Audit:** Identify outdated and vulnerable packages.
3.  **Cleanup:** Remove unused dependencies.
4.  **Update:** Update core packages to stable versions.
5.  **Security:** Run `npm audit` and fix vulnerabilities.
6.  **Verification:** Test thoroughly to ensure no regressions.
7.  **Merge:** Commit changes and merge to main.

## Acceptance Criteria
-   `npm audit` returns zero high/critical vulnerabilities (or waivers are documented).
-   `package.json` contains only used dependencies.
-   Application builds and tests pass.
