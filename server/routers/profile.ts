import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return await db.getCustomerProfileByUserId(ctx.user.id);
  }),

  update: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      website: z.string().optional(),
      abn: z.string().optional(),
      streetAddress: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      productCategory: z.string().optional(),
      insuranceCompany: z.string().optional(),
      insurancePolicyNo: z.string().optional(),
      insuranceAmount: z.string().optional(),
      insuranceExpiry: z.date().optional(),
      insuranceDocumentUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getCustomerProfileByUserId(ctx.user.id);
      
      // Clean up input - convert empty strings to null/undefined for optional fields
      const cleanedInput: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value === '' || value === undefined) {
          cleanedInput[key] = null;
        } else {
          cleanedInput[key] = value;
        }
      }
      
      if (existing) {
        // Update existing profile - exclude id from updates
        await db.updateCustomerProfile(ctx.user.id, cleanedInput);
      } else {
        // Create new profile - only include userId and input fields, let DB auto-generate id
        await db.createCustomerProfile({
          userId: ctx.user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          companyName: input.companyName,
          website: input.website,
          abn: input.abn,
          streetAddress: input.streetAddress,
          city: input.city,
          state: input.state,
          postcode: input.postcode,
          productCategory: input.productCategory,
          insuranceCompany: input.insuranceCompany,
          insurancePolicyNo: input.insurancePolicyNo,
          insuranceAmount: input.insuranceAmount,
          insuranceExpiry: input.insuranceExpiry,
          insuranceDocumentUrl: input.insuranceDocumentUrl,
        });
      }
      
      return { success: true };
    }),

  uploadInsurance: protectedProcedure
    .input(z.object({
      fileData: z.string(), // base64 encoded file
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { storagePut } = await import('../storage');
      
      // Extract base64 data from data URL (remove "data:image/png;base64," prefix)
      const base64Data = input.fileData.includes(',') 
        ? input.fileData.split(',')[1] 
        : input.fileData;
      
      // Decode base64 and upload to S3
      const buffer = Buffer.from(base64Data, 'base64');
      const fileKey = `insurance/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      return { url };
    }),

  scanInsurance: protectedProcedure
    .input(z.object({
      documentUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { scanInsuranceDocument, validateInsurance } = await import('../insuranceScanner');
      
      const scanResult = await scanInsuranceDocument(input.documentUrl);
      const validation = validateInsurance(scanResult);
      
      // Return scan result with validation warnings, but don't block
      return {
        ...scanResult,
        warnings: validation.valid ? [] : validation.errors,
      };
    }),
});
