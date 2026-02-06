# Phase 4: Stripe Payments & QR Ticketing - Technical Specification

*Created: 2026-02-06*
*Status: PLANNING*
*Security Level: HIGH - Payment data handling*

---

## Overview

Integrate Stripe Checkout for paid tournament registration with QR ticket generation and scanning for day-of-event check-in.

---

## Security Requirements

### Must Have
- [ ] All payment processing via Stripe Checkout (hosted) - no card data touches our servers
- [ ] Webhook signature verification using `stripe.webhooks.constructEvent()`
- [ ] Stripe API keys stored ONLY in environment variables
- [ ] Webhook endpoint secret stored in environment variables
- [ ] HTTPS required for all payment endpoints (enforced in production)
- [ ] Idempotency keys for payment operations
- [ ] Rate limiting on payment endpoints

### PCI Compliance
- Using Stripe Checkout (hosted mode) = **SAQ A** compliance level
- No card data stored, processed, or transmitted by our servers
- Stripe handles all PCI DSS requirements

---

## Environment Variables (New)

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...        # Backend only
STRIPE_PUBLISHABLE_KEY=pk_test_...   # Can be exposed to frontend
STRIPE_WEBHOOK_SECRET=whsec_...      # For webhook signature verification

# Optional: Stripe Connect (if supporting multiple organizers)
# STRIPE_CONNECT_CLIENT_ID=ca_...
```

---

## Database Models (New)

### 1. TournamentTicket

```typescript
interface ITournamentTicket {
  _id: ObjectId;
  
  // References
  tournamentId: ObjectId;           // ref: Tournament
  playerId?: ObjectId;              // ref: Player (if linked)
  userId?: ObjectId;                // ref: User (if registered user)
  
  // Ticket Info
  ticketCode: string;               // Unique code (UUID or short alphanumeric)
  ticketType: 'standard' | 'early_bird' | 'comp';
  qrCodeData: string;               // Data encoded in QR (ticket URL or code)
  
  // Payment Info
  stripeSessionId?: string;         // Stripe Checkout Session ID
  stripePaymentIntentId?: string;   // For refund reference
  amountPaid: number;               // In cents
  currency: string;                 // 'usd'
  
  // Status
  status: 'pending_payment' | 'paid' | 'checked_in' | 'refunded' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'partial_refund';
  
  // Check-in
  checkedInAt?: Date;
  checkedInBy?: ObjectId;           // Admin who scanned
  
  // Metadata
  playerName: string;               // Denormalized for quick display
  playerEmail: string;              // For ticket delivery
  teamName?: string;                // If team registration
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;                 // For pending tickets
}
```

### 2. Tournament Model Updates

```typescript
// Add to existing Tournament schema
interface ITournamentPricing {
  enabled: boolean;
  entryFee: number;                 // In cents (e.g., 2500 = $25.00)
  earlyBirdFee?: number;            // Discounted price
  earlyBirdDeadline?: Date;
  currency: string;                 // 'usd'
  refundPolicy?: string;            // Text description
  refundDeadline?: Date;            // Last date for refunds
}
```

---

## API Endpoints (New)

### Payment Routes (`/api/payments`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/checkout/create` | User | Create Stripe Checkout session |
| GET | `/checkout/status/:sessionId` | User | Check payment status |
| POST | `/webhook` | Public* | Stripe webhook handler |
| GET | `/tickets/:ticketId` | User | Get ticket details |
| POST | `/tickets/:ticketId/refund` | Admin | Request refund |

*Webhook is public but verified via Stripe signature

### Player Transaction Routes (`/api/profile`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/transactions` | User | List user's payment history |
| GET | `/tickets` | User | List user's tickets (all tournaments) |
| POST | `/billing-portal` | User | Create Stripe Customer Portal session |

**Stripe Customer Portal** allows players to:
- View all payment history with receipts
- Request refunds (if policy allows)
- Update payment methods for future purchases
- Download invoices

### Check-in Routes (`/api/checkin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/scan` | Admin | Validate and check in ticket |
| GET | `/lookup/:code` | Admin | Manual ticket lookup |
| GET | `/tournament/:id/tickets` | Admin | List all tickets for tournament |
| POST | `/manual` | Admin | Create manual ticket (cash payment) |

---

## Stripe Integration Flow

### 1. Create Checkout Session (Backend)

```typescript
// POST /api/payments/checkout/create
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${tournament.name} - Entry Fee`,
        description: `Tournament on ${tournament.date}`,
      },
      unit_amount: tournament.pricing.entryFee, // In cents
    },
    quantity: 1,
  }],
  metadata: {
    tournamentId: tournament._id.toString(),
    playerId: player._id?.toString(),
    userId: user._id.toString(),
    playerName: `${user.firstName} ${user.lastName}`,
    playerEmail: user.email,
  },
  customer_email: user.email,
  success_url: `${APP_URL}/tournaments/${tournamentId}/registration/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/tournaments/${tournamentId}/registration/cancelled`,
  expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
});

// Return session.url for redirect
```

### 2. Webhook Handler

```typescript
// POST /api/payments/webhook
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);

