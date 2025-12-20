# Specification: Refine Authentication and Role-Based Access Control

## Context
The project currently uses Keycloak for authentication, but the integration needs refinement to fully support the defined role-based access control (RBAC) model. We need to ensure that Super Admins, Admins, and Users have the correct permissions and that the frontend strictly enforces these roles. Additionally, the user profile management and password reset flows need to be secured and streamlined.

## Goals
1.  **Enforce RBAC:** Implement robust role checks in both the backend API and frontend UI to distinguish between Super Admins, Admins, and Users.
2.  **Secure Profile Management:** Allow users to update their own profiles (and only their own) securely.
3.  **Streamline Password Reset:** Integrate a reliable password reset flow via Keycloak and email notifications.
4.  **Audit & Logging:** Ensure critical authentication events and permission changes are logged.

## Technical Requirements
-   **Backend:**
    -   Update Keycloak middleware to correctly parse and validate roles from JWTs.
    -   Implement route guards for `/admin` (Admin/Super Admin) and `/superadmin` (Super Admin) endpoints.
    -   Ensure the `/api/users/me` endpoint is secure and allows self-service updates.
-   **Frontend:**
    -   Implement a `RequireRole` component to protect routes based on user roles.
    -   Update the navigation bar to conditionally render links based on the current user's role.
    -   Create UI for profile updates and password reset requests.
-   **Keycloak:**
    -   Verify Realm configuration for roles (SuperAdmin, Admin, User).
    -   Ensure email settings are configured (using Mailjet as per product guide) for password resets.

## User Stories
-   As a **Super Admin**, I want to be the only one who can manage global settings and other admins.
-   As an **Admin**, I want to manage tournaments and players but not global system settings.
-   As a **Player (User)**, I want to log in, view my stats, and update my profile without accessing admin features.
-   As a **User**, I want to easily reset my password if I forget it, receiving a secure link via email.

## Out of Scope
-   Social login integration (Google/Facebook) - Deferred to a later track.
-   Two-factor authentication (2FA) - Deferred to a later track.
