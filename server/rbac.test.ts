import { describe, it, expect } from "vitest";

/**
 * RBAC Role Hierarchy Tests
 *
 * Tests the access control logic used by tRPC procedure guards.
 * The guards are defined in server/_core/trpc.ts:
 *   - publicProcedure    — anyone
 *   - protectedProcedure — any logged-in user (ctx.user is set)
 *   - ownerProcedure     — any non-customer, non-owner_viewer role
 *   - adminProcedure     — mega_admin or mega_state_admin only
 */

const ALL_ROLES = [
  "customer",
  "owner_viewer",
  "owner_centre_manager",
  "owner_marketing_manager",
  "owner_regional_admin",
  "owner_state_admin",
  "owner_super_admin",
  "mega_state_admin",
  "mega_admin",
] as const;

type Role = (typeof ALL_ROLES)[number];

/** Mirrors the requireUser middleware: user must exist */
function passesProtected(user: { role: Role } | null): boolean {
  return user !== null;
}

/** Mirrors the ownerProcedure middleware: not customer, not owner_viewer */
function passesOwner(user: { role: Role } | null): boolean {
  if (!user) return false;
  return user.role !== "customer" && user.role !== "owner_viewer";
}

/** Mirrors the adminProcedure middleware: mega_admin or mega_state_admin */
function passesAdmin(user: { role: Role } | null): boolean {
  if (!user) return false;
  return ["mega_admin", "mega_state_admin"].includes(user.role);
}

