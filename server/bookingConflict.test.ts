import { describe, it, expect } from "vitest";

/**
 * Booking Conflict Detection Tests
 *
 * Tests the date overlap algorithm used in:
 *   - server/adminBookingDb.ts checkBookingOverlaps()
 *   - server/assetDb.ts checkVacantShopAvailability()
 *   - server/assetDb.ts checkThirdLineAvailability()
 *
 * The overlap formula: (newStart <= existingEnd) AND (newEnd >= existingStart)
 */

type Booking = {
  id: number;
  startDate: Date;
  endDate: Date;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

/**
 * Pure implementation of the overlap check matching the DB query logic.
 * Only active bookings (pending/confirmed) are considered.
 */
function findConflicts(
  existingBookings: Booking[],
  newStart: Date,
  newEnd: Date,
  excludeBookingId?: number
): Booking[] {
  return existingBookings.filter((b) => {
    if (b.status !== "pending" && b.status !== "confirmed") return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    return newStart <= b.endDate && newEnd >= b.startDate;
  });
}

function d(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

describe("Booking Conflict Detection", () => {
  const existingBooking: Booking = {
    id: 1,
    startDate: d("2025-03-10"),
    endDate: d("2025-03-15"),
    status: "confirmed",
  };

  describe("Date overlap detection", () => {
    it("detects exact overlap (same dates)", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-10"),
        d("2025-03-15")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects new booking starting during existing", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-12"),
        d("2025-03-18")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects new booking ending during existing", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-08"),
        d("2025-03-12")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects new booking fully containing existing", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-08"),
        d("2025-03-20")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects new booking fully inside existing", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-11"),
        d("2025-03-14")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects single-day overlap on existing start date", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-10"),
        d("2025-03-10")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects single-day overlap on existing end date", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-15"),
        d("2025-03-15")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects boundary overlap (new end = existing start)", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-08"),
        d("2025-03-10")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects boundary overlap (new start = existing end)", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-15"),
        d("2025-03-20")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("no conflict when new booking is entirely before", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-01"),
        d("2025-03-09")
      );
      expect(conflicts).toHaveLength(0);
    });

    it("no conflict when new booking is entirely after", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-16"),
        d("2025-03-20")
      );
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("Status filtering", () => {
    it("ignores cancelled bookings", () => {
      const cancelled: Booking = { ...existingBooking, status: "cancelled" };
      const conflicts = findConflicts(
        [cancelled],
        d("2025-03-10"),
        d("2025-03-15")
      );
      expect(conflicts).toHaveLength(0);
    });

    it("ignores completed bookings", () => {
      const completed: Booking = { ...existingBooking, status: "completed" };
      const conflicts = findConflicts(
        [completed],
        d("2025-03-10"),
        d("2025-03-15")
      );
      expect(conflicts).toHaveLength(0);
    });

    it("detects pending bookings", () => {
      const pending: Booking = { ...existingBooking, status: "pending" };
      const conflicts = findConflicts(
        [pending],
        d("2025-03-10"),
        d("2025-03-15")
      );
      expect(conflicts).toHaveLength(1);
    });

    it("detects confirmed bookings", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-10"),
        d("2025-03-15")
      );
      expect(conflicts).toHaveLength(1);
    });
  });

  describe("Exclude booking ID", () => {
    it("excludes the specified booking from conflict check", () => {
      const conflicts = findConflicts(
        [existingBooking],
        d("2025-03-10"),
        d("2025-03-15"),
        1 // exclude the existing booking
      );
      expect(conflicts).toHaveLength(0);
    });

    it("still detects other overlapping bookings", () => {
      const bookings: Booking[] = [
        existingBooking,
        {
          id: 2,
          startDate: d("2025-03-12"),
          endDate: d("2025-03-18"),
          status: "confirmed",
        },
      ];
      const conflicts = findConflicts(
        bookings,
        d("2025-03-10"),
        d("2025-03-15"),
        1
      );
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe(2);
    });
  });

  describe("Multiple overlapping bookings", () => {
    const bookings: Booking[] = [
      {
        id: 1,
        startDate: d("2025-03-01"),
        endDate: d("2025-03-05"),
        status: "confirmed",
      },
      {
        id: 2,
        startDate: d("2025-03-10"),
        endDate: d("2025-03-15"),
        status: "confirmed",
      },
      {
        id: 3,
        startDate: d("2025-03-20"),
        endDate: d("2025-03-25"),
        status: "pending",
      },
      {
        id: 4,
        startDate: d("2025-03-12"),
        endDate: d("2025-03-22"),
        status: "cancelled",
      },
    ];

    it("returns all overlapping active bookings", () => {
      // Range that overlaps bookings 2 and 3
      const conflicts = findConflicts(bookings, d("2025-03-14"), d("2025-03-21"));
      expect(conflicts).toHaveLength(2);
      expect(conflicts.map((c) => c.id).sort()).toEqual([2, 3]);
    });

    it("ignores cancelled even when overlapping", () => {
      // Range that overlaps booking 4 (cancelled) and 2
      const conflicts = findConflicts(bookings, d("2025-03-12"), d("2025-03-13"));
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe(2);
    });

    it("no conflicts when gap between bookings", () => {
      const conflicts = findConflicts(bookings, d("2025-03-06"), d("2025-03-09"));
      expect(conflicts).toHaveLength(0);
    });
  });
});
