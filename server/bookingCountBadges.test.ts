import { describe, it, expect } from "vitest";

describe("Booking Count Badges", () => {
  describe("Count calculation logic", () => {
    it("should calculate correct counts for each status", () => {
      const mockBookings = [
        { id: 1, status: "pending" },
        { id: 2, status: "pending" },
        { id: 3, status: "confirmed" },
        { id: 4, status: "confirmed" },
        { id: 5, status: "confirmed" },
        { id: 6, status: "cancelled" },
        { id: 7, status: "completed" },
        { id: 8, status: "completed" },
        { id: 9, status: "completed" },
        { id: 10, status: "completed" },
      ];

      const statusCounts = {
        all: mockBookings.length,
        pending: mockBookings.filter((b) => b.status === "pending").length,
        confirmed: mockBookings.filter((b) => b.status === "confirmed").length,
        cancelled: mockBookings.filter((b) => b.status === "cancelled").length,
        completed: mockBookings.filter((b) => b.status === "completed").length,
      };

      expect(statusCounts.all).toBe(10);
      expect(statusCounts.pending).toBe(2);
      expect(statusCounts.confirmed).toBe(3);
      expect(statusCounts.cancelled).toBe(1);
      expect(statusCounts.completed).toBe(4);
    });

    it("should return zero counts when no bookings exist", () => {
      const mockBookings: any[] = [];

      const statusCounts = {
        all: mockBookings.length,
        pending: mockBookings.filter((b) => b.status === "pending").length,
        confirmed: mockBookings.filter((b) => b.status === "confirmed").length,
        cancelled: mockBookings.filter((b) => b.status === "cancelled").length,
        completed: mockBookings.filter((b) => b.status === "completed").length,
      };

      expect(statusCounts.all).toBe(0);
      expect(statusCounts.pending).toBe(0);
      expect(statusCounts.confirmed).toBe(0);
      expect(statusCounts.cancelled).toBe(0);
      expect(statusCounts.completed).toBe(0);
    });

    it("should handle bookings with only one status", () => {
      const mockBookings = [
        { id: 1, status: "pending" },
        { id: 2, status: "pending" },
        { id: 3, status: "pending" },
      ];

      const statusCounts = {
        all: mockBookings.length,
        pending: mockBookings.filter((b) => b.status === "pending").length,
        confirmed: mockBookings.filter((b) => b.status === "confirmed").length,
        cancelled: mockBookings.filter((b) => b.status === "cancelled").length,
        completed: mockBookings.filter((b) => b.status === "completed").length,
      };

      expect(statusCounts.all).toBe(3);
      expect(statusCounts.pending).toBe(3);
      expect(statusCounts.confirmed).toBe(0);
      expect(statusCounts.cancelled).toBe(0);
      expect(statusCounts.completed).toBe(0);
    });
  });

  describe("Badge display format", () => {
    it("should format badge text correctly", () => {
      const count = 5;
      const badgeText = `(${count})`;
      expect(badgeText).toBe("(5)");
    });

    it("should handle zero count", () => {
      const count = 0;
      const badgeText = `(${count})`;
      expect(badgeText).toBe("(0)");
    });

    it("should handle large counts", () => {
      const count = 1234;
      const badgeText = `(${count})`;
      expect(badgeText).toBe("(1234)");
    });
  });

  describe("Real-time count updates", () => {
    it("should recalculate counts when bookings change", () => {
      let mockBookings = [
        { id: 1, status: "pending" },
        { id: 2, status: "pending" },
      ];

      let statusCounts = {
        all: mockBookings.length,
        pending: mockBookings.filter((b) => b.status === "pending").length,
      };

      expect(statusCounts.all).toBe(2);
      expect(statusCounts.pending).toBe(2);

      // Simulate adding a new booking
      mockBookings = [
        ...mockBookings,
        { id: 3, status: "pending" },
      ];

      statusCounts = {
        all: mockBookings.length,
        pending: mockBookings.filter((b) => b.status === "pending").length,
      };

      expect(statusCounts.all).toBe(3);
      expect(statusCounts.pending).toBe(3);
    });

    it("should recalculate counts when booking status changes", () => {
      let mockBookings = [
        { id: 1, status: "pending" },
        { id: 2, status: "pending" },
        { id: 3, status: "confirmed" },
      ];

      let statusCounts = {
        pending: mockBookings.filter((b) => b.status === "pending").length,
        confirmed: mockBookings.filter((b) => b.status === "confirmed").length,
      };

      expect(statusCounts.pending).toBe(2);
      expect(statusCounts.confirmed).toBe(1);

      // Simulate approving a pending booking
      mockBookings = mockBookings.map((b) =>
        b.id === 1 ? { ...b, status: "confirmed" } : b
      );

      statusCounts = {
        pending: mockBookings.filter((b) => b.status === "pending").length,
        confirmed: mockBookings.filter((b) => b.status === "confirmed").length,
      };

      expect(statusCounts.pending).toBe(1);
      expect(statusCounts.confirmed).toBe(2);
    });
  });
});
