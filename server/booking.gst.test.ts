import { describe, it, expect } from "vitest";
import { getConfigValue, setConfigValue } from "./systemConfigDb";
import { getDb } from "./db";

describe("Booking GST Percentage Storage", () => {
  it("should store and retrieve GST percentage configuration", async () => {
    // Set GST to 15%
    await setConfigValue("gst_percentage", "15");
    
    // Verify it's stored
    const gstValue = await getConfigValue("gst_percentage");
    expect(gstValue).toBe("15");

    // Change to 12.5%
    await setConfigValue("gst_percentage", "12.5");
    const newGstValue = await getConfigValue("gst_percentage");
    expect(newGstValue).toBe("12.5");

    // Reset to default 10%
    await setConfigValue("gst_percentage", "10");
    const defaultGst = await getConfigValue("gst_percentage");
    expect(defaultGst).toBe("10");
  });

  it("should verify bookings table has gstPercentage column", async () => {
    const connection = await getDb();
    expect(connection).toBeDefined();

    if (connection) {
      // Query the table structure to verify gstPercentage column exists
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM bookings WHERE Field = 'gstPercentage'"
      );
      
      expect(Array.isArray(columns)).toBe(true);
      expect((columns as any[]).length).toBe(1);
      expect((columns as any[])[0].Field).toBe("gstPercentage");
    }
  });

  it("should verify transactions table has gstPercentage column", async () => {
    const connection = await getDb();
    expect(connection).toBeDefined();

    if (connection) {
      // Query the table structure to verify gstPercentage column exists
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM transactions WHERE Field = 'gstPercentage'"
      );
      
      expect(Array.isArray(columns)).toBe(true);
      expect((columns as any[]).length).toBe(1);
      expect((columns as any[])[0].Field).toBe("gstPercentage");
    }
  });

  it("should return default 10% GST when not configured", async () => {
    // Delete GST config using Drizzle ORM
    const connection = await getDb();
    if (connection) {
      const { systemConfig } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await connection.delete(systemConfig).where(eq(systemConfig.key, "gst_percentage"));
    }

    // Verify it returns null (which means use default 10% in the code)
    const gstValue = await getConfigValue("gst_percentage");
    expect(gstValue).toBeNull();

    // Restore default
    await setConfigValue("gst_percentage", "10");
  });
});
