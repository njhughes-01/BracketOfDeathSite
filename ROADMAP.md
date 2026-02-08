# Bracket of Death - Roadmap v2.0.0+

*Last updated: 2026-02-06*

---

## Current State Analysis (v2.0.0)

### ✅ Completed Features

#### Authentication & Authorization
- [x] Keycloak SSO integration with PKCE flow
- [x] Role-based access control (superadmin, admin, user)
- [x] Direct login fallback (memory-only tokens)
- [x] Password reset via Mailgun HTTP API
- [x] Profile claiming system for existing players
- [x] User registration with email verification

#### Email System
- [x] Mailgun and Mailjet provider support
- [x] Environment variable configuration (priority over database)
- [x] Admin UI for email configuration
- [x] Branded email templates (profile claim, password reset, test)

#### Profile Management
- [x] Profile viewing and editing
- [x] Link player profiles to user accounts
- [x] View tournament history and stats

#### Tournament System - Core
- [x] Tournament CRUD (create, read, update, delete)
- [x] Tournament formats: M, W, Mixed, Men's Singles/Doubles, Women's Doubles, Mixed Doubles
- [x] Tournament statuses: scheduled, open, active, completed, cancelled
- [x] Team formation and registration
- [x] Match generation
- [x] Live scoring interface
- [x] Round robin + bracket phases
- [x] Player leaderboard and stats calculation
- [x] Tournament results storage

#### Historical Data
- [x] Data migration service (43 tournaments, 2009-2024)
- [x] 481 players imported
- [x] 46 tournaments imported
- [x] 689 results imported
- [x] Historical statistics calculated

#### Admin Features
- [x] User management (CRUD)
- [x] System settings (email, branding)
- [x] Player management
- [x] Tournament administration

#### Testing
- [x] 309 frontend tests
- [x] 129 backend tests
- [x] E2E issues resolved

---

## 🚀 Roadmap

### Phase 4: Payments & Ticketing (Stripe)
*Priority: HIGH - Client requirement for paid tournaments*

#### 4.1 Stripe Admin Panel
*New "Stripe" tab in Admin Settings*

- [ ] Global pricing settings
  - [ ] Annual membership fee (skeleton for future)
  - [ ] Monthly membership fee (skeleton for future)
  - [ ] Default tournament entry fee
- [ ] Discount code management
  - [ ] Create/edit/delete discount codes via UI
  - [ ] Stripe Coupons integration
  - [ ] Code usage limits and expiry dates
- [ ] Master payment/action log
  - [ ] All Stripe events (payments, refunds, disputes)
  - [ ] Filterable by date, player, tournament
  - [ ] Export capability
- [ ] Revenue reporting (admin only)
  - [ ] Per-tournament breakdown
  - [ ] Date range reports
  - [ ] Payment method distribution

#### 4.2 Stripe Integration
- [ ] Stripe account setup and API keys (env vars)
- [ ] Per-tournament pricing
  - [ ] Admin sets entry fee per tournament (including $0 for free)
  - [ ] Discount code application at checkout
- [ ] Stripe Checkout integration
  - [ ] Redirect to Stripe hosted checkout
  - [ ] Success/cancel return URLs
  - [ ] Metadata: tournament ID, player ID, team info
- [ ] Webhook handling
  - [ ] `checkout.session.completed` → confirm registration, generate QR
  - [ ] `charge.refunded` → invalidate QR, remove from roster, restore spots
  - [ ] Webhook signature verification
- [ ] Stripe Customer Portal link
  - [ ] View payment history
  - [ ] Download receipts
  - [ ] Request refunds (if enabled)

#### 4.3 Slot Reservation System
*Prevents race conditions when tournament fills*

- [ ] Reserve slot on "Register" click
  - [ ] 20-minute hold timer
  - [ ] Decrement available spots immediately
- [ ] Checkout timer banner
  - [ ] Countdown at top of page during checkout
  - [ ] Warning at 5 minutes, 1 minute
