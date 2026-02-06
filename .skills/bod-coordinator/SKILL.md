---
name: bod-coordinator
description: Coordinate Bracket of Death development tasks across specialized agent teams. Use when planning features, breaking down work, or orchestrating multi-team development. Routes tasks to bod-frontend, bod-backend, and bod-testing skills.
---

# BOD Development Coordinator

Orchestrate development across specialized teams.

## Available Teams

| Team | Skill | Specialty |
|------|-------|-----------|
| Frontend | `bod-frontend` | React/TypeScript UI components |
| Backend | `bod-backend` | Node/Express/MongoDB APIs |
| Testing | `bod-testing` | Vitest/Jest test coverage |

## Workflow

### Feature Development

1. **Plan** - Break feature into frontend + backend tasks
2. **Backend First** - API endpoints and models
3. **Frontend Second** - UI consuming the APIs
4. **Tests Throughout** - TDD or test after implementation

### Task Breakdown Template

```markdown
## Feature: [Name]

### Backend Tasks
- [ ] Model: Create/update Mongoose model
- [ ] Controller: Add endpoint handlers
- [ ] Routes: Wire up Express routes
- [ ] Service: Business logic if complex

### Frontend Tasks
- [ ] Types: TypeScript interfaces
- [ ] API: Add to apiClient
- [ ] Components: UI components
- [ ] Pages: Route pages
- [ ] Integration: Wire into app

### Testing Tasks
- [ ] Backend unit tests
- [ ] Frontend component tests
- [ ] Integration tests (if needed)
```

## Spawning Sub-Agents

Use `sessions_spawn` to delegate work:

```
Task: "Build the CheckoutTimer component for Phase 4. 
Reference .skills/bod-frontend/SKILL.md for patterns.
Component should show countdown, warn at 5 min and 1 min, 
call onExpire when time runs out."
```

For backend:
```
Task: "Add GET /api/tickets endpoint that returns user's tickets.
Reference .skills/bod-backend/SKILL.md for patterns.
Include tournament info via populate."
```

## Phase 4 Remaining Tasks

### Frontend Components Needed
- [ ] `CheckoutTimer` - Countdown banner during checkout
- [ ] `TicketCard` - Display single ticket with QR
- [ ] `TicketList` - User's tickets on profile
- [ ] `QRScanner` - Admin check-in scanner
- [ ] `DiscountCodeInput` - Validate/apply codes
- [ ] `StripeSettingsForm` - Admin Stripe config

### Frontend Pages Needed
- [ ] `/checkout/success` - Post-payment confirmation
- [ ] `/checkout/cancel` - Timeout/cancel messaging
- [ ] `/admin/settings/stripe` - Stripe settings tab
- [ ] `/admin/scanner` - Check-in scanner page

### Email Templates Needed
- [ ] Ticket confirmation (with QR)
- [ ] Tournament invitation
- [ ] Invitation reminder
- [ ] Refund confirmation

## Self-Improvement

Track coordination issues in `references/lessons.md`:
- Task breakdowns that worked well
- Communication patterns that failed
- Dependency issues between teams

See `references/lessons.md` for past coordination learnings.
