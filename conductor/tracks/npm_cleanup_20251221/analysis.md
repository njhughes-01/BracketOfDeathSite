# NPM Dependency Analysis

## Unused Dependencies
The following packages appear to be unused (no imports found in `src/` or `scripts/`):
- `google-auth-library`: No occurrences found.

## Outdated Packages (Top Level)
| Package | Current | Wanted | Latest | Type |
| :--- | :--- | :--- | :--- | :--- |
| `express` | 4.21.2 | 4.22.1 | 5.2.1 | dependency |
| `mongoose` | 8.16.2 | 8.20.4 | 9.0.2 | dependency |
| `mongodb` | 6.17.0 | 6.21.0 | 7.0.0 | dependency |
| `helmet` | 7.2.0 | 7.2.0 | 8.1.0 | dependency |
| `typescript` | 5.8.3 | 5.9.3 | 5.9.3 | devDependency |
| `eslint` | 8.57.1 | 8.57.1 | 9.39.2 | devDependency |

## Recommendations
1.  **Remove:** `google-auth-library`.
2.  **Update (Safe):** `express` (to 4.22), `mongoose` (to 8.20), `mongodb` (to 6.21), `typescript`.
3.  **Update (Major - Requires Caution):**
    -   `express` to 5.x (Breaking changes possible).
    -   `mongoose` to 9.x (Breaking changes possible).
    -   `mongodb` to 7.x.
    -   `helmet` to 8.x.
    -   `eslint` to 9.x (Config format change).

## Plan
1.  Remove `google-auth-library`.
2.  Run `npm update` to get "Wanted" versions.
3.  Run `npm audit fix`.
4.  Test.

## Execution Log
-   **Removal:** `google-auth-library` removed.
-   **Update:** `npm update` ran successfully.
-   **Audit:** `npm audit` found 0 vulnerabilities.