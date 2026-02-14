import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  userId: number;
  username: string;
  role: string;
};

const SALT_ROUNDS = 10;

class AuthService {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    return new TextEncoder().encode(secret);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createSessionToken(
    user: User,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId: user.id,
      username: user.username || user.openId,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });

      const { userId, username, role } = payload as Record<string, unknown>;

      if (
        typeof userId !== "number" ||
        typeof username !== "string" ||
        typeof role !== "string"
      ) {
        return null;
      }

      return { userId, username, role };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      return null;
    }

    const user = await db.getUserById(session.userId);
    if (!user) {
      return null;
    }

    return user;
  }

  async login(
    username: string,
    password: string
  ): Promise<{ user: User; token: string } | null> {
    const user = await db.getUserByUsername(username);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    const token = await this.createSessionToken(user);
    return { user, token };
  }

  async createUserWithPassword(
    username: string,
    password: string,
    role: User["role"] = "customer",
    name?: string,
    email?: string
  ): Promise<User> {
    const passwordHash = await this.hashPassword(password);
    const openId = `local_${nanoid(16)}`;

    await db.createUserWithPassword({
      openId,
      username,
      passwordHash,
      name: name || username,
      email: email || null,
      role,
      loginMethod: "password",
    });

    const user = await db.getUserByUsername(username);
    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  }
}

export const authService = new AuthService();
