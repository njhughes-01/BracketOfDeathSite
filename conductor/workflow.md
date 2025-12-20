# Project Workflow

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in `plan.md`
2. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` *before* implementation
3. **Test-Driven Development:** Write unit tests before implementing functionality
4. **High Code Coverage:** Aim for >80% code coverage for all modules
5. **User Experience First:** Every decision should prioritize user experience
6. **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools (tests, linters) to ensure single execution.
7. **Leverage AI Context:** Use the `codebase_investigator` for system-wide analysis and the `save_memory` tool to persist critical user preferences and project-specific facts.

## Task Workflow

All tasks follow a strict lifecycle:

### Standard Task Workflow

1. **Select Task:** Choose the next available task from `plan.md` in sequential order. Use `codebase_investigator` to understand the impact of the task on the existing codebase.

2. **Mark In Progress:** Before beginning work, edit `plan.md` and change the task from `[ ]` to `[~]`

3. **Write Failing Tests (Red Phase):**
   - Create a new test file for the feature or bug fix.
   - Write one or more unit tests that clearly define the expected behavior and acceptance criteria for the task.
   - **CRITICAL:** Run the tests and confirm that they fail as expected. This is the "Red" phase of TDD. Do not proceed until you have failing tests.

4. **Implement to Pass Tests (Green Phase):**
   - Write the minimum amount of application code necessary to make the failing tests pass.
   - Run the test suite again and confirm that all tests now pass. This is the "Green" phase.

5. **Refactor (Optional but Recommended):**
   - With the safety of passing tests, refactor the implementation code and the test code to improve clarity, remove duplication, and enhance performance without changing the external behavior.
   - Rerun tests to ensure they still pass after refactoring.

6. **Verify Coverage:** Run coverage reports using the project's chosen tools.
   ```bash
   npm run test:coverage
   ```
   Target: >80% coverage for new code.

7. **Document Deviations:** If implementation differs from tech stack:
   - **STOP** implementation
   - Update `tech-stack.md` with new design
   - Add dated note explaining the change
   - Resume implementation

8. **Commit Code Changes:**
   - Stage all code changes related to the task.
   - Propose a clear, concise commit message e.g, `feat(ui): Create basic HTML structure for calculator`.
   - Perform the commit.

9. **Attach Task Summary with Git Notes:**
   - **Step 9.1: Get Commit Hash:** Obtain the hash of the *just-completed commit* (`git log -1 --format="%H"`).
   - **Step 9.2: Draft Note Content:** Create a detailed summary for the completed task. This should include the task name, a summary of changes, a list of all created/modified files, and the core "why" for the change.
   - **Step 9.3: Attach Note:** Use the `git notes` command to attach the summary to the commit.
     ```bash
     git notes add -m "<note content>" <commit_hash>
     ```

10. **Get and Record Task Commit SHA:**
    - **Step 10.1: Update Plan:** Read `plan.md`, find the line for the completed task, update its status from `[~]` to `[x]`, and append the first 7 characters of the *just-completed commit's* commit hash.
    - **Step 10.2: Write Plan:** Write the updated content back to `plan.md`.

11. **Commit Plan Update:**
    - **Action:** Stage the modified `plan.md` file.
    - **Action:** Commit this change with a descriptive message (e.g., `conductor(plan): Mark task 'Create user model' as complete`).

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** This protocol is executed immediately after a task is completed that also concludes a phase in `plan.md`.

1.  **Announce Protocol Start:** Inform the user that the phase is complete and the verification and checkpointing protocol has begun.

2.  **Ensure Test Coverage for Phase Changes:**
    -   **Step 2.1: Determine Phase Scope:** Find the Git commit SHA of the *previous* phase's checkpoint.
    -   **Step 2.2: List Changed Files:** Execute `git diff --name-only <previous_checkpoint_sha> HEAD`.
    -   **Step 2.3: Verify and Create Tests:** Ensure every code file has a corresponding test.

3.  **Execute Automated Tests with Proactive Debugging:**
    -   Announce and run the test suite: `CI=true npm test`.
    -   If tests fail, debug and fix (max 2 attempts).

4.  **Propose a Detailed, Actionable Manual Verification Plan:**
    -   Generate a step-by-step plan for the user to verify the changes manually.

5.  **Await Explicit User Feedback:**
    -   Wait for a "yes" or feedback before proceeding.

6.  **Create Checkpoint Commit:**
    -   Stage all changes and commit: `conductor(checkpoint): Checkpoint end of Phase X`.

7.  **Attach Auditable Verification Report using Git Notes:**
    -   Attach the report to the checkpoint commit using `git notes`.

8.  **Get and Record Phase Checkpoint SHA:**
    -   Update `plan.md` with the checkpoint SHA: `[checkpoint: <sha>]`.

9. **Commit Plan Update:**
    -   Commit the `plan.md` update.

10.  **Announce Completion:** Inform the user that the phase is complete.

## Quality Gates

Before marking any task complete, verify:
- [ ] All tests pass (`npm test`)
- [ ] Code coverage meets requirements (>80%)
- [ ] Code follows project's code style guidelines (`npm run lint`)
- [ ] All public functions/methods are documented
- [ ] Type safety is enforced (`npm run build`)
- [ ] Works correctly on mobile
- [ ] Documentation updated if needed
- [ ] No security vulnerabilities introduced

## Development Commands

### Setup
```bash
npm install
npm run setup
```

### Daily Development
```bash
npm run dev
npm test
npm run lint
```

### Before Committing
```bash
npm run lint:fix
npm run build
npm test
```

## Testing Requirements

### Unit Testing
- Every module must have corresponding tests using Jest.
- Target success and failure cases.
- Mock external dependencies (MongoDB, Keycloak).

### Integration Testing
- Test complete user flows using Playwright for E2E.
- Verify database transactions and authentication flows.

### Mobile Testing
- Verify responsive layouts using browser developer tools.
- Test touch interactions for score entry.

## Commit Guidelines

### Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Maintenance tasks

## Definition of Done

A task is complete when:
1. All code implemented to specification
2. Unit tests written and passing
3. Code coverage meets requirements
4. Documentation complete
5. Code passes linting and build checks
6. Works beautifully on mobile
7. Implementation notes added to `plan.md`
8. Changes committed with proper message
9. Git note with task summary attached to the commit