- [ ] Auto-release on timeout
  - [ ] Background job checks expired reservations
  - [ ] Restore spots to available pool
  - [ ] Optional: notify player their slot expired

#### 4.4 QR Ticket System
- [ ] Ticket generation (ALL registrations, paid or free)
  - [ ] Unique ticket ID (UUID or short code)
  - [ ] QR code generation (qrcode library)
  - [ ] Store ticket in database with payment reference
- [ ] Email ticket to player
  - [ ] QR code as inline image
  - [ ] Tournament details, date, location
  - [ ] "Add to calendar" link
- [ ] Check-in scanner interface
  - [ ] Mobile-friendly camera scanner
  - [ ] Manual ticket ID lookup fallback
  - [ ] Show player name, team, payment status
  - [ ] One-tap check-in confirmation
  - [ ] **Duplicate scan detection** → warn scanner, reject check-in
- [ ] Player self-service
  - [ ] Profile page shows tournament registrations
  - [ ] "Resend ticket" button for each registration

#### 4.5 Registration Flow Updates
- [ ] Tournament detail page shows price
- [ ] "Register" click → reserve slot → Stripe Checkout (or direct if $0)
- [ ] Free tournaments ($0) still generate QR for tracking
- [ ] Registration statuses: `reserved`, `paid`, `refunded`, `checked_in`
- [ ] Capacity limits with waitlist (future: Phase 6)

#### 4.6 Pre-Selected (Invite-Only) Tournaments
- [ ] Admin pre-selects players for tournament
  - [ ] Require email address (prompt if missing)
  - [ ] Bulk select from player list
- [ ] Invitation email sent automatically
  - [ ] "Congratulations! You're invited to [Tournament]"
  - [ ] Payment link with tournament fee
  - [ ] Deadline to pay (configurable)
- [ ] Track "invited but unpaid" status
  - [ ] Admin view: who hasn't paid yet
  - [ ] Reminder emails (optional)
  - [ ] Release spot if deadline passes

---

### Phase 5: Mobile & Live Tournament Experience
*Priority: HIGH - Core use case is courtside scoring*

#### 5.1 Mobile Optimization
- [ ] PWA (Progressive Web App) support
  - [ ] Service worker for offline capability
  - [ ] Add to home screen prompt
  - [ ] Push notifications for match assignments
- [ ] Mobile-optimized scoring interface
  - [ ] Large touch targets for score buttons
  - [ ] Swipe gestures for quick actions
  - [ ] Landscape mode for bracket view
- [ ] Real-time sync with conflict resolution
  - [ ] Handle poor/intermittent connectivity
  - [ ] Queue updates when offline
  - [ ] Sync on reconnect

#### 5.2 Live Tournament Enhancements
- [ ] Real-time WebSocket updates (currently SSE)
  - [ ] Socket.io integration
  - [ ] Live score updates across all connected devices
  - [ ] Live bracket progression
- [ ] Court assignment system
  - [ ] Assign matches to specific courts
  - [ ] Court availability tracking
  - [ ] Queue management
- [ ] Match notifications
  - [ ] "You're up next" alerts
  - [ ] Match completed notifications
  - [ ] Tournament progression updates

---

### Phase 6: Advanced Tournament Features
*Priority: MEDIUM - Enhances tournament management*

#### 6.1 Tournament Formats
- [ ] Double elimination bracket support
- [ ] Swiss system format
- [ ] Pool play variations
- [ ] Custom bracket sizes (4, 8, 16, 32, 64)
- [ ] Consolation brackets

#### 6.2 Seeding & Scheduling
- [ ] Automatic seeding based on historical performance
- [ ] Manual seed override
- [ ] Schedule optimization (minimize wait times)
- [ ] Conflict detection (player in multiple matches)
- [ ] Rest time between matches configuration

