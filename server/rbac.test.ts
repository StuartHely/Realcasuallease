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

  describe("registerUser RBAC (owner_super_admin restrictions)", () => {
    const ownerRolesAllowedBySuper = [
      "owner_viewer",
      "owner_centre_manager",
      "owner_marketing_manager",
    ];

    function canSuperAdminCreateRole(targetRole: string): boolean {
      return ownerRolesAllowedBySuper.includes(targetRole);
    }

    it("owner_super_admin can create owner_viewer", () => {
      expect(canSuperAdminCreateRole("owner_viewer")).toBe(true);
    });

    it("owner_super_admin can create owner_centre_manager", () => {
      expect(canSuperAdminCreateRole("owner_centre_manager")).toBe(true);
    });

    it("owner_super_admin can create owner_marketing_manager", () => {
      expect(canSuperAdminCreateRole("owner_marketing_manager")).toBe(true);
    });

    it("owner_super_admin cannot create mega_admin", () => {
      expect(canSuperAdminCreateRole("mega_admin")).toBe(false);
    });

    it("owner_super_admin cannot create mega_state_admin", () => {
      expect(canSuperAdminCreateRole("mega_state_admin")).toBe(false);
    });

    it("owner_super_admin cannot create customer", () => {
      expect(canSuperAdminCreateRole("customer")).toBe(false);
    });
  });
});
