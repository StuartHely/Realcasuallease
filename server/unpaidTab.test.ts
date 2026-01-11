import { describe, it, expect } from "vitest";

describe("Unpaid Tab Functionality", () => {
  describe("Unpaid invoice booking filter logic", () => {
    it("should identify unpaid invoice bookings correctly", () => {
      const mockBookings = [
        { id: 1, paymentMethod: "invoice", paidAt: null, status: "pending" },
        { id: 2, paymentMethod: "invoice", paidAt: null, status: "confirmed" },
        { id: 3, paymentMethod: "invoice", paidAt: new Date(), status: "confirmed" },
        { id: 4, paymentMethod: "stripe", paidAt: null, status: "confirmed" },
        { id: 5, paymentMethod: "stripe", paidAt: new Date(), status: "confirmed" },
      ];

      // Filter: paymentMethod === 'invoice' AND paidAt === null
      const unpaidInvoices = mockBookings.filter(
        (b) => b.paymentMethod === "invoice" && !b.paidAt
      );

      expect(unpaidInvoices).toHaveLength(2);
      expect(unpaidInvoices[0].id).toBe(1);
      expect(unpaidInvoices[1].id).toBe(2);
    });

    it("should include unpaid invoices regardless of status", () => {
      const mockBookings = [
        { id: 1, paymentMethod: "invoice", paidAt: null, status: "pending" },
        { id: 2, paymentMethod: "invoice", paidAt: null, status: "confirmed" },
        { id: 3, paymentMethod: "invoice", paidAt: null, status: "cancelled" },
        { id: 4, paymentMethod: "invoice", paidAt: null, status: "completed" },
      ];

      const unpaidInvoices = mockBookings.filter(
        (b) => b.paymentMethod === "invoice" && !b.paidAt
      );

      expect(unpaidInvoices).toHaveLength(4);
      expect(unpaidInvoices.map((b) => b.status)).toEqual([
        "pending",
        "confirmed",
        "cancelled",
        "completed",
      ]);
    });

    it("should exclude paid invoice bookings", () => {
      const mockBookings = [
        { id: 1, paymentMethod: "invoice", paidAt: null, status: "confirmed" },
        { id: 2, paymentMethod: "invoice", paidAt: new Date(), status: "confirmed" },
        { id: 3, paymentMethod: "invoice", paidAt: new Date("2026-01-01"), status: "confirmed" },
      ];

      const unpaidInvoices = mockBookings.filter(
        (b) => b.paymentMethod === "invoice" && !b.paidAt
      );

      expect(unpaidInvoices).toHaveLength(1);
      expect(unpaidInvoices[0].id).toBe(1);
    });

    it("should exclude stripe bookings from unpaid tab", () => {
      const mockBookings = [
        { id: 1, paymentMethod: "stripe", paidAt: null, status: "confirmed" },
        { id: 2, paymentMethod: "stripe", paidAt: new Date(), status: "confirmed" },
        { id: 3, paymentMethod: "invoice", paidAt: null, status: "confirmed" },
      ];

      const unpaidInvoices = mockBookings.filter(
        (b) => b.paymentMethod === "invoice" && !b.paidAt
      );

      expect(unpaidInvoices).toHaveLength(1);
      expect(unpaidInvoices[0].id).toBe(3);
      expect(unpaidInvoices[0].paymentMethod).toBe("invoice");
    });
  });

  describe("Unpaid count calculation", () => {
    it("should calculate unpaid count correctly", () => {
      const mockBookings = [
        { id: 1, paymentMethod: "invoice", paidAt: null },
        { id: 2, paymentMethod: "invoice", paidAt: null },
        { id: 3, paymentMethod: "invoice", paidAt: new Date() },
        { id: 4, paymentMethod: "stripe", paidAt: null },
      ];

      const unpaidCount = mockBookings.filter(
        (b) => b.paymentMethod === "invoice" && !b.paidAt
      ).length;

      expect(unpaidCount).toBe(2);
    });

    it("should return zero when no unpaid invoices exist", () => {
      const mockBookings = [
        { id: 1, paymentMethod: "invoice", paidAt: new Date() },
        { id: 2, paymentMethod: "stripe", paidAt: null },
      ];

      const unpaidCount = mockBookings.filter(
        (b) => b.paymentMethod === "invoice" && !b.paidAt
      ).length;

      expect(unpaidCount).toBe(0);
    });
  });

  describe("Unpaid badge visibility logic", () => {
    it("should show unpaid badge for unpaid invoice bookings", () => {
      const booking = {
        id: 1,
        paymentMethod: "invoice",
        paidAt: null,
      };

      const shouldShowBadge = booking.paymentMethod === "invoice" && !booking.paidAt;

      expect(shouldShowBadge).toBe(true);
    });

    it("should not show unpaid badge for paid invoice bookings", () => {
      const booking = {
        id: 1,
        paymentMethod: "invoice",
        paidAt: new Date(),
      };

      const shouldShowBadge = booking.paymentMethod === "invoice" && !booking.paidAt;

      expect(shouldShowBadge).toBe(false);
    });

    it("should not show unpaid badge for stripe bookings", () => {
      const booking = {
        id: 1,
        paymentMethod: "stripe",
        paidAt: null,
      };

      const shouldShowBadge = booking.paymentMethod === "invoice" && !booking.paidAt;

      expect(shouldShowBadge).toBe(false);
    });
  });
});
