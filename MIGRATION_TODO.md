# Component System Migration - TODO List

**Goal:** Migrate entire BOD app to use organized component system for maximum maintainability.

## Progress Overview

**Completed:** 20/35 pages (57%)
**Remaining:** 15 pages
**Target:** 100% component system adoption

---

## ✅ Phase 1: Admin Pages (7/7 complete - 100%)

### Completed
- [x] UserManagement.tsx
- [x] Settings.tsx
- [x] DiscountCodesPage.tsx
- [x] StripeSettingsPage.tsx
- [x] Admin.tsx (main dashboard) - Sprint 1

### Todo
- [x] ScannerPage.tsx - Sprint 4
- [x] TournamentTicketsPage.tsx - Sprint 4

---

## ⏳ Phase 2: Tournament Pages (2/8 complete - 25%)

### High Priority (Core Features)
- [x] **Tournaments.tsx** - Main tournament browse page - Sprint 1
- [x] **TournamentDetail.tsx** - Tournament info + registration (complex) - Sprint 1
- [ ] **TournamentRegistration.tsx** - Registration form
- [ ] **CreateTournament.tsx** - Admin tournament creation

### Medium Priority
- [ ] BracketView.tsx - Bracket visualization
- [ ] ResultsTableEditor.tsx - Results editing
- [ ] MatchScoring.tsx - Live scoring interface
- [ ] LiveStats.tsx - Real-time stats display

---

## ⏳ Phase 3: Player Pages (4/4 complete - 100%)

### High Priority
- [x] **Players.tsx** - Browse players - Sprint 1
- [x] **PlayerDetail.tsx** - Player profile + stats - Sprint 4
- [x] **Rankings.tsx** - Player rankings table - Sprint 4

### Medium Priority
- [x] Profile.tsx - User's own profile page - Sprint 2

---

## ⏳ Phase 4: Form Pages (3/5 complete - 60%)

### High Priority (User Entry Points)
- [x] **Login.tsx** - Login form - Sprint 2
- [x] **Register.tsx** - Registration form - Sprint 2
- [x] **Onboarding.tsx** - New user onboarding - Sprint 2

### Medium Priority
- [ ] ForgotPassword.tsx - Password reset
- [ ] ChangePassword.tsx - Password change

---

## ✅ Phase 5: Public Pages (4/4 complete - 100%)

### High Priority (Public-Facing)
- [x] **Home.tsx** - Authenticated home/dashboard page - Sprint 3
- [x] **Rules.tsx** - Tournament rules - Sprint 3
- [x] **FAQ.tsx** - FAQ page - Sprint 3

### Medium Priority
- [x] OpenTournaments.tsx - Public tournament list - Sprint 3

---

## ⏳ Phase 6: Layout Components (0/3 complete - 0%)

### Core Layout
- [ ] Layout.tsx - Main app layout wrapper
- [ ] Header.tsx - Top navigation
- [ ] Navigation.tsx - Side/bottom navigation

---

## ⏳ Phase 7: Shared Components (0/4 complete - 0%)

### Reusable Components
- [ ] UserDetailModal.tsx - User detail modal (partially done)
- [ ] CreateUserForm.tsx - User creation form (partially done)
- [ ] TicketCard.tsx - Ticket display card
- [ ] TournamentHeader.tsx - Tournament page header

---

## Migration Checklist (Per Page)

For each page, verify:

### 1. Layout Patterns
- [ ] Replace `flex flex-col sm:flex-row` → `<Stack direction="responsive">`
- [ ] Replace manual padding → `<Container padding="md">`
- [ ] Replace grid layouts → `<ResponsiveGrid cols={...}>`

### 2. Buttons
- [ ] Replace button elements → `<Button variant="...">`
- [ ] Replace button groups → `<ButtonGroup orientation="responsive">`
- [ ] Verify 44px touch targets (automatic with Button component)
- [ ] Remove `min-h-[44px]` classes (enforced by component)

### 3. Forms
- [ ] Replace input elements → `<Input />`, `<Select />`, `<Textarea />`
- [ ] Wrap fields → `<FormField label="...">`
- [ ] Remove manual label/error handling (FormField does it)