#### 6.3 Team Formation
- [ ] Random team generation (with skill balancing)
- [ ] Draft-style team formation
- [ ] Pre-registered partnerships
- [ ] Substitute player handling

---

### Phase 7: Analytics & Insights
*Priority: MEDIUM - Historical archive enhancement*

#### 7.1 Player Statistics
- [ ] Head-to-head records
- [ ] Win streaks and records
- [ ] Performance trends over time
- [ ] Partner compatibility stats
- [ ] Division-specific stats

#### 7.2 Tournament Analytics
- [ ] Match duration tracking
- [ ] Score distribution analysis
- [ ] Upset tracking (seed vs finish)
- [ ] Tournament comparison reports

#### 7.3 Visualization
- [ ] Interactive historical bracket viewer
- [ ] Player career timeline
- [ ] Statistics graphs and charts
- [ ] Export to PDF/image for sharing

---

### Phase 8: Social & Engagement
*Priority: LOW - Nice to have*

#### 8.1 Social Features
- [ ] Player profiles with avatars
- [ ] Activity feed
- [ ] Comments on matches/tournaments
- [ ] Share results to social media

#### 8.2 Gamification
- [ ] Achievement badges
- [ ] All-time records board
- [ ] Season leaderboards
- [ ] "Most Improved" awards

#### 8.3 Communication
- [ ] In-app messaging
- [ ] Tournament announcements
- [ ] Email newsletters
- [ ] Calendar integration (iCal export)

---

### Phase 9: Platform Stability & DevOps
*Priority: ONGOING*

#### 9.1 Infrastructure
- [ ] Production deployment guide
- [ ] Docker Compose production config
- [ ] SSL/TLS setup documentation
- [ ] Backup automation
- [ ] Monitoring and alerting (health checks, error tracking)

#### 9.2 Performance
- [ ] Database indexing optimization
- [ ] API response caching
- [ ] Image optimization and CDN
- [ ] Load testing

#### 9.3 Security
- [ ] Rate limiting
- [ ] CSRF protection audit
- [ ] Security headers
- [ ] Dependency vulnerability scanning
- [ ] Penetration testing

---

## Technical Debt & Improvements

### Code Quality
- [ ] Increase backend test coverage (currently ~60%)
- [ ] Add integration tests for critical flows
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Storybook for UI components

### Developer Experience
- [ ] Hot reload improvements
- [ ] Development environment setup script
- [ ] Contributing guidelines
- [ ] Code review checklist

---

## Version Milestones

| Version | Focus | Target |
|---------|-------|--------|
| v2.1.0 | Stripe payments + QR tickets + membership skeleton | Q1 2026 |
| v2.2.0 | PWA + Mobile scoring | Q1 2026 |
| v2.3.0 | Real-time WebSocket | Q2 2026 |
| v3.0.0 | Advanced tournament formats | Q2 2026 |
| v3.1.0 | Analytics dashboard | Q3 2026 |
| v4.0.0 | Social features | Q4 2026 |

---

## Quick Wins (Can be done anytime)

- [ ] Dark/light theme toggle
- [ ] Export tournament results to CSV
- [ ] Print-friendly bracket view
- [ ] Bulk player import from CSV
- [ ] Tournament templates (save settings for reuse)
- [ ] Keyboard shortcuts for scoring

---

## Notes

### Out of Scope (for now)
- Native mobile apps (iOS/Android) - PWA sufficient
- Multi-organization support - single org focus
- Video integration - manual scoring only
- Manual ticket generation for comps/sponsors - future phase

### Dependencies
- Keycloak must be maintained/upgraded separately
- Mailgun account required for email features
- MongoDB hosting for production
- **Stripe account** for payment processing (test + live keys)
- QR code scanning requires camera access (HTTPS required)

### Deployment
- **Test/Staging:** bod.lightmedia.club (local hosting)
- **Production:** VPS (rented, for uptime guarantees)

---

*This roadmap is a living document. Priorities may shift based on user feedback and tournament needs.*
