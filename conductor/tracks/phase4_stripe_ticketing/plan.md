# Plan: Phase 4 - Stripe Payments & QR Ticketing

## Overview
Implement paid tournament registration with Stripe Checkout and QR ticket system for event check-in.

---

## Phase 4A: Backend Foundation (Security First)

### 4A.1: Environment & Dependencies
- [ ] Add `stripe` npm package to backend
- [ ] Add `qrcode` npm package to backend  
- [ ] Create Stripe config in `.env.example`
- [ ] Add STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET to docker-compose
- [ ] Create `src/backend/config/stripe.ts` for SDK initialization

### 4A.2: Database Models
- [ ] Create `TournamentTicket` model with full schema
- [ ] Add `pricing` field to Tournament model
- [ ] Create indexes for ticket lookups (ticketCode, tournamentId, status)
- [ ] Write model tests

### 4A.3: Webhook Security (CRITICAL)
- [ ] Create webhook endpoint `/api/payments/webhook`
- [ ] Implement raw body parsing middleware
- [ ] Implement Stripe signature verification
- [ ] Handle `checkout.session.completed` event
- [ ] Handle `charge.refunded` event
- [ ] Handle `checkout.session.expired` event
- [ ] Write webhook tests with mock signatures

### 4A.4: Checkout Session API
- [ ] Create `/api/payments/checkout/create` endpoint
- [ ] Validate tournament has pricing enabled
- [ ] Check user isn't already registered
- [ ] Calculate correct price (early bird vs standard)
- [ ] Create Stripe Checkout Session with metadata
- [ ] Return session URL for redirect
- [ ] Write checkout tests

---

## Phase 4B: Ticket Generation

### 4B.1: Ticket Service
- [ ] Create `TicketService` class
- [ ] Implement secure ticket code generation
- [ ] Implement QR code generation (data URL)
- [ ] Implement ticket creation on payment success
- [ ] Write ticket service tests

### 4B.2: Email Integration
- [ ] Create ticket email template (HTML)
- [ ] Add QR code as inline image
- [ ] Add "Add to Calendar" link
- [ ] Integrate with existing EmailService
- [ ] Write email template tests

### 4B.3: Ticket API
- [ ] Create `/api/payments/tickets/:ticketId` GET endpoint
- [ ] Create `/api/payments/tickets/:ticketId/refund` POST endpoint
- [ ] Create `/api/checkin/lookup/:code` GET endpoint
- [ ] Write ticket API tests

---

## Phase 4C: Frontend Checkout

### 4C.1: Tournament Pricing UI
- [ ] Add pricing display to TournamentDetail page
- [ ] Show early bird countdown if applicable
- [ ] Show "Register" vs "Pay & Register" button based on pricing
- [ ] Create `PricingDisplay` component

### 4C.2: Checkout Flow
- [ ] Create `TournamentCheckout` page
- [ ] Display order summary
- [ ] "Proceed to Payment" button → Stripe redirect
- [ ] Handle loading/error states

### 4C.3: Post-Payment Pages
- [ ] Create `RegistrationSuccess` page
- [ ] Fetch ticket details after redirect
- [ ] Display confirmation + QR code
- [ ] "View Ticket" link
- [ ] Create `RegistrationCancelled` page

### 4C.4: Ticket Viewing
- [ ] Create `TicketView` page (`/tickets/:code`)
- [ ] Display ticket details
- [ ] Show QR code (large, scannable)
- [ ] Print button
- [ ] Download ticket as PDF (optional)

---

## Phase 4D: Check-in System

### 4D.1: Scanner UI
- [ ] Create `CheckInScanner` page
- [ ] Integrate camera QR scanner library
- [ ] Handle permission requests
- [ ] Parse scanned code
- [ ] Call check-in API

### 4D.2: Check-in API
- [ ] Create `/api/checkin/scan` POST endpoint
- [ ] Validate ticket code
- [ ] Check ticket status (not already checked in, not refunded)
- [ ] Update ticket status to `checked_in`
- [ ] Return player/ticket info for confirmation

### 4D.3: Manual Check-in
- [ ] Create `/api/checkin/manual` POST endpoint
- [ ] Create manual ticket entry UI
- [ ] Support cash payment recording
- [ ] Support comp ticket creation

### 4D.4: Ticket Management
- [ ] Create `TicketManagement` admin page
- [ ] List all tickets for tournament
- [ ] Filter by status (paid, checked_in, refunded)
- [ ] Search by name/code
- [ ] Bulk actions (export CSV)

---

## Testing Checklist

### Before Merge
- [ ] All unit tests pass
- [ ] Webhook signature verification tested
- [ ] Stripe test mode checkout works end-to-end
- [ ] QR code scans correctly
- [ ] Email delivery works
- [ ] Check-in flow works

### Production Prep
- [ ] Switch to live Stripe keys
- [ ] Verify webhook endpoint accessible
- [ ] Test with real card (small amount, refund)
- [ ] Monitor Stripe Dashboard for events

---

## Questions for Client

1. What is the entry fee? (e.g., $25)
2. Is there early bird pricing? If so, how much discount and until when?
3. What is the refund policy?
4. Are team registrations one ticket or multiple?
5. How should comp/free tickets be handled?

---

## Success Criteria

1. ✅ Players can pay for tournament entry via Stripe
2. ✅ Tickets are generated and emailed automatically
3. ✅ QR codes scan correctly on mobile
4. ✅ Admins can check in players at the door
5. ✅ Refunds work correctly
6. ✅ No payment data stored on our servers
