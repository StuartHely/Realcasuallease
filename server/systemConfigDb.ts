import { getDb } from "./db";
import { systemConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface SystemConfigData {
  imageQuality: number;
  imageMaxWidth: number;
  imageMaxHeight: number;
}

export async function getSystemConfig(): Promise<SystemConfigData> {
  const db = await getDb();
  if (!db) {
    return { imageQuality: 85, imageMaxWidth: 1200, imageMaxHeight: 800 };
  }

  const result = await db.select().from(systemConfig).limit(1);
  const config = result[0];
  
  return {
    imageQuality: config?.imageQuality || 85,
    imageMaxWidth: config?.imageMaxWidth || 1200,
    imageMaxHeight: config?.imageMaxHeight || 800,
  };
}

export async function updateSystemConfig(data: SystemConfigData): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db.select().from(systemConfig).limit(1);
  
  if (existing.length > 0) {
    await db.update(systemConfig)
      .set({
        imageQuality: data.imageQuality,
        imageMaxWidth: data.imageMaxWidth,
        imageMaxHeight: data.imageMaxHeight,
      })
      .where(eq(systemConfig.id, existing[0].id));
  } else {
    await db.insert(systemConfig).values({
      key: 'image_settings',
      value: JSON.stringify(data),
      imageQuality: data.imageQuality,
      imageMaxWidth: data.imageMaxWidth,
      imageMaxHeight: data.imageMaxHeight,
    });
  }
}
