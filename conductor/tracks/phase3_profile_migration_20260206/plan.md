# Plan: Phase 3 - Profile Management, Password Reset & Data Migration

## Overview
Complete the auth/RBAC track Phase 3 (profile updates, password reset UI, email config) and implement the DataMigrationController to import 43 historical tournament JSON files (2009-2024).

---

## Phase 3A: Profile Management & Password Reset

### 3A.1: Password Reset Flow (Frontend Already Exists)
- [x] ForgotPasswordModal component exists and calls `/auth/forgot-password`
- [x] Backend endpoint `publicRequestPasswordReset` exists in UserController
- [x] ChangePasswordModal component exists and integrated in Profile page
- [x] ForgotPasswordModal is wired into Login page (Login.tsx:10,282,354)
- [ ] Task: Test password reset flow end-to-end (requires email config)

### 3A.2: Profile Update UI
- [x] Profile page exists with viewing capabilities
- [x] Player linking functionality works
- [x] Task: Create tests for ProfileEditForm component [9 tests passing]
- [x] Task: Implement ProfileEditForm (edit firstName, lastName)
- [x] Task: Update API client updateProfile method
- [ ] Task: Create backend endpoint PUT /api/profile for self-update (check if exists)
- [ ] Task: Wire ProfileEditForm into Profile page
- [ ] Task: Test profile update flow end-to-end

### 3A.3: Email Configuration (Keycloak + Mailjet)
- [ ] Task: Document Keycloak SMTP configuration requirements
- [ ] Task: Configure Keycloak realm email settings for Mailjet
- [ ] Task: Test password reset email delivery
- [ ] Task: Test email verification flow
- [ ] Task: Conductor - User Manual Verification 'Phase 3A' (Protocol in workflow.md)

---

## Phase 3B: Data Migration Controller

### 3B.1: Migration Infrastructure
- [x] Task: Analyze JSON file structure (43 files, 2009-2024) [analyzed via json-schema-analyzer]
- [x] Task: Create migration utility functions (parseJsonFile, mapToSchema) [DataMigrationService.ts]
- [x] Task: Create tests for migration utilities [15 tests passing]
- [x] Task: Implement migration status tracking (MigrationStatus interface in controller)

### 3B.2: Player Migration
- [x] Task: Create tests for player extraction from JSON [extractPlayersFromRecord, extractAllPlayers tests]
- [x] Task: Implement `migratePlayers` - extract unique players from all JSONs [DataMigrationController]
- [x] Task: Handle player name normalization and deduplication [via Player.findOne]
- [ ] Task: Verify player migration against existing database

### 3B.3: Tournament Migration  
- [x] Task: Create tests for tournament metadata extraction [loadChampionsData, mapChampionToTournament tests]
- [x] Task: Implement `migrateTournaments` - create tournament records from JSON filenames/data
- [x] Task: Map JSON fields to Tournament schema (date, format, location, bodNumber) [normalizeFormat helper]

### 3B.4: Results Migration
- [x] Task: Create tests for tournament results extraction [mapRecordToTournamentResult tests]
- [x] Task: Implement `migrateResults` - create TournamentResult records
- [x] Task: Link results to tournaments and players by reference [via Player.findOne by name]
- [ ] Task: Calculate and store aggregate statistics

### 3B.5: Migration Operations
- [x] Task: Implement `migrateAll` - orchestrate full migration with rollback
- [x] Task: Implement `getMigrationStatus` - track progress and errors
- [x] Task: Implement `previewMigration` - dry-run with validation report
- [x] Task: Implement `validateData` - check data integrity post-migration

### 3B.6: Backup & Restore
- [x] Task: Implement `createBackup` - MongoDB dump to file [mongodump wrapper]
- [x] Task: Implement `restoreBackup` - restore from backup file [mongorestore wrapper]
- [ ] Task: Create admin UI for migration controls (optional)
- [ ] Task: Conductor - User Manual Verification 'Phase 3B' (Protocol in workflow.md)

---

## JSON File Structure Reference

**43 files** in `./json/` directory, format: `YYYY-MM-DD Format.json`

Example fields per record:
- `Player 1`, `Player 2` - Team members
- `Round-1`, `Round-2`, `Round-3` - Round robin scores
- `RR Won`, `RR Lost`, `RR Played`, `RR Win%` - Round robin stats
- `Div Seed`, `Div Rank`, `Division` - Division info
- `QF Won/Lost`, `SF Won/Lost`, `Finals Won/Lost` - Bracket scores
- `Bracket Won/Lost/Played` - Bracket totals
- `Total Won/Lost/Played`, `Win%` - Overall stats
- `BOD Finish` - Final placement

---

## Dependencies
- Keycloak admin access for email configuration
- Mailjet API credentials
- MongoDB backup storage location

---

## Success Criteria
1. Users can reset password via email
2. Users can update their profile information
3. All 43 historical tournaments imported with accurate data
4. Player statistics calculated correctly from historical data
5. No data loss or corruption during migration
