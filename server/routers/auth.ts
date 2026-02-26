import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authService } from "../_core/authService";
import { checkRateLimit } from "../_core/rateLimit";
import { ENV } from "../_core/env";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1, "Username is required"),
      password: z.string().min(1, "Password is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const clientIp = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      const { allowed, retryAfterMs } = checkRateLimit(`login:${clientIp}`);
      if (!allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many login attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
        });
      }

      const result = await authService.login(input.username, input.password);
      
      if (!result) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });

      return {
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
      };
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  checkEmailAvailable: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const { getUserByEmail } = await import('../db');
      const existingUser = await getUserByEmail(input.email);
      return { available: !existingUser };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const clientIp = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      const { allowed, retryAfterMs } = checkRateLimit(`reset:${clientIp}`, 3, 15 * 60 * 1000);
      if (!allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many requests. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
        });
      }

      const { getUserByEmail, createPasswordResetToken } = await import('../db');
      const user = await getUserByEmail(input.email);

      // Always return success to avoid leaking user existence
      if (!user) {
        return { success: true };
      }

      const { nanoid } = await import('nanoid');
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await createPasswordResetToken(user.id, token, expiresAt);

      const resetUrl = `${ENV.appUrl}/reset-password?token=${token}`;
      const { sendEmail } = await import('../_core/email');
      await sendEmail({
        to: input.email,
        subject: "Reset your password — Real Casual Leasing",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Password Reset Request</h2>
            <p>Hi${user.name ? ` ${user.name}` : ''},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">Real Casual Leasing — AI-Driven Short-Term Retail Leasing Platform</p>
          </div>
        `,
      });

      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ input }) => {
      const { getValidPasswordResetToken, markPasswordResetTokenUsed, updateUserPasswordHash } = await import('../db');
      const tokenRow = await getValidPasswordResetToken(input.token);

      if (!tokenRow) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link" });
      }

      if (tokenRow.usedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link has already been used" });
      }

      if (new Date() > tokenRow.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link has expired. Please request a new one." });
      }

      const passwordHash = await authService.hashPassword(input.newPassword);
      await updateUserPasswordHash(tokenRow.userId, passwordHash);
      await markPasswordResetTokenUsed(tokenRow.id);

      return { success: true };
    }),
});
