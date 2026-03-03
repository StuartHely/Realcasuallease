import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail, sendNewBookingNotificationToOwner, sendPaymentReceiptEmail } from "./_core/bookingNotifications";
import * as notification from "./_core/notification";

// Mock the notifyOwner function (still used by sendNewBookingNotificationToOwner)
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock sendEmail (now used by confirmation, rejection, receipt)
vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("Booking Notification System", () => {
  let mockSendEmail: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const emailModule = await import("./_core/email");
    mockSendEmail = vi.mocked(emailModule.sendEmail);
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
    companyName: "Doe Enterprises",
    tradingName: "Doe's Delights",
  };

  describe("sendBookingConfirmationEmail", () => {
    it("should send confirmation email to customer via SMTP", async () => {
      const result = await sendBookingConfirmationEmail(mockBooking);

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.to).toBe("john@example.com");
      expect(call.subject).toContain("Booking Confirmed");
      expect(call.html).toContain(mockBooking.customerName);
      expect(call.html).toContain(mockBooking.centreName);
      expect(call.html).toContain(mockBooking.siteNumber);
      expect(call.html).toContain("$1500.00");
    });

    it("should format dates correctly in Australian format", async () => {
      await sendBookingConfirmationEmail(mockBooking);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.html).toMatch(/June.*2026/);
    });

    it("should include category name when provided", async () => {
      await sendBookingConfirmationEmail(mockBooking);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Food and Beverage");
    });

    it("should handle missing category gracefully", async () => {
      const bookingWithoutCategory = { ...mockBooking, categoryName: undefined };
      const result = await sendBookingConfirmationEmail(bookingWithoutCategory);

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
    });

    it("should include trading name when provided", async () => {
      await sendBookingConfirmationEmail(mockBooking);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Doe's Delights");
    });

    it("should fall back to company name when trading name is not provided", async () => {
      const bookingWithoutTradingName = { ...mockBooking, tradingName: undefined };
      await sendBookingConfirmationEmail(bookingWithoutTradingName);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Doe Enterprises");
    });

    it("should handle missing both company and trading name gracefully", async () => {
      const bookingWithoutBusiness = { ...mockBooking, companyName: undefined, tradingName: undefined };
      const result = await sendBookingConfirmationEmail(bookingWithoutBusiness);

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
    });

    it("should return false when email fails", async () => {
      mockSendEmail.mockResolvedValueOnce(false);

      const result = await sendBookingConfirmationEmail(mockBooking);

      expect(result).toBe(false);
    });
  });

  describe("sendBookingRejectionEmail", () => {
    const rejectionReason = "The requested dates conflict with a scheduled maintenance period.";

    it("should send rejection email with reason", async () => {
      const result = await sendBookingRejectionEmail(mockBooking, rejectionReason);

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.to).toBe("john@example.com");
      expect(call.subject).toContain("Booking Rejected");
      expect(call.html).toContain(rejectionReason);
      expect(call.html).toContain(mockBooking.customerName);
      expect(call.html).toContain(mockBooking.centreName);
    });

    it("should include all booking details in rejection email", async () => {
      await sendBookingRejectionEmail(mockBooking, rejectionReason);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.html).toContain(mockBooking.bookingNumber);
      expect(call.html).toContain(mockBooking.siteNumber);
      expect(call.html).toContain("Food and Beverage");
    });

    it("should return false when email fails", async () => {
      mockSendEmail.mockResolvedValueOnce(false);

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

  describe("sendPaymentReceiptEmail", () => {
    const mockReceiptBooking = {
      bookingNumber: "CampbelltownMall-20260601-001",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      centreName: "Campbelltown Mall",
      siteNumber: "A-01",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-07"),
      totalAmount: 1500,
      companyName: "Doe Enterprises",
      tradingName: "Doe's Delights",
      paidAt: new Date("2026-06-01"),
    };

    it("should send payment receipt email via SMTP", async () => {
      const result = await sendPaymentReceiptEmail(mockReceiptBooking);

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.to).toBe("john@example.com");
      expect(call.subject).toContain("Payment Receipt");
      expect(call.html).toContain("$1500.00");
    });

    it("should include trading name in receipt", async () => {
      await sendPaymentReceiptEmail(mockReceiptBooking);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Doe's Delights");
    });

    it("should fall back to company name when trading name is not provided", async () => {
      const bookingWithoutTradingName = { ...mockReceiptBooking, tradingName: undefined };
      await sendPaymentReceiptEmail(bookingWithoutTradingName);

      const call = mockSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Doe Enterprises");
    });

    it("should return false when email fails", async () => {
      mockSendEmail.mockResolvedValueOnce(false);

      const result = await sendPaymentReceiptEmail(mockReceiptBooking);

      expect(result).toBe(false);
    });
  });
});
