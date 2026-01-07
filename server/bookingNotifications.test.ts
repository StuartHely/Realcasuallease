import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail, sendNewBookingNotificationToOwner } from "./_core/bookingNotifications";
import * as notification from "./_core/notification";

// Mock the notifyOwner function
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Booking Notification System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBooking = {
    bookingNumber: "CampbelltownMall-20260601-001",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    centreName: "Campbelltown Mall",
    siteNumber: "A-01",
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-07"),
    totalAmount: 1500.00,
    categoryName: "Food and Beverage",
  };

  describe("sendBookingConfirmationEmail", () => {
    it("should send confirmation email with correct booking details", async () => {
      const result = await sendBookingConfirmationEmail(mockBooking);

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      expect(call.title).toContain("Booking Confirmed");
      expect(call.title).toContain(mockBooking.bookingNumber);
      expect(call.content).toContain(mockBooking.customerName);
      expect(call.content).toContain(mockBooking.customerEmail);
      expect(call.content).toContain(mockBooking.centreName);
      expect(call.content).toContain(mockBooking.siteNumber);
      expect(call.content).toContain("$1500.00");
    });

    it("should format dates correctly in Australian format", async () => {
      await sendBookingConfirmationEmail(mockBooking);

      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      // Check for Australian date format (e.g., "Sunday, 1 June 2026")
      expect(call.content).toMatch(/June.*2026/);
    });

    it("should include category name when provided", async () => {
      await sendBookingConfirmationEmail(mockBooking);

      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      expect(call.content).toContain("Food and Beverage");
    });

    it("should handle missing category gracefully", async () => {
      const bookingWithoutCategory = { ...mockBooking, categoryName: undefined };
      const result = await sendBookingConfirmationEmail(bookingWithoutCategory);

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledTimes(1);
    });

    it("should return false when notification fails", async () => {
      vi.mocked(notification.notifyOwner).mockRejectedValueOnce(new Error("Network error"));

      const result = await sendBookingConfirmationEmail(mockBooking);

      expect(result).toBe(false);
    });
  });

  describe("sendBookingRejectionEmail", () => {
    const rejectionReason = "The requested dates conflict with a scheduled maintenance period.";

    it("should send rejection email with reason", async () => {
      const result = await sendBookingRejectionEmail(mockBooking, rejectionReason);

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      expect(call.title).toContain("Booking Rejected");
      expect(call.title).toContain(mockBooking.bookingNumber);
      expect(call.content).toContain(rejectionReason);
      expect(call.content).toContain(mockBooking.customerName);
      expect(call.content).toContain(mockBooking.centreName);
    });

    it("should include all booking details in rejection email", async () => {
      await sendBookingRejectionEmail(mockBooking, rejectionReason);

      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      expect(call.content).toContain(mockBooking.bookingNumber);
      expect(call.content).toContain(mockBooking.siteNumber);
      expect(call.content).toContain("Food and Beverage");
    });

    it("should return false when notification fails", async () => {
      vi.mocked(notification.notifyOwner).mockRejectedValueOnce(new Error("Network error"));

      const result = await sendBookingRejectionEmail(mockBooking, rejectionReason);

      expect(result).toBe(false);
    });
  });

  describe("sendNewBookingNotificationToOwner", () => {
    it("should send notification to owner about new booking", async () => {
      const result = await sendNewBookingNotificationToOwner(mockBooking);

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      expect(call.title).toContain("New Booking Requires Approval");
      expect(call.title).toContain(mockBooking.bookingNumber);
      expect(call.content).toContain(mockBooking.customerName);
      expect(call.content).toContain(mockBooking.customerEmail);
      expect(call.content).toContain("$1500.00");
    });

    it("should use shorter date format for owner notifications", async () => {
      await sendNewBookingNotificationToOwner(mockBooking);

      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      // Check for shorter format (e.g., "1 Jun 2026")
      expect(call.content).toMatch(/Jun.*2026/);
    });

    it("should include call to action for owner", async () => {
      await sendNewBookingNotificationToOwner(mockBooking);

      const call = vi.mocked(notification.notifyOwner).mock.calls[0][0];
      expect(call.content).toMatch(/review|approve|reject|dashboard/i);
    });

    it("should return false when notification fails", async () => {
      vi.mocked(notification.notifyOwner).mockRejectedValueOnce(new Error("Network error"));

      const result = await sendNewBookingNotificationToOwner(mockBooking);

      expect(result).toBe(false);
    });
  });
});
