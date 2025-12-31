import mysql from 'mysql2/promise';
import { ENV } from './_core/env';

async function query(sql: string, params: any[] = []) {
  const connection = await mysql.createConnection(ENV.databaseUrl);
  try {
    const [rows] = await connection.execute(sql, params);
    return rows as any[];
  } finally {
    await connection.end();
  }
}

export interface SeasonalRate {
  id: number;
  siteId: number;
  name: string;
  startDate: string;
  endDate: string;
  weekdayRate: string | null;
  weekendRate: string | null;
  createdAt: Date;
}

export async function getSeasonalRatesBySiteId(siteId: number): Promise<SeasonalRate[]> {
  const sql = `
    SELECT * FROM seasonalRates 
    WHERE siteId = ? 
    ORDER BY startDate ASC
  `;
  return await query(sql, [siteId]);
}

export async function getActiveSeasonalRate(siteId: number, date: Date): Promise<SeasonalRate | null> {
  const dateStr = date.toISOString().split('T')[0];
  const sql = `
    SELECT * FROM seasonalRates 
    WHERE siteId = ? 
      AND startDate <= ? 
      AND endDate >= ?
    ORDER BY createdAt DESC
    LIMIT 1
  `;
  const results = await query(sql, [siteId, dateStr, dateStr]);
  return results.length > 0 ? results[0] : null;
}

export async function createSeasonalRate(data: {
  siteId: number;
  name: string;
  startDate: string;
  endDate: string;
  weekdayRate?: number;
  weekendRate?: number;
}): Promise<SeasonalRate> {
  const sql = `
    INSERT INTO seasonalRates (siteId, name, startDate, endDate, weekdayRate, weekendRate)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const result: any = await query(sql, [
    data.siteId,
    data.name,
    data.startDate,
    data.endDate,
    data.weekdayRate || null,
    data.weekendRate || null,
  ]);
  
  // Fetch the inserted record
  const selectSql = 'SELECT * FROM seasonalRates WHERE id = ?';
  const rows = await query(selectSql, [result.insertId]);
  return rows[0];
}

export async function updateSeasonalRate(id: number, data: {
  name?: string;
  startDate?: string;
  endDate?: string;
  weekdayRate?: number;
  weekendRate?: number;
}): Promise<boolean> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.startDate !== undefined) {
    updates.push('startDate = ?');
    values.push(data.startDate);
  }
  if (data.endDate !== undefined) {
    updates.push('endDate = ?');
    values.push(data.endDate);
  }
  if (data.weekdayRate !== undefined) {
    updates.push('weekdayRate = ?');
    values.push(data.weekdayRate);
  }
  if (data.weekendRate !== undefined) {
    updates.push('weekendRate = ?');
    values.push(data.weekendRate);
  }

  if (updates.length === 0) return false;

  values.push(id);
  const sql = `UPDATE seasonalRates SET ${updates.join(', ')} WHERE id = ?`;
  const result: any = await query(sql, values);
  return result.affectedRows > 0;
}

export async function deleteSeasonalRate(id: number): Promise<boolean> {
  const sql = `DELETE FROM seasonalRates WHERE id = ?`;
  const result: any = await query(sql, [id]);
  return result.affectedRows > 0;
}
