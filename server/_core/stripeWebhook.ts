/**
 * Stripe Webhook Handler
 *
 * Registered as an Express route BEFORE the global JSON body parser
 * so the raw body is available for Stripe signature verification.
 */

import type { Express, Request, Response } from "express";
import express from "express";
import { ENV } from "./env";

export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!ENV.stripeSecretKey) {
        res.status(500).json({ error: "Stripe not configured" });
        return;
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(ENV.stripeSecretKey);
      const sig = req.headers["stripe-signature"] as string;

      let event;
      try {
        if (ENV.stripeWebhookSecret) {
          event = stripe.webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret);
        } else {
          // Dev mode: parse without signature verification
          event = JSON.parse(req.body.toString());
        }
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        res.status(400).json({ error: "Invalid signature" });
        return;
      }

      if (event.type === "checkout.session.completed") {
        const { handleCheckoutCompleted } = await import("../stripeService");
        await handleCheckoutCompleted(event.data.object);
      }

      res.json({ received: true });
    },
  );
}
