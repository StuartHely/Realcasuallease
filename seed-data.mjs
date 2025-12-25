import { drizzle } from "drizzle-orm/mysql2";
import { owners, shoppingCentres, sites, usageTypes, systemConfig } from "./drizzle/schema.ts";
import fs from 'fs';

const db = drizzle(process.env.DATABASE_URL);

async function seedData() {
  console.log("Starting data seed...");

  // Create default owner
  const [ownerResult] = await db.insert(owners).values({
    name: "Default Owner",
    email: "owner@casuallease.com",
    monthlyFee: "0.00",
    commissionPercentage: "10.00",
    remittanceType: "monthly"
  });
  const ownerId = Number(ownerResult.insertId);
  console.log(`Created default owner with ID: ${ownerId}`);

  // Read sample data
  const sampleData = JSON.parse(fs.readFileSync('./sample_data_clean.json', 'utf8'));
  
  // Group by centre
  const centreMap = new Map();
  
  for (const row of sampleData) {
    const centreName = row['Shopping Centre Name'];
    if (!centreName || centreName === 'Shopping Centre Name') continue;
    
    if (!centreMap.has(centreName)) {
      centreMap.set(centreName, {
        name: centreName,
        majors: row['Majors'],
        numberOfSpecialties: row['Number of Specialties'],
        sites: []
      });
    }
    
    const maxTables = row['Maximum number of tables'];
    const maxTablesValue = (typeof maxTables === 'number' && !isNaN(maxTables)) ? maxTables : null;
    
    centreMap.get(centreName).sites.push({
      siteNumber: String(row['Site Number']),
      description: row['Site Description'] || '',
      size: row['Site Size'] || '',
      maxTables: maxTablesValue,
      powerAvailable: row['Power available'] || '',
      restrictions: row['Restrictions'] || ''
    });
  }
  
  // Insert centres and sites
  for (const [centreName, centreData] of centreMap.entries()) {
    const [centreResult] = await db.insert(shoppingCentres).values({
      ownerId: ownerId,
      name: centreData.name,
      majors: centreData.majors,
      numberOfSpecialties: centreData.numberOfSpecialties,
      suburb: '',
      city: '',
      state: 'NSW',
      postcode: ''
    });
    
    const centreId = Number(centreResult.insertId);
    console.log(`Created centre: ${centreName} (ID: ${centreId})`);
    
    // Insert sites for this centre
    for (const siteData of centreData.sites) {
      await db.insert(sites).values({
        centreId: centreId,
        siteNumber: siteData.siteNumber,
        description: siteData.description,
        size: siteData.size,
        maxTables: siteData.maxTables,
        powerAvailable: siteData.powerAvailable,
        restrictions: siteData.restrictions,
        pricePerDay: "150.00",
        pricePerWeek: "750.00",
        instantBooking: true,
        isActive: true
      });
    }
    
    console.log(`  Added ${centreData.sites.length} sites`);
  }
  
  // Create default usage types
  const defaultUsageTypes = [
    { name: "Food Sampling", requiresApproval: false },
    { name: "Product Display", requiresApproval: false },
    { name: "Promotional Event", requiresApproval: false },
    { name: "Charity/Fundraising", requiresApproval: true },
    { name: "Pop-up Retail", requiresApproval: false },
    { name: "Survey/Market Research", requiresApproval: false },
    { name: "Other", requiresApproval: true }
  ];
  
  for (const usageType of defaultUsageTypes) {
    await db.insert(usageTypes).values({
      name: usageType.name,
      requiresApproval: usageType.requiresApproval,
      isActive: true
    });
  }
  console.log(`Created ${defaultUsageTypes.length} usage types`);
  
  // Set default GST rate
  await db.insert(systemConfig).values({
    key: "gst_percentage",
    value: "10"
  });
  console.log("Set default GST rate to 10%");
  
  // Set monthly invoice email template
  await db.insert(systemConfig).values({
    key: "monthly_invoice_email_template",
    value: "Dear {owner_name},\n\nPlease find attached your monthly invoice for Casual Lease platform usage.\n\nThank you for your business.\n\nCasual Lease Team"
  });
  console.log("Set default email templates");
  
  console.log("\nData seed completed successfully!");
}

seedData().catch(console.error).finally(() => process.exit(0));
