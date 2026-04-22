import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

router.get('/debug/storage', async (req, res) => {
  const { ENV } = await import('./env');
  res.json({
    mode: ENV.awsS3Bucket ? 'S3' : 'LOCAL',
    bucket: ENV.awsS3Bucket || '(empty)',
    bucketLength: ENV.awsS3Bucket.length,
    region: ENV.awsRegion,
    hasAccessKey: !!ENV.awsAccessKeyId,
    accessKeyLength: ENV.awsAccessKeyId.length,
  });
});

router.get('/ready', async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      res.status(503).json({ status: 'not ready', message: 'Database not configured' });
      return;
    }
    
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', message: 'Database not available' });
  }
});

export { router as healthRouter };
