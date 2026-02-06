import Stripe from 'stripe';
import logger from '../utils/logger';
import SystemSettings from '../models/SystemSettings';

// Stripe API version - use the version from the installed SDK
const STRIPE_API_VERSION = '2026-01-28.clover' as const;

// Initialize Stripe with secret key from environment
let stripeInstance: Stripe | null = null;

/**
 * Get or initialize the Stripe client
 * Prioritizes environment variables over database settings
 */
export const getStripeClient = async (): Promise<Stripe> => {
  // Check environment variable first
  let secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    // Fall back to database settings
    const settings = await SystemSettings.findOne().select('+stripeSecretKey');
    secretKey = settings?.stripeSecretKey;
  }
  
  if (!secretKey) {
    throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY environment variable or configure in admin settings.');
  }
  
  // Create new instance if key changed or not initialized
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  
  return stripeInstance;
};

/**
 * Check if Stripe is configured
 */
export const isStripeConfigured = async (): Promise<boolean> => {
  try {
    if (process.env.STRIPE_SECRET_KEY) return true;
    
    const settings = await SystemSettings.findOne().select('+stripeSecretKey');
    return !!settings?.stripeSecretKey;
  } catch {
    return false;
  }
};

/**
 * Get the publishable key for frontend
 */
export const getPublishableKey = async (): Promise<string | null> => {
  // Check environment variable first
  if (process.env.STRIPE_PUBLISHABLE_KEY) {
    return process.env.STRIPE_PUBLISHABLE_KEY;
  }
  
  // Fall back to database settings
  const settings = await SystemSettings.findOne();
  return settings?.stripePublishableKey || null;
};

export interface CreateCheckoutSessionParams {
  tournamentId: string;
  tournamentName: string;
  userId: string;
  playerId: string;
  playerEmail: string;
  reservationId: string;
  amount: number; // In cents
  discountCode?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe Checkout Session for tournament registration
 */
export const createCheckoutSession = async (
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> => {
  const stripe = await getStripeClient();
  
  const {
    tournamentId,
    tournamentName,
    userId,
    playerId,
    playerEmail,
    reservationId,
    amount,
    discountCode,
    successUrl,
    cancelUrl,
  } = params;
  
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: playerEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: `Tournament Entry: ${tournamentName}`,
            description: `Registration for Bracket of Death tournament`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      tournamentId,
      userId,
      playerId,
      reservationId,
      discountCode: discountCode || '',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes
  };
  
  // Apply discount if provided
  if (discountCode) {
    try {
      // Look up the coupon in Stripe
      const coupons = await stripe.coupons.list({ limit: 100 });
      const coupon = coupons.data.find(c => 
        c.name?.toUpperCase() === discountCode.toUpperCase() ||
        c.id.toUpperCase() === discountCode.toUpperCase()
      );
      
      if (coupon) {
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    } catch (error) {
      logger.warn(`Failed to apply discount code ${discountCode}:`, error);
      // Continue without discount
    }
  }
  
  const session = await stripe.checkout.sessions.create(sessionParams);
  
  logger.info(`Checkout session created: ${session.id} for tournament ${tournamentId}`);
  
  return session;
};

export interface CreateCouponParams {
  code: string;
  type: 'percent' | 'amount';
  percentOff?: number;
  amountOff?: number;
  maxRedemptions?: number;
  expiresAt?: Date;
}

/**
 * Create a Stripe Coupon
 */
export const createCoupon = async (params: CreateCouponParams): Promise<Stripe.Coupon> => {
  const stripe = await getStripeClient();
  
  const { code, type, percentOff, amountOff, maxRedemptions, expiresAt } = params;
  
  const couponParams: Stripe.CouponCreateParams = {
    id: code.toUpperCase(),
    name: code.toUpperCase(),
    ...(type === 'percent' && { percent_off: percentOff }),
    ...(type === 'amount' && { amount_off: amountOff, currency: 'usd' }),
    ...(maxRedemptions && { max_redemptions: maxRedemptions }),
    ...(expiresAt && { redeem_by: Math.floor(expiresAt.getTime() / 1000) }),
  };
  
  const coupon = await stripe.coupons.create(couponParams);
  
  logger.info(`Stripe coupon created: ${coupon.id}`);
  
  return coupon;
};

/**
 * Delete a Stripe Coupon
 */
export const deleteCoupon = async (couponId: string): Promise<void> => {
  const stripe = await getStripeClient();
  
  await stripe.coupons.del(couponId);
  
  logger.info(`Stripe coupon deleted: ${couponId}`);
};

/**
 * Create a Customer Portal session for a user
 */
export const createPortalSession = async (
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> => {
  const stripe = await getStripeClient();
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return session;
};

/**
 * Find or create a Stripe Customer for a user
 */
export const findOrCreateCustomer = async (
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> => {
  const stripe = await getStripeClient();
  
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  });
  
  logger.info(`Stripe customer created: ${customer.id} for ${email}`);
  
  return customer;
};

/**
 * Verify Stripe webhook signature
 */
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  webhookSecret?: string
): Stripe.Event => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: STRIPE_API_VERSION,
  });
  
  const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!secret) {
    throw new Error('Stripe webhook secret not configured');
  }
  
  return stripe.webhooks.constructEvent(payload, signature, secret);
};

/**
 * Retrieve a Checkout Session
 */
export const retrieveCheckoutSession = async (
  sessionId: string
): Promise<Stripe.Checkout.Session> => {
  const stripe = await getStripeClient();
  
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'customer'],
  });
};

/**
 * Issue a refund for a payment intent
 */
export const createRefund = async (
  paymentIntentId: string,
  amount?: number, // In cents, undefined for full refund
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> => {
  const stripe = await getStripeClient();
  
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    ...(amount && { amount }),
    ...(reason && { reason }),
  };
  
  const refund = await stripe.refunds.create(refundParams);
  
  logger.info(`Refund created: ${refund.id} for payment intent ${paymentIntentId}`);
  
  return refund;
};

export default {
  getStripeClient,
  isStripeConfigured,
  getPublishableKey,
  createCheckoutSession,
  createCoupon,
  deleteCoupon,
  createPortalSession,
  findOrCreateCustomer,
  verifyWebhookSignature,
  retrieveCheckoutSession,
  createRefund,
};
