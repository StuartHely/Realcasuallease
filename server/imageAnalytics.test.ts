import { describe, it, expect } from "vitest";
import { trackImageView, trackImageClick, getTopPerformingImages } from "./imageAnalyticsDb";

describe("Image Analytics", () => {
  it("should track image views", async () => {
    // Track a view for site 6, image slot 1
    await trackImageView(6, 1);
    
    const analytics = await getTopPerformingImages(10);
    const site6Image1 = analytics.find(a => a.siteId === 6 && a.imageSlot === 1);
    
    expect(site6Image1).toBeDefined();
    expect(site6Image1?.viewCount).toBeGreaterThan(0);
  });

  it("should track image clicks", async () => {
    // Track a click for site 6, image slot 1
    await trackImageClick(6, 1);
    
    const analytics = await getTopPerformingImages(10);
    const site6Image1 = analytics.find(a => a.siteId === 6 && a.imageSlot === 1);
    
    expect(site6Image1).toBeDefined();
    expect(site6Image1?.clickCount).toBeGreaterThan(0);
  });

  it("should calculate click-through rate correctly", async () => {
    // Track multiple views and clicks
    await trackImageView(6, 2);
    await trackImageView(6, 2);
    await trackImageView(6, 2);
    await trackImageClick(6, 2);
    
    const analytics = await getTopPerformingImages(10);
    const site6Image2 = analytics.find(a => a.siteId === 6 && a.imageSlot === 2);
    
    expect(site6Image2).toBeDefined();
    expect(site6Image2?.clickThroughRate).toBeGreaterThan(0);
    expect(site6Image2?.clickThroughRate).toBeLessThanOrEqual(100);
  });

  it("should include conversion metrics", async () => {
    const analytics = await getTopPerformingImages(10);
    
    if (analytics.length > 0) {
      const firstImage = analytics[0];
      expect(firstImage).toHaveProperty("bookingCount");
      expect(firstImage).toHaveProperty("conversionRate");
      expect(typeof firstImage.bookingCount).toBe("number");
      expect(typeof firstImage.conversionRate).toBe("number");
    }
  });

  it("should return top performing images sorted by views", async () => {
    const analytics = await getTopPerformingImages(5);
    
    expect(analytics.length).toBeLessThanOrEqual(5);
    
    // Check if sorted by viewCount descending
    for (let i = 0; i < analytics.length - 1; i++) {
      expect(analytics[i].viewCount).toBeGreaterThanOrEqual(analytics[i + 1].viewCount);
    }
  });
});
