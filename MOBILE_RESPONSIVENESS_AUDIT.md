# Mobile Responsiveness Audit & Fix Task

## Problem
User management screen and potentially other screens have buttons/content appearing off-screen on mobile devices (specifically Pixel 10 Pro - 412x915px viewport).

## Goal
Ensure the ENTIRE Bracket of Death application is fully responsive and usable on mobile devices (320px - 428px widths).

## Target Devices
- iPhone SE: 375 x 667
- iPhone 12/13/14: 390 x 844
- Pixel 5/6: 393 x 851
- **Pixel 10 Pro: 412 x 915** (primary test device)
- Galaxy S21: 360 x 800

## Scope - Pages to Audit & Fix

### Public Pages
- [x] Landing page (/)
- [ ] Rules (/rules)
- [ ] FAQ (/faq)
- [ ] Open Tournaments (/open-tournaments)

### Authenticated Pages
- [ ] Dashboard (/dashboard)
- [ ] Profile (/profile)
- [ ] Players List (/players)
- [ ] Player Detail (/players/:id)
- [ ] Rankings (/rankings)
- [ ] Tournaments List (/tournaments)
- [ ] Tournament Detail (/tournaments/:id)
- [ ] Tournament Setup/Create (/tournaments/create)
- [ ] Results (/results)
- [ ] News (/news)

### Admin Pages (PRIORITY - User Management Issue) ✅ COMPLETE
- [x] **Admin Dashboard (/admin)** - PRIORITY ✅ FIXED
- [x] **User Management (/admin/users)** - REPORTED ISSUE ✅ FIXED
- [x] Settings (/admin/settings) ✅ FIXED
- [x] Stripe Settings (/admin/stripe) ✅ FIXED
- [x] Discount Codes (/admin/discounts) ✅ FIXED
- [ ] Scanner (/admin/scanner)

### Forms
- [ ] Login (/login)
- [ ] Register (/register)
- [ ] Password Reset (/reset-password)
- [ ] Onboarding (/onboarding)

## Common Issues to Fix

### 1. Tables (CRITICAL)
- Tables on mobile often overflow
- Use card-based layout or horizontal scroll
- Consider responsive patterns:
  - Stack columns vertically
  - Hide non-essential columns on mobile
  - Use disclosure pattern (tap to expand)

### 2. Buttons (REPORTED ISSUE)
- Button groups overflowing viewport
- Action buttons hidden off-screen
- Fix patterns:
  - Stack buttons vertically on mobile
  - Use full-width buttons
  - Reduce padding/font sizes
  - Use icon-only buttons with tooltips

### 3. Forms
- Multi-column layouts breaking
- Input fields too narrow
- Fix patterns:
  - Single column on mobile
  - Full-width inputs
  - Larger touch targets (min 44x44px)

### 4. Navigation
- Desktop sidebar → mobile bottom bar (already implemented)
- Ensure all nav items accessible
- Test hamburger menus work

### 5. Modals/Dialogs
- Modals too wide for viewport
- Scrolling issues
- Fix: max-width 100%, padding on edges

### 6. Typography
- Text too small on mobile
- Line lengths too long
- Fix: responsive font sizes (clamp or fluid typography)

## Technical Approach

### Tailwind Breakpoints
```javascript
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
}
```

### Mobile-First Classes to Use
- `flex-col md:flex-row` - Stack on mobile, row on desktop
- `w-full md:w-auto` - Full width mobile, auto desktop
- `text-sm md:text-base` - Smaller text mobile
- `p-2 md:p-4` - Less padding mobile
- `hidden md:block` - Hide on mobile
- `overflow-x-auto` - Horizontal scroll for tables
- `space-y-2 md:space-y-0 md:space-x-2` - Vertical spacing mobile

## Testing Checklist

For EACH page, test:
- [ ] All content visible (no horizontal scroll)
- [ ] All buttons/actions accessible
- [ ] Forms usable (inputs not cut off)
- [ ] Text readable (not too small)
- [ ] Touch targets adequate (44x44px min)
- [ ] Tables don't overflow (scroll or stack)
- [ ] Modals fit in viewport
- [ ] Navigation accessible
- [ ] Images/media responsive

## Priority Order

1. **Admin → User Management** (reported issue)
2. **Admin → Other admin pages**
3. **Tournaments** (core feature)
4. **Players**
5. **Dashboard**
6. **Profile**
7. **Forms** (login, register)
8. **Public pages**

## Implementation Steps

1. **Start**: User Management screen
2. **Document** current issues with screenshots
3. **Fix** using mobile-first Tailwind classes
4. **Test** at multiple breakpoints
5. **Move to next page**, repeat

## Automated Testing
After manual fixes, consider:
- Playwright tests at mobile viewport
- Visual regression tests
- Accessibility audits (axe-core)

## Files Likely Needing Changes

### Admin Components
- `src/frontend/src/pages/Admin.tsx`
- `src/frontend/src/pages/UserManagement.tsx`
- `src/frontend/src/components/admin/*`

### Shared Components
- `src/frontend/src/components/layout/Layout.tsx`
- `src/frontend/src/components/common/*`

### Table Components
- Any component with `<table>` tags
- Look for: overflow issues, fixed widths

### Button Groups
- Look for: `flex space-x-*` without mobile wrapping
- Fix with: `flex-wrap` or `flex-col md:flex-row`

## Success Criteria

✅ Admin pages usable on 360px width (COMPLETE)
✅ No horizontal scroll in admin sections
✅ All admin buttons accessible
✅ Forms completable on mobile (admin forms done)
✅ Touch targets meet WCAG standards (44px+ applied)
✅ Text readable without zooming
✅ **User Management buttons visible on Pixel 10 Pro** ✅ FIXED

## Completion Status

### March 26, 2026 - Initial Mobile Fix Sprint (COMPLETE)
**Completed by Claude Code Agent**
- ✅ UserManagement.tsx - CRITICAL ISSUE RESOLVED
- ✅ UserDetailModal.tsx
- ✅ Admin.tsx (Dashboard)
- ✅ DiscountCodesPage.tsx
- ✅ StripeSettingsPage.tsx
- ✅ Settings.tsx
- ✅ CreateUserForm.tsx

### Changes Applied
- Mobile-first approach: `px-4 sm:px-6`, `text-sm sm:text-base`
- Button stacking: `flex-col sm:flex-row` with `flex-col-reverse` for primary actions
- Touch targets: `min-h-[44px]` on all interactive elements
- Full-width buttons on mobile: `w-full sm:w-auto`
- Modal improvements: Bottom-sheet on mobile with proper scrolling
- Tables: Mobile card view, desktop table hidden on mobile

### Tested At
- 360px width minimum (supported)
- 412px width (Pixel 10 Pro - primary test device)
- Responsive breakpoints: sm (640px), md (768px), lg (1024px)

### Next Phase (Future)
- [ ] Public pages (Rules, FAQ, Open Tournaments)
- [ ] Authenticated pages (Tournaments, Players, Rankings, etc.)
- [ ] Forms (Login, Register, Password Reset)
- [ ] Scanner page

## Local Testing

```bash
cd ~/BracketOfDeathSite
docker-compose up -d
# Test at http://localhost:5173
# Use browser DevTools → Responsive Mode
# Test devices: iPhone SE, Pixel 5, Pixel 10 Pro
```

## Output Expected

1. List of all issues found (per page)
2. Code changes implementing fixes
3. Before/After screenshots
4. Updated pages committed to repo
5. This audit document updated with ✅ checkmarks
