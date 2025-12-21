## Code Review

This pull request successfully addresses its stated goals by updating dependencies to mitigate security vulnerabilities, fixing a bug in the `Rankings.tsx` component's data fetching logic, and correcting an XSS-related test case. The changes are accurate and improve the codebase.

However, a broader review of the related files has uncovered several important issues that fall outside the scope of the current diff but are highly relevant to the PR's goal of improving security and quality. Since I cannot add comments directly to unchanged files, I am listing them here:

*   **Critical Security Vulnerability in `docker-compose.yml`**: The file contains hardcoded default credentials for Keycloak, MongoDB, and the backend service (e.g., `keycloak123`, `bodpassword123`). This poses a significant security risk if this configuration is ever used in a non-local environment. It is strongly recommended to remove these default values and rely exclusively on environment variables loaded from a `.env` file, with a `.env.example` file provided for developers.

*   **High - Broken Test in `src/frontend/src/pages/__tests__/Rankings.test.tsx`**: The test case 'updates year filter' is outdated. It attempts to find a `<select>` element, but the UI has been updated to use the new `<YearRangeInput />` component, which renders an `<input type="text">`. This test will fail and needs to be updated to reflect the new implementation, ensuring the new filtering functionality is properly tested.

*   **Medium - Maintainability Issues (Magic Numbers)**:
    *   In `src/backend/utils/sanitization.ts`, the `parseYearFilter` function uses magic numbers for validation (e.g., `2000`, `2100`, `5`). These should be extracted into named constants to improve readability and maintainability.
    *   Similarly, in `src/backend/controllers/TournamentResultController.ts`, the `getAvailableYears` method uses a magic number `2008` as a default. This should also be a named constant.

*   **Medium - Missing Test Coverage in `src/backend/tests/unit/TournamentResultController.test.ts`**: While tests exist for `getLeaderboard`, the new `getAvailableYears` method in the controller is not covered by any unit tests. Test cases for success, no data, and error scenarios should be added to ensure its reliability.

Addressing these points would significantly improve the security, correctness, and maintainability of the application.
## Code Review

This pull request addresses several issues, including dependency upgrades to mitigate security vulnerabilities, a fix for an XSS-related test, and a type error correction on the Rankings page. The changes are well-implemented and correctly resolve the stated problems. My review includes one suggestion to improve the clarity of a test description to align with the updated sanitization logic.
