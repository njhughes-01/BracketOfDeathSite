# Backend Patterns

## Table of Contents
- [Pagination](#pagination)
- [Search/Filter](#searchfilter)
- [Transactions](#transactions)
- [Webhook Handling](#webhook-handling)
- [Background Jobs](#background-jobs)

---

## Pagination

Standard pagination response:

```typescript
const page = parseInt(req.query.page as string) || 1;
const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  Model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
  Model.countDocuments(query),
]);

this.sendSuccess(res, { items }, "Items retrieved", {
  current: page,
  pages: Math.ceil(total / limit),
  count: items.length,
  total,
});
```

## Search/Filter

Build query from request:

```typescript
const { search, status, startDate, endDate } = req.query;

const query: any = {};

if (search) {
  query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
}

if (status) query.status = status;

if (startDate || endDate) {
  query.createdAt = {};
  if (startDate) query.createdAt.$gte = new Date(startDate as string);
  if (endDate) query.createdAt.$lte = new Date(endDate as string);
}

const results = await Model.find(query);
```

## Transactions

For multi-document operations:

```typescript
import mongoose from 'mongoose';

const session = await mongoose.startSession();
session.startTransaction();

try {
  await ModelA.create([{ ... }], { session });
  await ModelB.updateOne({ ... }, { ... }, { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

## Webhook Handling

Stripe webhook pattern:

```typescript
handleWebhook = this.asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    
    let event: Stripe.Event;
    
    // Verify signature
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      return this.sendError(res, `Signature verification failed`, 400);
    }
    
    // Process event (idempotent)
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event);
          break;
        // ... other cases
      }
      
      // Log for audit
      await EventLog.create({ eventId: event.id, type: event.type, ... });
      
      // Always return 200 to acknowledge receipt
      res.status(200).json({ received: true });
      
    } catch (error) {
      // Log error but still return 200 to prevent retries
      logger.error('Webhook processing error:', error);
      res.status(200).json({ received: true, error: error.message });
    }
  }
);
```

## Background Jobs

Simple interval-based cleanup:

```typescript
let cleanupInterval: NodeJS.Timeout | null = null;

export const runCleanup = async (): Promise<void> => {
  const expiredCount = await Model.updateMany(
    { status: 'active', expiresAt: { $lt: new Date() } },
    { status: 'expired' }
  );
  
  if (expiredCount.modifiedCount > 0) {
    logger.info(`Cleaned up ${expiredCount.modifiedCount} expired items`);
  }
};

export const startCleanupService = (): void => {
  if (cleanupInterval) return;
  
  logger.info('Starting cleanup service');
  runCleanup(); // Run immediately
  cleanupInterval = setInterval(runCleanup, 60 * 1000); // Then every minute
};

export const stopCleanupService = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};
```

---

*Add new patterns here as they're discovered*
