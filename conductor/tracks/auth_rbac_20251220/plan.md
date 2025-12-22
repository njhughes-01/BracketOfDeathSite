# Plan: Refine Authentication and Role-Based Access Control

## Phase 1: Backend RBAC Implementation
- [x] Task: Conductor - Analyze Existing Auth Middleware with codebase_investigator [7d63f16]
- [x] Task: Create tests for Role-Based Access Control Middleware [f50419d]
- [x] Task: Update Keycloak Middleware to Extract Roles [b0df20a]
- [x] Task: Create tests for Admin Route Guards [rbac-implementation]
- [x] Task: Implement Route Guards for Admin and SuperAdmin [rbac-implementation]
- [x] Task: Create tests for User Self-Update Endpoint [profile.test.ts]
- [x] Task: Secure /api/users/me Endpoint [/api/profile]
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend RBAC Implementation' (Protocol in workflow.md)

## Phase 2: Frontend RBAC Integration
- [ ] Task: Conductor - Analyze Frontend Auth State with codebase_investigator
- [ ] Task: Create tests for RequireRole Component
- [ ] Task: Implement RequireRole Component
- [ ] Task: Create tests for Navigation Bar Role Logic
- [ ] Task: Update Navigation Bar for Role-Based Links
- [ ] Task: Create tests for Admin Dashboard Access
- [ ] Task: Protect Admin Routes in React Router
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend RBAC Integration' (Protocol in workflow.md)

## Phase 3: Profile Management & Password Reset
- [ ] Task: Conductor - Analyze Keycloak Email Configuration with codebase_investigator
- [ ] Task: Create tests for Profile Update Component
- [ ] Task: Implement User Profile Update UI
- [ ] Task: Create tests for Password Reset Request Flow
- [ ] Task: Implement Password Reset Request UI
- [ ] Task: Configure Keycloak Email Settings (Mailjet)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Profile Management & Password Reset' (Protocol in workflow.md)