describe("RBAC Role Hierarchy", () => {
  describe("protectedProcedure", () => {
    it("rejects unauthenticated (null user)", () => {
      expect(passesProtected(null)).toBe(false);
    });

    it("allows all authenticated roles", () => {
      for (const role of ALL_ROLES) {
        expect(passesProtected({ role })).toBe(true);
      }
    });
  });

  describe("ownerProcedure", () => {
    it("rejects unauthenticated (null user)", () => {
      expect(passesOwner(null)).toBe(false);
    });

    it("rejects customer role", () => {
      expect(passesOwner({ role: "customer" })).toBe(false);
    });

    it("rejects owner_viewer role", () => {
      expect(passesOwner({ role: "owner_viewer" })).toBe(false);
    });

    const ownerAllowedRoles: Role[] = [
      "owner_centre_manager",
      "owner_marketing_manager",
      "owner_regional_admin",
      "owner_state_admin",
      "owner_super_admin",
      "mega_state_admin",
      "mega_admin",
    ];

    it.each(ownerAllowedRoles)("allows %s", (role) => {
      expect(passesOwner({ role })).toBe(true);
    });
  });

  describe("adminProcedure", () => {
    it("rejects unauthenticated (null user)", () => {
      expect(passesAdmin(null)).toBe(false);
    });

    const nonAdminRoles: Role[] = [
      "customer",
      "owner_viewer",
      "owner_centre_manager",
      "owner_marketing_manager",
      "owner_regional_admin",
      "owner_state_admin",
      "owner_super_admin",
    ];

    it.each(nonAdminRoles)("rejects %s", (role) => {
      expect(passesAdmin({ role })).toBe(false);
    });

    it("allows mega_admin", () => {
      expect(passesAdmin({ role: "mega_admin" })).toBe(true);
    });

    it("allows mega_state_admin", () => {
      expect(passesAdmin({ role: "mega_state_admin" })).toBe(true);
    });
  });

  describe("Role hierarchy ordering", () => {
    it("admin access is a strict subset of owner access", () => {
      for (const role of ALL_ROLES) {
        const user = { role };
        if (passesAdmin(user)) {
          expect(passesOwner(user)).toBe(true);
        }
      }
    });

    it("owner access is a strict subset of protected access", () => {
      for (const role of ALL_ROLES) {
        const user = { role };
        if (passesOwner(user)) {
          expect(passesProtected(user)).toBe(true);
        }
      }
    });

    it("there are roles that pass owner but not admin", () => {
      const ownerOnlyRoles = ALL_ROLES.filter(
        (r) => passesOwner({ role: r }) && !passesAdmin({ role: r })
      );
      expect(ownerOnlyRoles.length).toBeGreaterThan(0);
    });

    it("there are roles that pass protected but not owner", () => {
      const protectedOnlyRoles = ALL_ROLES.filter(
        (r) => passesProtected({ role: r }) && !passesOwner({ role: r })
      );
      expect(protectedOnlyRoles).toEqual(
        expect.arrayContaining(["customer", "owner_viewer"])
      );
    });
  });

  describe("registerUser RBAC", () => {
    /**
     * Mirrors the registerUser mutation logic from server/routers/admin.ts.
     * The endpoint sits behind ownerProcedure, so only non-customer/non-viewer
     * roles can call it at all.  Inside the mutation:
     *   - mega_admin / mega_state_admin can create ANY role
     *   - owner_super_admin can only create owner_viewer, owner_centre_manager,
     *     or owner_marketing_manager AND only for their own agency
     *   - all other callers are rejected
     */
    type CallerCtx = { role: Role; assignedOwnerId: number | null };

    const SUPER_ADMIN_ALLOWED_ROLES = [
      "owner_viewer",
      "owner_centre_manager",
      "owner_marketing_manager",
    ] as const;

    function registerUserCheck(
      caller: CallerCtx,
      targetRole: Role,
      targetOwnerId: number | null
    ): { allowed: boolean; reason?: string } {
      const isMegaAdmin = ["mega_admin", "mega_state_admin"].includes(caller.role);

      if (isMegaAdmin) return { allowed: true };

      if (caller.role !== "owner_super_admin") {
        return { allowed: false, reason: "Only admins or owner super admins can register users" };
      }

      if (!(SUPER_ADMIN_ALLOWED_ROLES as readonly string[]).includes(targetRole)) {
        return { allowed: false, reason: "Owner super admins can only create viewer and manager roles" };
      }

      if (!caller.assignedOwnerId) {
        return { allowed: false, reason: "Your account is not assigned to an owner agency" };
      }

      if (targetOwnerId !== caller.assignedOwnerId) {
        return { allowed: false, reason: "You can only create users for your own agency" };
      }

      return { allowed: true };
    }

    // --- mega_admin bypasses all restrictions ---

    it("mega_admin can create any role", () => {
      const caller: CallerCtx = { role: "mega_admin", assignedOwnerId: null };
      for (const role of ALL_ROLES) {
        expect(registerUserCheck(caller, role, 99).allowed).toBe(true);
      }
    });

    it("mega_state_admin can create any role", () => {
      const caller: CallerCtx = { role: "mega_state_admin", assignedOwnerId: null };
      for (const role of ALL_ROLES) {
        expect(registerUserCheck(caller, role, 99).allowed).toBe(true);
      }
    });

    // --- owner_super_admin: allowed target roles ---

    it.each(["owner_viewer", "owner_centre_manager", "owner_marketing_manager"] as Role[])(
      "owner_super_admin can create %s for their own agency",
      (targetRole) => {
        const caller: CallerCtx = { role: "owner_super_admin", assignedOwnerId: 5 };
        expect(registerUserCheck(caller, targetRole, 5).allowed).toBe(true);
      }
    );

    // --- owner_super_admin: forbidden target roles ---

    it.each([
      "customer",
      "owner_regional_admin",
      "owner_state_admin",
      "owner_super_admin",
      "mega_state_admin",
      "mega_admin",
    ] as Role[])(
      "owner_super_admin cannot create %s",
      (targetRole) => {
        const caller: CallerCtx = { role: "owner_super_admin", assignedOwnerId: 5 };
        const result = registerUserCheck(caller, targetRole, 5);
        expect(result.allowed).toBe(false);
      }
    );

    // --- owner_super_admin: agency scoping ---

    it("owner_super_admin cannot create users for a different agency", () => {
      const caller: CallerCtx = { role: "owner_super_admin", assignedOwnerId: 5 };
      const result = registerUserCheck(caller, "owner_viewer", 99);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/your own agency/i);
    });

    it("owner_super_admin without assignedOwnerId is rejected", () => {
      const caller: CallerCtx = { role: "owner_super_admin", assignedOwnerId: null };
      const result = registerUserCheck(caller, "owner_viewer", 5);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not assigned to an owner agency/i);
    });

    // --- other owner roles cannot register users ---

    it.each([
      "owner_centre_manager",
      "owner_marketing_manager",
      "owner_regional_admin",
      "owner_state_admin",
    ] as Role[])(
      "%s cannot register users",
      (callerRole) => {
        const caller: CallerCtx = { role: callerRole, assignedOwnerId: 5 };
        const result = registerUserCheck(caller, "owner_viewer", 5);
        expect(result.allowed).toBe(false);
      }
    );
  });
});
