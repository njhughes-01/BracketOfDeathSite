# Phase 4: API & Route Specification

*Stripe Payments, QR Tickets, Slot Reservation*

---

## New Models

### StripeSettings (extend SystemSettings)
```typescript
{
  // Global pricing (skeleton for memberships)
  annualMembershipFee: number;      // Future use
  monthlyMembershipFee: number;     // Future use
  defaultEntryFee: number;          // Default tournament fee
  
  // Stripe config (env vars take priority)
  stripePublishableKey: string;     // pk_test_... or pk_live_...
  stripeSecretKey: string;          // sk_test_... (hidden)
  stripeWebhookSecret: string;      // whsec_... (hidden)
}
```

### DiscountCode
```typescript
{
  _id: ObjectId;
  code: string;                     // Unique, uppercase (e.g., "SUMMER20")
  stripeCouponId: string;           // Stripe Coupon ID
  type: 'percent' | 'amount';
  percentOff?: number;              // 0-100
  amountOff?: number;               // In cents
  maxRedemptions?: number;          // null = unlimited
  redemptionCount: number;          // Current usage
  expiresAt?: Date;
  tournamentIds?: ObjectId[];       // Restrict to specific tournaments (empty = all)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### SlotReservation
```typescript
{
  _id: ObjectId;
  tournamentId: ObjectId;
  userId: ObjectId;
  playerId: ObjectId;
  expiresAt: Date;                  // createdAt + 20 minutes
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  stripeSessionId?: string;         // Set when checkout created
  createdAt: Date;
}
```

### TournamentTicket
```typescript
{
  _id: ObjectId;
  ticketCode: string;               // Unique, scannable (e.g., "BOD-A1B2C3D4")
  qrCodeUrl?: string;               // Generated QR image URL/path
  
  tournamentId: ObjectId;
  userId: ObjectId;
  playerId: ObjectId;
  teamId?: ObjectId;
  
  status: 'valid' | 'checked_in' | 'refunded' | 'void';
  paymentStatus: 'paid' | 'free' | 'refunded';
  
  // Stripe references
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  amountPaid: number;               // In cents (0 for free)
  discountCodeUsed?: string;
  
  // Check-in tracking
  checkedInAt?: Date;
  checkedInBy?: ObjectId;           // Admin who scanned
  
  // Email tracking
  emailSentAt?: Date;
  emailResendCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### TournamentInvitation (for invite-only tournaments)
```typescript
{
  _id: ObjectId;
  tournamentId: ObjectId;
  playerId: ObjectId;
  email: string;                    // Required for invite
  
  status: 'pending' | 'paid' | 'declined' | 'expired';
  
  invitedAt: Date;
  invitedBy: ObjectId;              // Admin who sent invite
  paidAt?: Date;
  expiresAt?: Date;                 // Payment deadline
  
  remindersSent: number;
  lastReminderAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### StripeEvent (audit log)
```typescript
{
  _id: ObjectId;
  stripeEventId: string;            // Unique, from Stripe (evt_...)
  type: string;                     // e.g., 'checkout.session.completed'
  livemode: boolean;
  
  // Extracted references for querying
  tournamentId?: ObjectId;
  userId?: ObjectId;
  playerId?: ObjectId;
  ticketId?: ObjectId;
  
  amount?: number;                  // In cents
  currency?: string;
  
  rawData: object;                  // Full Stripe event payload
  
  processedAt: Date;
  processingError?: string;
  
  createdAt: Date;
}
```

### Tournament Model Updates
```typescript
// Add to existing Tournament model:
{
  // Pricing
  entryFee: number;                 // In cents (0 = free), default: 0
  earlyBirdFee?: number;            // Discounted fee
  earlyBirdDeadline?: Date;
  
  // Registration control
  inviteOnly: boolean;              // Default: false
  paymentDeadlineHours?: number;    // For invites (default: 72)
  
  // Capacity (existing, ensure these exist)
  maxPlayers: number;
  spotsReserved: number;            // Currently held reservations
}
```

---

## Backend API Routes

### Stripe Settings (Admin)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/settings/stripe` | Get Stripe settings | admin |
| PUT | `/api/settings/stripe` | Update Stripe settings | superadmin |

### Discount Codes (Admin)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/discount-codes` | List all discount codes | admin |
| POST | `/api/discount-codes` | Create discount code | admin |
| GET | `/api/discount-codes/:id` | Get single discount code | admin |
| PUT | `/api/discount-codes/:id` | Update discount code | admin |
| DELETE | `/api/discount-codes/:id` | Deactivate discount code | admin |
| POST | `/api/discount-codes/validate` | Validate code for checkout | user |

**POST /api/discount-codes/validate**
```typescript
// Request
{ code: string; tournamentId: string; }

// Response
{ 
  valid: boolean;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
  error?: string;  // 'expired', 'limit_reached', 'not_applicable'
}
```

### Slot Reservation

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/tournaments/:id/reserve` | Reserve slot (20 min hold) | user |
| DELETE | `/api/tournaments/:id/reserve` | Cancel reservation | user |
| GET | `/api/tournaments/:id/reservation` | Get user's reservation status | user |

**POST /api/tournaments/:id/reserve**
```typescript
// Response
{
  reservationId: string;
  expiresAt: string;          // ISO timestamp
  remainingSeconds: number;
  tournamentId: string;
  spotsRemaining: number;     // After this reservation
}
```

### Checkout (Stripe)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/checkout/create-session` | Create Stripe Checkout session | user |
| POST | `/api/checkout/free` | Complete free registration | user |
| GET | `/api/checkout/session/:sessionId` | Get session status | user |

**POST /api/checkout/create-session**
```typescript
// Request
{
  tournamentId: string;
  reservationId: string;
  discountCode?: string;
}

// Response
{
  sessionId: string;
  url: string;                // Redirect to Stripe
  expiresAt: string;
}
```

**POST /api/checkout/free**
```typescript
// Request
{
  tournamentId: string;
  reservationId: string;
}

// Response
{
  ticketId: string;
  ticketCode: string;
  message: string;
}
```

### Stripe Webhooks

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler | Stripe signature |

**Handled Events:**
- `checkout.session.completed` → Create ticket, send email, log event
- `checkout.session.expired` → Release reservation, log event
- `charge.refunded` → Invalidate ticket, restore spot, log event
- `customer.subscription.*` → Future membership handling

### Tickets

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/tickets` | List user's tickets | user |
| GET | `/api/tickets/:id` | Get ticket details | user (owner) |
| POST | `/api/tickets/:id/resend` | Resend ticket email | user (owner) |
| GET | `/api/tickets/lookup/:code` | Lookup by QR code | admin |
| POST | `/api/tickets/:id/check-in` | Mark checked in | admin |
| POST | `/api/tickets/:id/void` | Void ticket | admin |

**GET /api/tickets**
```typescript
// Response
{
  tickets: [
    {
      id: string;
      ticketCode: string;
      tournament: { id, name, date, location };
      status: string;
      paymentStatus: string;
      amountPaid: number;
      checkedInAt?: string;
      createdAt: string;
    }
  ]
}
```

**GET /api/tickets/lookup/:code**
```typescript
// Response
{
  ticket: {
    id: string;
    ticketCode: string;
    status: string;
    player: { id, firstName, lastName };
    team?: { id, name };
    tournament: { id, name };
    checkedInAt?: string;
    checkedInBy?: { id, name };
  };
  alreadyCheckedIn: boolean;
  canCheckIn: boolean;
  error?: string;
}
```

### Tournament Tickets (Admin)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/tournaments/:id/tickets` | List all tickets for tournament | admin |
| GET | `/api/tournaments/:id/tickets/stats` | Ticket statistics | admin |

**GET /api/tournaments/:id/tickets/stats**
```typescript
// Response
{
  total: number;
  valid: number;
  checkedIn: number;
  refunded: number;
  revenue: number;          // Total in cents
  freeRegistrations: number;
}
```

### Invitations (Invite-Only Tournaments)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/tournaments/:id/invitations` | List invitations | admin |
| POST | `/api/tournaments/:id/invitations` | Send invitations | admin |
| POST | `/api/tournaments/:id/invitations/:playerId/remind` | Resend invite | admin |
| DELETE | `/api/tournaments/:id/invitations/:playerId` | Revoke invitation | admin |

**POST /api/tournaments/:id/invitations**
```typescript
// Request
{
  players: [
    { playerId: string; email?: string; }  // email required if not on file
  ];
  deadline?: string;         // ISO date, default: 72 hours
  message?: string;          // Custom message in email
}

// Response
{
  sent: number;
  failed: [{ playerId, error }];
}
```

### Stripe Customer Portal

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/stripe/portal-session` | Create portal session | user |

**POST /api/stripe/portal-session**
```typescript
// Response
{
  url: string;               // Redirect to Stripe Customer Portal
}
```

### Stripe Audit Log (Admin)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/stripe/events` | List Stripe events | admin |
| GET | `/api/stripe/events/:id` | Get event details | admin |

**GET /api/stripe/events**
```typescript
// Query params
?page=1&limit=50&type=checkout.session.completed&tournamentId=xxx&startDate=xxx&endDate=xxx

// Response
{
  events: [...];
  total: number;
  page: number;
  totalPages: number;
}
```

### Revenue Reports (Admin)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/reports/revenue` | Revenue report | admin |
| GET | `/api/reports/revenue/:tournamentId` | Per-tournament revenue | admin |
| GET | `/api/reports/revenue/export` | Export CSV | admin |

**GET /api/reports/revenue**
```typescript
// Query params
?startDate=xxx&endDate=xxx&groupBy=tournament|day|week|month

// Response
{
  totalRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  netRevenue: number;
  breakdown: [
    { 
      key: string;           // Tournament name or date
      revenue: number;
      transactions: number;
      refunds: number;
    }
  ]
}
```

---

## Frontend Routes

### Admin Pages (New)

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/settings/stripe` | StripeSettingsPage | Global Stripe config |
| `/admin/settings/stripe/discounts` | DiscountCodesPage | Manage discount codes |
| `/admin/settings/stripe/log` | StripeLogPage | Payment event log |
| `/admin/reports/revenue` | RevenueReportPage | Revenue analytics |
| `/admin/tournaments/:id/tickets` | TournamentTicketsPage | Ticket list for tournament |
| `/admin/tournaments/:id/invitations` | InvitationsPage | Manage invites |
| `/admin/scanner` | CheckInScannerPage | QR scanner for check-in |

### Player Pages (New/Updated)

| Route | Component | Description |
|-------|-----------|-------------|
| `/profile` | ProfilePage | Add "My Tickets" section |
| `/checkout/success` | CheckoutSuccessPage | Post-payment confirmation |
| `/checkout/cancel` | CheckoutCancelPage | Cancelled/timeout handling |

### Tournament Pages (Updated)

| Route | Changes |
|-------|---------|
| `/tournaments/:id` | Show price, register button with reservation flow |
| `/tournaments/:id/register` | Checkout flow with timer banner |

---

## Frontend Components (New)

### Checkout Flow
- `ReservationTimer` - Banner showing countdown
- `CheckoutButton` - Handles reserve → Stripe redirect
- `DiscountCodeInput` - Validate and apply codes
- `CheckoutSuccess` - Confirmation with ticket preview
- `CheckoutCancel` - Timeout/cancel messaging

### Tickets
- `TicketCard` - Display single ticket with QR
- `TicketList` - User's tickets on profile
- `TicketResendButton` - Resend email action

### Scanner
- `QRScanner` - Camera-based QR reader
- `ManualLookup` - Text input for ticket code
- `CheckInResult` - Success/duplicate/error display
- `CheckInConfirm` - One-tap confirmation

### Admin
- `StripeSettingsForm` - Global pricing config
- `DiscountCodeForm` - Create/edit discount
- `DiscountCodeTable` - List with actions
- `StripeEventLog` - Paginated event table
- `RevenueChart` - Revenue visualization
- `InvitationManager` - Bulk invite interface

---

## Background Jobs

### Reservation Cleanup
- **Schedule:** Every 1 minute
- **Action:** Find reservations where `expiresAt < now` and `status = 'active'`
- **Process:** 
  1. Set status to 'expired'
  2. Decrement tournament `spotsReserved`
  3. Optional: Send "slot expired" email

### Invitation Reminders (Optional)
- **Schedule:** Daily at 9 AM
- **Action:** Find invitations expiring in 24 hours with `status = 'pending'`
- **Process:** Send reminder email, update `lastReminderAt`

---

## Environment Variables (New)

```bash
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Stripe Customer Portal
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...  # If custom portal config

# Reservation timing
RESERVATION_TIMEOUT_MINUTES=20
```

---

## Stripe Products/Prices Strategy

**Option A: Dynamic Prices (Recommended)**
- Create Stripe Price on-the-fly for each checkout
- More flexible, no pre-configuration needed
- Use `price_data` in checkout session creation

**Option B: Pre-created Products**
- One Product per tournament
- Requires sync between DB and Stripe
- Better for recurring tournaments

**Recommendation:** Option A for v2.1.0, consider B for memberships later.

---

## Security Considerations

1. **Webhook Verification** - Always verify Stripe signature
2. **Idempotency** - Handle duplicate webhook deliveries
3. **Race Conditions** - Use atomic operations for slot reservation
4. **Price Tampering** - Always calculate price server-side
5. **Ticket Validation** - QR codes should be cryptographically verifiable
6. **Rate Limiting** - Limit reservation attempts per user

---

## Migration Path

1. Add new models (DiscountCode, SlotReservation, TournamentTicket, TournamentInvitation, StripeEvent)
2. Update Tournament model with pricing fields
3. Add Stripe settings to SystemSettings
4. Deploy backend routes
5. Deploy frontend pages
6. Configure Stripe webhooks in dashboard
7. Test in Stripe test mode
8. Switch to live keys for production

---

*Document Version: 1.0*
*Last Updated: 2026-02-06*
