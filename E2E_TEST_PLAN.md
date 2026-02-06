# Bracket of Death E2E Test Plan

**Goal:** Verify all features work before version release

## Test Categories

### 1. Authentication Flows
- [ ] Direct login (username/password)
- [ ] Keycloak SSO login
- [ ] New user registration
- [ ] Password reset flow
- [ ] Session persistence after navigation
- [ ] Logout functionality

### 2. Tournament Management (Admin)
- [ ] Create tournament (all wizard steps)
- [ ] Edit tournament details
- [ ] Delete tournament
- [ ] Change tournament status
- [ ] Player assignment (manual)
- [ ] Open registration setup

### 3. Tournament Execution
- [ ] Generate teams/seeding
- [ ] Generate matches (all rounds)
- [ ] Enter match scores
- [ ] Confirm match results
- [ ] View live stats
- [ ] Complete tournament

### 4. Player Registration (Open Events)
- [ ] View open tournaments list
- [ ] Self-register for tournament
- [ ] Join waitlist (when full)
- [ ] View registration status

### 5. Player Management
- [ ] View players list
- [ ] Search/filter players
- [ ] View player profile
- [ ] View player stats/history
- [ ] Edit player (admin)

### 6. Tournament Viewing (Public)
- [ ] View tournament list
- [ ] View tournament details
- [ ] View bracket
- [ ] View standings
- [ ] View match schedule

### 7. User Profile
- [ ] View own profile
- [ ] Link to player profile
- [ ] Complete onboarding
- [ ] Update profile settings

### 8. Admin Functions
- [ ] System settings
- [ ] User management
- [ ] Email configuration

### 9. Edge Cases & Validation
- [ ] Form validation errors
- [ ] API error handling
- [ ] Empty states
- [ ] Loading states

---

## Test Status

| Category | Tested | Passed | Failed | Notes |
|----------|--------|--------|--------|-------|
| Auth (Keycloak SSO) | ✅ | 1/1 | 0 | SSO login works |
| Auth (Direct) | ⚠️ | - | - | Session expiry by design (security) |
| Tournament Mgmt | ✅ | 4/4 | 0 | Create/Edit/Status/Players |
| Tournament Exec | ✅ | 5/5 | 0 | All rounds completed |
| Open Registration | ✅ | 2/2 | 0 | Register + view |
| Player Mgmt | ✅ | 3/3 | 0 | List/Search/Profile |
| Tournament View | ✅ | 4/4 | 0 | Overview/Standings/Matches/Bracket |
| Player History | ✅ | 2/2 | 0 | Stats + Tournament results |
| User Profile | ✅ | 3/3 | 0 | View/Roles/Sign out |
| Admin Dashboard | ✅ | 5/5 | 0 | Overview/Tournaments/Users/Settings |
| Edge Cases | ⏳ | | | Deferred to production testing |

---

## Issues Found

### Fixed
- BOD-001: Register Now button unresponsive → Fixed (apiClient)
- BOD-002: Session logout during navigation → Fixed (logout handler)
- BOD-003: Network error loading player stats → Fixed (missing API method)
- BOD-004: Register button with wrong ID → Fixed (_id vs id)
- BOD-005: Null player in stats calculation → Fixed (null safety)

### Open
- None currently

---

## Next Steps
1. Test player management flows
2. Test public tournament viewing
3. Test user onboarding/profile
4. Test admin settings
5. Test edge cases
