## Code Review

This pull request correctly addresses a security vulnerability by switching from stripping HTML to escaping it, and fixes a type error on the Rankings page. The accompanying test for the sanitization function is also updated correctly.

My review includes two main points:
1.  In `Rankings.tsx`, the API response handling can be made more robust by checking the `success` flag from the API response.
2.  In `sanitization.test.ts`, while the added test case is good, I recommend expanding the test suite for the `sanitizeString` function to cover more XSS attack vectors, given its security-critical nature.

Additionally, I've noticed that this PR addresses only some of the issues mentioned in the `review_details_cycle_2.md` file, which was also added in this PR. Several critical issues, such as hardcoded credentials, remain unaddressed. It would be beneficial to tackle these in subsequent pull requests.
