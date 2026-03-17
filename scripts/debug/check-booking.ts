import pg from "pg";
const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();

// The booking in question
const b = await client.query(`
  SELECT b.id, b."bookingNumber", b.status, b."siteId", b."startDate", b."endDate", 
         b."customerId", b."usageCategoryId", b."requiresApproval", b."createdAt",
         s."centreId", uc.name as "categoryName"
  FROM bookings b
  JOIN sites s ON b."siteId" = s.id
  LEFT JOIN usage_categories uc ON b."usageCategoryId" = uc.id
  WHERE b."bookingNumber" = 'DEMA-20260314-860'
`);
console.log("Target booking:", JSON.stringify(b.rows, null, 2));

if (b.rows.length > 0) {
  const { centreId, usageCategoryId, startDate, endDate, customerId, id } = b.rows[0];
  
  // Find ALL overlapping bookings at the same centre with the same category
  const overlaps = await client.query(`
    SELECT b.id, b."bookingNumber", b.status, b."siteId", b."startDate", b."endDate",
           b."customerId", b."usageCategoryId", s."siteNumber",
           u.name as "customerName"
    FROM bookings b
    JOIN sites s ON b."siteId" = s.id
    JOIN users u ON b."customerId" = u.id
    WHERE s."centreId" = $1
      AND b."usageCategoryId" = $2
      AND b."startDate" <= $4
      AND b."endDate" >= $3
      AND b.id != $5
    ORDER BY b."createdAt"
  `, [centreId, usageCategoryId, startDate, endDate, id]);
  
  console.log("\nOverlapping bookings at same centre with same category:", JSON.stringify(overlaps.rows, null, 2));
  
  // Check if the category is approved for this site
  const approved = await client.query(`
    SELECT suc."siteId", uc.name
    FROM site_usage_categories suc
    JOIN usage_categories uc ON suc."categoryId" = uc.id
    WHERE suc."siteId" = $1 AND suc."categoryId" = $2
  `, [b.rows[0].siteId, usageCategoryId]);
  console.log("\nCategory approved for site?", approved.rows.length > 0, JSON.stringify(approved.rows));
}

await client.end();