### 4. Tables
- [ ] Replace tables → `<ResponsiveTable>` with mobile card view
- [ ] Implement `renderMobileCard` for mobile layout
- [ ] Define `columns` config

### 5. Typography
- [ ] Replace heading tags → `<Heading level={1-6} responsive>`
- [ ] Replace paragraph text → `<Text size="..." color="...">`
- [ ] Remove manual `text-2xl sm:text-3xl` classes

### 6. Modals
- [ ] Use shared `<Modal>` component
- [ ] Add `mobileSheet` prop for mobile bottom-sheet behavior
- [ ] Use `<ButtonGroup>` in modal footers

### 7. Cleanup
- [ ] Remove inline responsive Tailwind classes
- [ ] Import components from `@/components/ui`
- [ ] Verify TypeScript compiles
- [ ] Test at mobile viewport (360px, 412px)

---

## Priority Order (Recommended)

### Sprint 1 (Immediate - High Impact)
1. Admin.tsx (complete admin section)
2. TournamentList.tsx (main browse page)
3. TournamentDetail.tsx (most complex page)
4. PlayerList.tsx (likely has table issues)

### Sprint 2 (User Flows)
5. Login.tsx
6. Register.tsx
7. Profile.tsx
8. Onboarding.tsx

### Sprint 3 (Public Pages)
9. Home/Landing.tsx
10. Rules.tsx
11. FAQ.tsx
12. OpenTournaments.tsx

### Sprint 4 (Advanced Features)
13. BracketView.tsx
14. MatchScoring.tsx
15. ResultsTableEditor.tsx
16. ScannerPage.tsx

### Sprint 5 (Polish)
17. Layout.tsx
18. Header.tsx
19. Navigation.tsx
20. Remaining components

---

## Success Criteria

### Per-Page Success
✅ Zero inline `flex-col sm:flex-row` patterns  
✅ Zero manual `min-h-[44px]` classes  
✅ All buttons use `<Button>` component  
✅ All forms use `<FormField>` + input components  
✅ All tables use `<ResponsiveTable>`  
✅ All headings use `<Heading>` component  
✅ TypeScript compiles with no errors  
✅ Tested at 360px and 412px width  

### Overall Success
✅ 100% of pages migrated  
✅ 30%+ code reduction across pages  
✅ Consistent mobile UX sitewide  
✅ All touch targets 44px minimum  
✅ No horizontal scroll on any page  
✅ Type-safe component usage throughout  

---

## Migration Strategy

### Automated Migration (Where Possible)
- Codemod for common patterns (flex-col sm:flex-row → Stack)
- Find/replace for button patterns
- Script to identify pages needing migration

### Manual Migration (Complex Pages)
- TournamentDetail (custom layouts)
- BracketView (specialized visualization)
- MatchScoring (real-time UI)

### Testing Per Sprint
- Visual regression testing
- Mobile device testing
- Touch target validation
- Accessibility audit

---

## Tracking

Update this file as pages are completed. Mark with:
- [x] Page migrated
- ✅ Tested on mobile
- 📝 Notes/issues

Example:
- [x] UserManagement.tsx ✅ Tested 360px, 412px, 768px

---

## Commands for Migration

### Find pages with old patterns
```bash
# Find flex-col sm:flex-row
grep -r "flex-col sm:flex-row" src/pages/

# Find min-h-[44px]
grep -r "min-h-\[44px\]" src/pages/

# Find manual button styling
grep -r "className.*button.*bg-" src/pages/
```

### Test build after migration
```bash
cd src/frontend
npm run build
npm run lint
```

### Test at mobile viewport
Open http://localhost:5173 and resize to:
- 360px (iPhone SE)
- 412px (Pixel 10 Pro)
- 768px (iPad)

---

**Last Updated:** March 26, 2026
**Completed:** 16/35 pages (46%)
**Next Target:** Sprint 4 - BracketView.tsx, MatchScoring.tsx, ResultsTableEditor.tsx, ScannerPage.tsx
