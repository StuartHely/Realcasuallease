import { describe, it, expect } from "vitest";
import { calculateDistance, findNearbyCentres } from "./geoUtils";

describe("Nearby Centres Feature", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two points correctly", () => {
      // Sydney to Melbourne (approx 713 km)
      const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(730);
    });

    it("should return 0 for same location", () => {
      const distance = calculateDistance(-33.8688, 151.2093, -33.8688, 151.2093);
      expect(distance).toBe(0);
    });

    it("should calculate short distances accurately", () => {
      // Two points approximately 5km apart in Sydney
      const distance = calculateDistance(-33.8688, 151.2093, -33.9188, 151.2093);
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(6);
    });

    it("should handle negative coordinates", () => {
      // Australian coordinates (all negative latitudes, positive longitudes)
      const distance = calculateDistance(-35.0, 150.0, -35.1, 150.1);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20);
    });
  });

  describe("findNearbyCentres", () => {
    const mockCentres = [
      {
        id: 1,
        name: "Centre A",
        latitude: "-33.8688",
        longitude: "151.2093",
        address: "123 Main St, Sydney NSW 2000",
        state: "NSW",
      },
      {
        id: 2,
        name: "Centre B - 5km away",
        latitude: "-33.9188",
        longitude: "151.2093",
        address: "456 Near St, Sydney NSW 2000",
        state: "NSW",
      },
      {
        id: 3,
        name: "Centre C - 15km away",
        latitude: "-34.0188",
        longitude: "151.2093",
        address: "789 Far St, Sydney NSW 2000",
        state: "NSW",
      },
      {
        id: 4,
        name: "Centre D - No coordinates",
        latitude: null,
        longitude: null,
        address: "999 Unknown St",
        state: "NSW",
      },
    ];

    it("should find centres within 10km radius", () => {
      const nearby = findNearbyCentres(mockCentres, 1, 10);
      
      expect(nearby.length).toBe(1);
      expect(nearby[0].name).toBe("Centre B - 5km away");
      expect(nearby[0].distance).toBeGreaterThan(4);
      expect(nearby[0].distance).toBeLessThan(6);
    });

    it("should find centres within 20km radius", () => {
      const nearby = findNearbyCentres(mockCentres, 1, 20);
      
      expect(nearby.length).toBe(2);
      expect(nearby[0].name).toBe("Centre B - 5km away");
      expect(nearby[1].name).toBe("Centre C - 15km away");
    });

    it("should exclude centres without coordinates", () => {
      const nearby = findNearbyCentres(mockCentres, 1, 50);
      
      // Should not include Centre D which has null coordinates
      expect(nearby.every(c => c.name !== "Centre D - No coordinates")).toBe(true);
    });

    it("should exclude the target centre itself", () => {
      const nearby = findNearbyCentres(mockCentres, 1, 50);
      
      // Should not include Centre A (the target)
      expect(nearby.every(c => c.id !== 1)).toBe(true);
    });

    it("should return empty array if target centre not found", () => {
      const nearby = findNearbyCentres(mockCentres, 999, 10);
      expect(nearby).toEqual([]);
    });

    it("should return empty array if target centre has no coordinates", () => {
      const nearby = findNearbyCentres(mockCentres, 4, 10);
      expect(nearby).toEqual([]);
    });

    it("should sort results by distance (closest first)", () => {
      const nearby = findNearbyCentres(mockCentres, 1, 20);
      
      expect(nearby.length).toBe(2);
      expect(nearby[0].distance).toBeLessThan(nearby[1].distance);
    });

    it("should include address and state in results", () => {
      const nearby = findNearbyCentres(mockCentres, 1, 10);
      
      expect(nearby[0]).toHaveProperty("address");
      expect(nearby[0]).toHaveProperty("state");
      expect(nearby[0].address).toBe("456 Near St, Sydney NSW 2000");
      expect(nearby[0].state).toBe("NSW");
    });

    it("should handle invalid latitude/longitude strings", () => {
      const invalidCentres = [
        {
          id: 1,
          name: "Valid Centre",
          latitude: "-33.8688",
          longitude: "151.2093",
          address: "123 Main St",
          state: "NSW",
        },
        {
          id: 2,
          name: "Invalid Centre",
          latitude: "invalid",
          longitude: "also-invalid",
          address: "456 Bad St",
          state: "NSW",
        },
      ];

      const nearby = findNearbyCentres(invalidCentres, 1, 10);
      
      // Should not include the invalid centre
      expect(nearby.every(c => c.name !== "Invalid Centre")).toBe(true);
    });
  });
});
