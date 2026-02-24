import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authService } from "../_core/authService";
import { checkRateLimit } from "../_core/rateLimit";

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
});
