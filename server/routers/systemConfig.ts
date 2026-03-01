import { publicProcedure, protectedProcedure, ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getConfigValue, setConfigValue } from "../systemConfigDb";
import { TRPCError } from "@trpc/server";

// Helper function to check if user role is an owner role
function isOwnerRole(role: string): boolean {
  return [
    'owner_centre_manager',
    'owner_marketing_manager',
    'owner_regional_admin',
    'owner_state_admin',
    'owner_super_admin'
  ].includes(role);
}

export const systemConfigRouter = router({
  getGstPercentage: publicProcedure.query(async () => {
    const value = await getConfigValue("gst_percentage");
    return { gstPercentage: value ? parseFloat(value) : 10.0 };
  }),

  setGstPercentage: ownerProcedure
    .input(z.object({ gstPercentage: z.number().min(0).max(100) }))
    .mutation(async ({ input, ctx }) => {
      // Only mega_admin and owner_super_admin can change GST
      if (ctx.user.role !== "mega_admin" && ctx.user.role !== "owner_super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only SuperAdmin can change GST percentage" });
      }
      await setConfigValue("gst_percentage", input.gstPercentage.toString());
      return { success: true, gstPercentage: input.gstPercentage };
    }),

  // Get current logo selection
  getCurrentLogo: publicProcedure.query(async () => {
    const selectedLogo = await getConfigValue("selected_logo");
    return { selectedLogo: selectedLogo || "logo_1" }; // Default to logo_1
  }),

  // Set logo selection (MegaAdmin only)
  setLogo: adminProcedure
    .input(z.object({ 
      logoId: z.enum(["logo_1", "logo_2", "logo_3", "logo_4", "logo_5"]) 
    }))
    .mutation(async ({ input, ctx }) => {
      // Only mega_admin can change logo
      if (ctx.user.role !== "mega_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only MegaAdmin can change the logo" });
      }
      await setConfigValue("selected_logo", input.logoId);
      return { success: true, selectedLogo: input.logoId };
    }),

  // Upload custom logo (for future use - allows uploading the 5 logo options)
  uploadLogo: adminProcedure
    .input(z.object({
      logoId: z.enum(["logo_1", "logo_2", "logo_3", "logo_4", "logo_5"]),
      base64Image: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "mega_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only MegaAdmin can upload logos" });
      }

      // Extract base64 data
      const base64Data = input.base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Save locally to client/public/logos/
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure logos directory exists
      const logosDir = path.join(process.cwd(), 'client', 'public', 'logos');
      await fs.mkdir(logosDir, { recursive: true });
      
      // Save the file
      const filePath = path.join(logosDir, `${input.logoId}.png`);
      await fs.writeFile(filePath, buffer);
      
      // Store the local URL in system config
      const url = `/logos/${input.logoId}.png`;
      await setConfigValue(`${input.logoId}_url`, url);
      
      return { success: true, url };
    }),

  // Get all logo URLs
  getAllLogos: publicProcedure.query(async () => {
    const logos = await Promise.all([
      getConfigValue("logo_1_url"),
      getConfigValue("logo_2_url"),
      getConfigValue("logo_3_url"),
      getConfigValue("logo_4_url"),
      getConfigValue("logo_5_url"),
    ]);

    return {
      logo_1: logos[0] || "/logos/logo_1.png",
      logo_2: logos[1] || "/logos/logo_2.png",
      logo_3: logos[2] || "/logos/logo_3.png",
      logo_4: logos[3] || "/logos/logo_4.png",
      logo_5: logos[4] || "/logos/logo_5.png",
    };
  }),

  // Get logo for specific owner (returns owner's allocated logo or default)
  getOwnerLogo: publicProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ input }) => {
      // Get owner's allocated logo
      const owner = await db.getUserById(input.ownerId);
      
      if (owner?.allocatedLogoId) {
        // Get URL for owner's allocated logo
        const customUrl = await getConfigValue(`${owner.allocatedLogoId}_url`);
        return {
          logoId: owner.allocatedLogoId,
          logoUrl: customUrl || `/logos/${owner.allocatedLogoId}.png`,
        };
      }
      
      // Fallback to default platform logo
      const defaultLogo = await getConfigValue("selected_logo") || "logo_1";
      const defaultUrl = await getConfigValue(`${defaultLogo}_url`);
      return {
        logoId: defaultLogo,
        logoUrl: defaultUrl || `/logos/${defaultLogo}.png`,
      };
    }),

  // Get logo for current user (if owner, returns their allocated logo)
  getMyLogo: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    
    // If user is an owner and has allocated logo, return it
    if (user.allocatedLogoId && isOwnerRole(user.role)) {
      const customUrl = await getConfigValue(`${user.allocatedLogoId}_url`);
      return {
        logoId: user.allocatedLogoId,
        logoUrl: customUrl || `/logos/${user.allocatedLogoId}.png`,
      };
    }
    
    // Otherwise return platform default logo
    const defaultLogo = await getConfigValue("selected_logo") || "logo_1";
    const defaultUrl = await getConfigValue(`${defaultLogo}_url`);
    return {
      logoId: defaultLogo,
      logoUrl: defaultUrl || `/logos/${defaultLogo}.png`,
    };
  }),

  // Allocate logo to owner (MegaAdmin only)
  allocateLogoToOwner: adminProcedure
    .input(z.object({
      ownerId: z.number(),
      logoId: z.enum(["logo_1", "logo_2", "logo_3", "logo_4", "logo_5"]).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only mega_admin can allocate logos to owners
      if (ctx.user.role !== "mega_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only MegaAdmin can allocate logos to owners" });
      }

      // Verify the user is an owner
      const owner = await db.getUserById(input.ownerId);
      if (!owner) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Owner not found" });
      }

      if (!isOwnerRole(owner.role)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User is not an owner" });
      }

      // Update owner's allocated logo
      await db.updateUser(input.ownerId, {
        allocatedLogoId: input.logoId,
      });

      return { success: true, ownerId: input.ownerId, logoId: input.logoId };
    }),

  // Get all owners with their allocated logos (MegaAdmin only)
  getOwnersWithLogos: adminProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "mega_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only MegaAdmin can view owner logo allocations" });
    }

    const { getDb } = await import("../db");
    const { users } = await import("../../drizzle/schema");
    const { or, eq } = await import("drizzle-orm");
    
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    // Get all users with owner roles
    const owners = await dbConn
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        allocatedLogoId: users.allocatedLogoId,
        assignedState: users.assignedState,
      })
      .from(users)
      .where(
        or(
          eq(users.role, "owner_centre_manager"),
          eq(users.role, "owner_marketing_manager"),
          eq(users.role, "owner_regional_admin"),
          eq(users.role, "owner_state_admin"),
          eq(users.role, "owner_super_admin")
        )
      );

    return owners;
  }),

  // Auto-approval rules
  getAutoApprovalRules: adminProcedure.query(async () => {
    const { getAutoApprovalRules } = await import("../autoApprovalRules");
    return await getAutoApprovalRules();
  }),

  updateAutoApprovalRules: adminProcedure
    .input(z.object({
      enabled: z.boolean(),
      maxBookingValue: z.number().nullable(),
      minPriorBookings: z.number().nullable(),
      requireValidInsurance: z.boolean(),
      allowedCategoryIds: z.array(z.number()).nullable(),
      excludeCentreIds: z.array(z.number()).nullable(),
    }))
    .mutation(async ({ input }) => {
      const { setAutoApprovalRules } = await import("../autoApprovalRules");
      await setAutoApprovalRules(input);
      return { success: true };
    }),

  // Get rate validation alerts
  getRateValidationAlerts: publicProcedure.query(async () => {
    const { getRateValidationAlerts } = await import("../rateValidator");
    return await getRateValidationAlerts();
  }),

  // Get last rate validation check time
  getLastRateCheck: publicProcedure.query(async () => {
    const { getLastRateCheck } = await import("../rateValidator");
    return await getLastRateCheck();
  }),

  // Manually trigger rate validation (admin only)
  triggerRateValidation: adminProcedure.mutation(async () => {
    const { checkSiteRates } = await import("../rateValidator");
    const alerts = await checkSiteRates();
    return { alertCount: alerts.length, alerts };
  }),

  // Get SMTP configuration status (admin only)
  getSmtpStatus: adminProcedure.query(async () => {
    const { ENV } = await import("../_core/env");
    return {
      configured: !!(ENV.smtpHost && ENV.smtpUser && ENV.smtpPass && ENV.smtpFrom),
      host: ENV.smtpHost || "(not set)",
      port: ENV.smtpPort,
      secure: ENV.smtpSecure,
      from: ENV.smtpFrom || "(not set)",
      appUrl: ENV.appUrl || "(not set)",
    };
  }),

  // Send test email (admin only)
  sendTestEmail: adminProcedure
    .input(z.object({ to: z.string().email() }))
    .mutation(async ({ input }) => {
      const { sendEmail } = await import("../_core/email");
      const success = await sendEmail({
        to: input.to,
        subject: "Real Casual Leasing — SMTP Test Email",
        html: `
          <h2>SMTP Configuration Test</h2>
          <p>This is a test email from Real Casual Leasing.</p>
          <p>If you're reading this, your SMTP configuration is working correctly.</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</p>
        `,
        text: "SMTP Configuration Test\n\nThis is a test email from Real Casual Leasing.\nIf you're reading this, your SMTP configuration is working correctly.",
      });
      if (!success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send test email. Check SMTP configuration." });
      }
      return { success: true };
    }),
});
