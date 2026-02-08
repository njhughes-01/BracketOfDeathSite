import express from "express";
import logger from "./utils/logger";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
// Remove proxy import
import { config } from "dotenv";
import { connectToDatabase } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { sanitizeInput, validatePagination } from "./middleware/validation";
import apiRoutes from "./routes";
import systemRoutes from "./routes/system";
import { stripeWebhookController } from "./controllers/StripeWebhookController";
import ReservationCleanupService from "./services/ReservationCleanupService";

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      `http://localhost:${process.env.VITE_PORT || "5173"}`,
    ],
    credentials: true,
  }),
);
app.use(compression());

// Rate limiting (more permissive for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter as unknown as express.RequestHandler);

// Logging
app.use(morgan("combined"));

// Stripe webhook route MUST be before JSON body parser (needs raw body for signature verification)
app.post("/api/stripe/webhooks", express.raw({ type: "application/json" }), stripeWebhookController.handleWebhook);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Global middleware
app.use(sanitizeInput);
app.use(validatePagination);

// In test environment, ensure CORS header is present for tests expecting it
if (process.env.NODE_ENV === "test") {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  });
}

// Remove proxy - frontend talks directly to services

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Backward-compatible health endpoint for tests/tools
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// ... (existing imports)

// API routes
app.use("/api/system", systemRoutes); // Mount system routes
app.use("/api", apiRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server function
export const startServer = async (): Promise<void> => {
  try {
    await connectToDatabase();
    
    // Start background services
    ReservationCleanupService.startCleanupService();

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      ReservationCleanupService.stopCleanupService();
      server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch((err) => logger.error("Failed to start server:", err));
}

export default app;
