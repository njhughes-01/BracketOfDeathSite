---
name: bod-backend
description: Bracket of Death backend development with Node.js, Express, TypeScript, and MongoDB/Mongoose. Use when building API endpoints, models, controllers, services, or fixing backend issues. Knows project patterns, auth middleware, model conventions, and service patterns.
---

# BOD Backend Development

Build Node.js/Express/MongoDB backend for Bracket of Death.

## Stack
- Node.js + TypeScript
- Express.js
- MongoDB + Mongoose
- Keycloak for auth
- Jest for testing

## Project Structure
```
src/backend/
├── controllers/      # Request handlers
├── models/           # Mongoose models
├── routes/           # Express routes
├── services/         # Business logic
├── middleware/       # Auth, validation, errors
├── types/            # TypeScript interfaces
├── config/           # Database, env config
└── utils/            # Logger, helpers
```

## Key Patterns

### Controller Pattern
Extend BaseController for consistent responses:

```typescript
import { Request, Response } from "express";
import { BaseController } from "./base";
import logger from "../utils/logger";

export class MyController extends BaseController {
  constructor() {
    super();
  }

  myMethod = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      
      // Validation
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid ID", 400);
      }
      
      // Business logic
      const result = await MyModel.findById(id);
      
      if (!result) {
        return this.sendNotFound(res, "Resource");
      }
      
      this.sendSuccess(res, { result }, "Retrieved successfully");
    }
  );
}

export const myController = new MyController();
export default myController;
```

### Response Methods (BaseController)
```typescript
this.sendSuccess(res, data, message, pagination?, statusCode?);
this.sendError(res, errorMessage, statusCode);
this.sendNotFound(res, resourceName);
```

### Model Pattern
```typescript
import mongoose, { Schema, Document } from "mongoose";

export interface IMyModel extends Document {
  name: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  
  // Virtuals
  isActive: boolean;
  
  // Methods
  activate(): Promise<void>;
}

const MyModelSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// Virtuals
MyModelSchema.virtual("isActive").get(function(this: IMyModel) {
  return this.status === 'active';
});

// Methods
MyModelSchema.methods.activate = async function(): Promise<void> {
  this.status = 'active';
  await this.save();
};

// Indexes
MyModelSchema.index({ name: 1 });
MyModelSchema.index({ status: 1, createdAt: -1 });

// Include virtuals in JSON
MyModelSchema.set('toJSON', { virtuals: true });
MyModelSchema.set('toObject', { virtuals: true });

export default mongoose.model<IMyModel>("MyModel", MyModelSchema);
```

### Route Pattern
```typescript
import { Router } from "express";
import { myController } from "../controllers/MyController";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/", myController.list);
router.get("/:id", myController.get);

// Protected routes
router.post("/", requireAuth, myController.create);
router.put("/:id", requireAuth, myController.update);

// Admin routes
router.delete("/:id", requireAdmin, myController.delete);

export default router;
```

### Service Pattern
```typescript
import logger from '../utils/logger';

export const myFunction = async (param: string): Promise<Result> => {
  try {
    // Business logic
    const result = await someOperation(param);
    logger.info(`Operation completed: ${param}`);
    return result;
  } catch (error) {
    logger.error('Operation failed:', error);
    throw error;
  }
};

export default {
  myFunction,
};
```

## Auth Middleware
```typescript
// Require any authenticated user
import { requireAuth } from "../middleware/auth";

// Require admin role
import { requireAdmin } from "../middleware/auth";

// Require superadmin role
import { requireSuperAdmin } from "../middleware/auth";
```

## Accessing User in Controller
```typescript
const userId = (req as any).user?.sub || (req as any).user?.id;
const userEmail = (req as any).user?.email;
const isAdmin = (req as any).user?.roles?.includes('admin');
```

## Logger (Production-Safe)
```typescript
import logger from "../utils/logger";

logger.info('Message');
logger.error('Error:', error);
logger.warn('Warning');
logger.debug('Debug info');  // Only in development
```

## Testing
Run tests: `npm test` from `src/backend/`

## Self-Improvement

When encountering issues:
1. Check `references/patterns.md` for existing solutions
2. If new pattern discovered, update `references/patterns.md`
3. If bug found, add to `references/known-issues.md` with fix

See `references/patterns.md` for API patterns and `references/known-issues.md` for past bugs.
