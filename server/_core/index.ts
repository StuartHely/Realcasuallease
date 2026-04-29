import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerImageProxyRoutes } from "./imageProxy";
import { registerPlaceholderRoutes } from "./placeholderImage";
import { healthRouter } from "./health";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Stripe webhook must be registered BEFORE global JSON parser (needs raw body)
  const { registerStripeWebhook } = await import("./stripeWebhook");
  registerStripeWebhook(app);
  // Security headers
  const helmet = (await import("helmet")).default;
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https://maps.googleapis.com", "https://*.amazonaws.com", "https://*.cloudfront.net", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" as const },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" as const },
  }));

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Tenant resolution: maps hostname → ownerId for multi-tenancy
  const { tenantMiddleware } = await import("../tenantResolver");
  app.use(tenantMiddleware);
  // Health check endpoints for Kubernetes probes
  app.use(healthRouter);
  // Image proxy for fallback when CloudFront URLs fail
  registerImageProxyRoutes(app);
  // Placeholder image generator
  registerPlaceholderRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Initialize weekly report scheduler
  const { initializeReportScheduler } = await import('../reportScheduler');
  initializeReportScheduler();

    // Initialize payment reminder scheduler
  const { startPaymentReminderScheduler } = await import('../paymentReminderScheduler');
  startPaymentReminderScheduler();

  // Initialize rate validation scheduler
  const { startRateValidationScheduler } = await import('../rateValidationScheduler');
  startRateValidationScheduler();

  // Ensure critical columns exist (catches cases where drizzle migrations were skipped)
  const { getDb } = await import('../db');
  getDb().then(async (dbInst) => {
    if (!dbInst) return;
    const fixes = [
      // users
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(64) UNIQUE`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255)`,
      // bookings - all columns that may have been missed
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refundStatus" varchar(50)`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refundPendingAt" timestamp`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "invoiceDispatchedAt" timestamp`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "recurrenceGroupId" varchar(50)`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignatureToken" varchar(64)`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedAt" timestamp`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByName" varchar(255)`,
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByIp" varchar(45)`,
      // vacant_shop_bookings
      `ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL`,
      `ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignatureToken" varchar(64)`,
      `ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedAt" timestamp`,
      `ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByName" varchar(255)`,
      `ALTER TABLE "vacant_shop_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByIp" varchar(45)`,
      // third_line_bookings
      `ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL`,
      `ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignatureToken" varchar(64)`,
      `ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedAt" timestamp`,
      `ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByName" varchar(255)`,
      `ALTER TABLE "third_line_bookings" ADD COLUMN IF NOT EXISTS "licenceSignedByIp" varchar(45)`,
      // Drop old column if exists
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "invoiceOverride"`,
    ];
    let fixed = 0;
    for (const sql of fixes) {
      try { await dbInst.execute(sql); fixed++; } catch (e) { /* ignore */ }
    }
    // Fix sequences that may be out of sync after DB restore/import
    const seqFixes = [
      `SELECT setval(pg_get_serial_sequence('"bookings"', 'id'), COALESCE((SELECT MAX(id) FROM "bookings"), 0) + 1, false)`,
      `SELECT setval(pg_get_serial_sequence('"vacant_shop_bookings"', 'id'), COALESCE((SELECT MAX(id) FROM "vacant_shop_bookings"), 0) + 1, false)`,
      `SELECT setval(pg_get_serial_sequence('"third_line_bookings"', 'id'), COALESCE((SELECT MAX(id) FROM "third_line_bookings"), 0) + 1, false)`,
      `SELECT setval(pg_get_serial_sequence('"booking_status_history"', 'id'), COALESCE((SELECT MAX(id) FROM "booking_status_history"), 0) + 1, false)`,
      `SELECT setval(pg_get_serial_sequence('"users"', 'id'), COALESCE((SELECT MAX(id) FROM "users"), 0) + 1, false)`,
    ];
    for (const sql of seqFixes) {
      try { await dbInst.execute(sql); } catch (e) { /* table may not exist yet */ }
    }
    console.log(`[StartupMigration] ${fixed}/${fixes.length} column checks passed, sequences synced`);
  }).catch(() => {});

  // Backfill slugs for any centres that don't have them yet
  const { backfillCentreSlugs } = await import('../slugMigration');
  backfillCentreSlugs().catch(err => console.error('[SlugMigration] Error:', err));

  // Migrate centre-level maps to floor levels (one-time for existing data)
  const { migrateAllCentreMapsToFloorLevels } = await import('../db');
  migrateAllCentreMapsToFloorLevels()
    .then(count => { if (count > 0) console.log(`[MapMigration] Migrated ${count} centre maps to floor levels`); })
    .catch(err => console.error('[MapMigration] Error:', err));
}

startServer().catch(console.error);