
# Walkthrough: System Settings & Build Fixes & Onboarding Updates

This roadmap documents the implementation of the System Settings feature, resolution of build errors, and recent updates to the Onboarding flow.

## Onboarding Updates

We modified the onboarding process to improve user experience and support non-player accounts.

### 1. Simplified Onboarding Form
*   **Remove Bracket Preference**: Removed the requirement for users to select a bracket preference during onboarding. This field is no longer mandatory for profile completion.
*   **Frontend**: Updated `Onboarding.tsx` to remove the input field and validation.
*   **Backend**: Updated `ProfileController.ts` to make `bracketPreference` optional during updates and profile completeness checks.

### 2. Admin Exemption
*   **Skip Onboarding**: Only **Super Admins** (specifically the 'admin' user or the bootstrap account) are automatically considered "complete" and bypass the onboarding flow.
*   **Rationale**: This prevents the system `admin` account from being forced to create a dummy player profile, while still ensuring all other administrators and users complete the necessary profile steps.
*   **Implementation**: Updated logic in `ProfileController.ts`'s `getProfile` method to set `isComplete: true` only if `username === 'admin'` (or configured admin user).

## System Settings Implementation

We implemented a secure way for Super Admins to manage system configurations, primarily focusing on Mailjet API credentials.

### Backend Changes

1.  **SystemSettings Model**: Created `src/backend/models/SystemSettings.ts`.
    *   Stores `mailjetApiKey`, `mailjetApiSecret`, and `mailjetSenderEmail`.
    *   Uses `{ select: false }` for API keys to prevent accidental exposure.
    *   `getInstance()` static method to ensure a singleton-like pattern.

2.  **SettingsController**: Created `src/backend/controllers/SettingsController.ts`.
    *   `getSettings`: Returns configuration status (masked keys).
    *   `updateSettings`: Updates keys and sender email.

3.  **Middleware & Security**:
    *   Updated `src/backend/middleware/auth.ts` with `requireSuperAdmin`.
    *   Ensures only the designated admin (via `KEYCLOAK_ADMIN_USER` or 'admin') can access settings.

4.  **Mailjet Service**:
    *   Refactored `src/backend/services/MailjetService.ts`.
    *   Prioritizes database settings over environment variables.

### Frontend Changes

1.  **Settings Page**: Created `src/frontend/src/pages/admin/Settings.tsx`.
    *   Allows Admins to view status and update Mailjet credentials.
    *   Protected by `SYSTEM_MANAGE_SETTINGS` permission.

2.  **API Integration**:
    *   Updated `src/frontend/src/services/api.ts` with `getSystemSettings` and `updateSystemSettings`.
    *   Defined `SystemSettings` interface.

3.  **Navigation**:
    *   Updated `Layout.tsx` and `Admin.tsx` to link to the new Settings page.
    *   Conditionally rendered based on permissions.

## Build Fixes & Type Alignment

We addressed 22+ build errors preventing the frontend from compiling.

### Key Fixes

1.  **User Name Handling**:
    *   Updated `Header.tsx` and `Profile.tsx` to use `user.fullName || user.username` instead of `user.name`.

2.  **Player Type Alignment**:
    *   Updated `types/api.ts` to include optional fields (`firstName`, `lastName`, `nickname`, `email`, `isActive`) in `Player` and `PlayerInput` interfaces.
    *   This resolved type errors in `Profile.tsx` and `PlayerEdit.tsx`.

3.  **Tournament Types**:
    *   Added `registrationType` to `TournamentInput` and usage in `TournamentEdit.tsx` / `TournamentSetup.tsx`.

4.  **Profile Stats**:
    *   Fixed `useApi` typing in `Profile.tsx` to correctly handle `ApiResponse` and null fallbacks.

5.  **Vite Configuration**:
    *   Updated `vite.config.ts` to use `defineConfig` from `vitest/config` to support the `test` configuration block without type errors.

## Verification

*   **Frontend Build**: `npm run build` passes successfully.
*   **Tests**: `Onboarding.test.tsx` passes with the removal of bracket preference.
*   **Security Checks**: API endpoints for settings are protected by Super Admin middleware.