switch (event.type) {
  case 'checkout.session.completed':
    await handleCheckoutComplete(event.data.object);
    break;
  case 'charge.refunded':
    await handleRefund(event.data.object);
    break;
}
```

### 3. Webhook Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create ticket, send QR email |
| `checkout.session.expired` | Clean up pending registration |
| `charge.refunded` | Update ticket status |
| `payment_intent.payment_failed` | Notify user, log failure |

---

## QR Ticket System

### QR Code Contents

Option A (Recommended): **Ticket URL**
```
https://bod.lightmedia.club/checkin/verify/{ticketCode}
```
- Scannable with any QR reader
- Opens in browser showing ticket status
- Admin can verify without special app

Option B: **Raw Ticket Code**
```
BOD-2026-ABCD1234
```
- Requires app/scanner to look up
- More secure (no URL exposed)

### QR Code Generation

```typescript
import QRCode from 'qrcode';

async function generateTicketQR(ticket: ITournamentTicket): Promise<string> {
  const url = `${APP_URL}/checkin/verify/${ticket.ticketCode}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });
  return qrDataUrl; // base64 data URL for embedding
}
```

### Ticket Email Template

```html
<h1>Your Ticket for {tournament.name}</h1>
<p>Date: {tournament.date}</p>
<p>Player: {ticket.playerName}</p>
<p>Ticket #: {ticket.ticketCode}</p>

<img src="{qrCodeDataUrl}" alt="QR Code" />

<p>Show this QR code at check-in.</p>
<a href="{addToCalendarUrl}">Add to Calendar</a>
```

---

## Frontend Components (New)

### Pages

| Page | Route | Description |
|------|-------|-------------|
| `TournamentCheckout` | `/tournaments/:id/checkout` | Pre-checkout with pricing info |
| `RegistrationSuccess` | `/tournaments/:id/registration/success` | Post-payment confirmation |
| `TicketView` | `/tickets/:code` | View ticket details + QR |
| `CheckInScanner` | `/admin/checkin/:tournamentId` | Admin scanner interface |
| `TicketManagement` | `/admin/tournaments/:id/tickets` | Admin ticket list |
| `MyTickets` | `/profile/tickets` | Player's ticket history |
| `MyTransactions` | `/profile/transactions` | Player's payment history + Stripe Portal link |

### Components

| Component | Description |
|-----------|-------------|
| `StripeCheckoutButton` | Initiates checkout redirect |
| `PricingDisplay` | Shows entry fee, early bird |
| `QRScanner` | Camera-based QR scanner |
| `TicketCard` | Display ticket info |
| `CheckInStatus` | Shows checked-in count |

---

## Implementation Order

### Phase 4A: Backend Foundation (Security First)
1. [ ] Add Stripe SDK (`stripe` npm package)
2. [ ] Create environment variable config
3. [ ] Create TournamentTicket model
4. [ ] Update Tournament model with pricing
5. [ ] Implement webhook endpoint with signature verification
6. [ ] Add checkout session creation endpoint
7. [ ] Write tests for payment flows

### Phase 4B: Ticket Generation
1. [ ] Implement ticket code generation (UUID or short code)
2. [ ] Add QR code generation service
3. [ ] Create ticket email template
4. [ ] Integrate with EmailService for delivery
5. [ ] Write tests for ticket generation

### Phase 4C: Frontend Checkout
1. [ ] Add pricing display to tournament detail
2. [ ] Create checkout initiation flow
3. [ ] Build success/cancel pages
4. [ ] Add ticket viewing page
5. [ ] Test full checkout flow

### Phase 4D: Check-in System
1. [ ] Build QR scanner component
2. [ ] Create check-in API endpoints
3. [ ] Build admin ticket management UI
4. [ ] Add manual ticket creation (cash)
5. [ ] Test check-in flow

---

## Testing Strategy

### Unit Tests
- Webhook signature verification
- Ticket code generation uniqueness
- QR code generation
- Price calculation (early bird logic)

### Integration Tests
- Stripe test mode checkout flow
- Webhook delivery simulation
- Email delivery with QR attachment

### E2E Tests
- Full registration → payment → ticket → check-in flow
- Refund flow
- Manual ticket creation

---

## Stripe Test Mode

During development:
- Use `sk_test_*` and `pk_test_*` keys
- Test card: `4242 4242 4242 4242`
- Stripe CLI for webhook testing: `stripe listen --forward-to localhost:3001/api/payments/webhook`

---

## Dependencies (New)

```json
{
  "stripe": "^14.x",      // Stripe Node.js SDK
  "qrcode": "^1.5.x"      // QR code generation
}
```

Frontend:
```json
{
  "@stripe/stripe-js": "^2.x"  // If using Stripe Elements (optional)
}
```

---

## Questions to Resolve

1. **Ticket code format**: UUID vs short alphanumeric (e.g., `BOD-ABCD1234`)?
2. **Refund policy**: Full refund until X days before? Partial?
3. **Team registration**: One ticket per team or per player?
4. **Comp tickets**: How are free/comped tickets handled?
5. **Waitlist**: Does paying secure spot or just register interest?

---

## References

- [Stripe Checkout API](https://docs.stripe.com/api/checkout/sessions)
- [Stripe Webhooks Guide](https://docs.stripe.com/webhooks)
- [Stripe Test Cards](https://docs.stripe.com/testing)
- [QRCode npm package](https://www.npmjs.com/package/qrcode)
