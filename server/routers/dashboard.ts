import { ownerProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const dashboardRouter = router({
  getMetrics: ownerProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
      state: z.string().optional(), // For National Admin filtering by state
      financialYear: z.number().optional(), // For YTD calculations based on selected FY
    }))
    .query(async ({ input, ctx }) => {
      const { getPermittedSiteIds, getYTDMetrics, getMonthlyMetrics, getBudgetMetrics, getPendingApprovalsCount } = await import('../dashboardDb');
      
      // Determine which state to filter by
      let filterState: string | null = null;
      if (ctx.user.role === 'mega_state_admin' || ctx.user.role === 'owner_state_admin') {
        // State admins can only see their assigned state
        filterState = ctx.user.assignedState || null;
      } else if (input.state && input.state !== 'all') {
        // National admins can filter by any state
        filterState = input.state;
      }
      
      // Get permitted site IDs based on role and state filter
      const siteIds = await getPermittedSiteIds(ctx.user.role, filterState);
      
      if (siteIds.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No dashboard access for your role' });
      }
      
      // Get current year metrics - use financialYear for YTD if provided
      const ytdMetrics = await getYTDMetrics(siteIds, input.year, input.financialYear);
      const monthMetrics = await getMonthlyMetrics(siteIds, input.month, input.year);
      
      // Get last year metrics for comparison
      const lastYear = input.year - 1;
      const lastFY = input.financialYear ? input.financialYear - 1 : undefined;
      const ytdMetricsLastYear = await getYTDMetrics(siteIds, lastYear, lastFY);
      const monthMetricsLastYear = await getMonthlyMetrics(siteIds, input.month, lastYear);
      
      // Get budget data
      const budgetMetrics = await getBudgetMetrics(siteIds, input.month, input.year);
      
      // Get pending approvals count
      const pendingApprovalsCount = await getPendingApprovalsCount(siteIds);
      
      return {
        thisYear: {
          ytd: ytdMetrics,
          month: monthMetrics,
        },
        lastYear: {
          ytd: ytdMetricsLastYear,
          month: monthMetricsLastYear,
        },
        budget: budgetMetrics,
        pendingApprovalsCount,
        lastUpdated: new Date(),
      };
    }),
  
  getAvailableStates: ownerProcedure.query(async () => {
    const { getAvailableStates } = await import('../dashboardDb');
    return await getAvailableStates();
  }),

  getFYBudgetMetrics: ownerProcedure
    .input(z.object({
      financialYear: z.number(),
      state: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { getFYBudgetMetrics, getPermittedCentreIds } = await import('../fyBudgetDb');
      
      // Determine which state to filter by
      let filterState: string | null = null;
      if (ctx.user.role === 'mega_state_admin' || ctx.user.role === 'owner_state_admin') {
        filterState = ctx.user.assignedState || null;
      } else if (input.state && input.state !== 'all') {
        filterState = input.state;
      }
      
      // Get permitted centre IDs
      const centreIds = await getPermittedCentreIds(ctx.user.role, filterState);
      
      // Get FY budget metrics
      return await getFYBudgetMetrics(centreIds, input.financialYear);
    }),

  getSiteBreakdown: ownerProcedure
    .input(z.object({
      year: z.number(),
      breakdownType: z.enum(['annual', 'ytd']),
      state: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { getSiteBreakdown } = await import('../dashboardDb');
      
      // Determine which state to filter by
      let filterState: string | undefined = input.state;
      if (ctx.user.role === 'mega_state_admin' || ctx.user.role === 'owner_state_admin') {
        // State admins can only see their assigned state
        filterState = ctx.user.assignedState || undefined;
      }
      
      return await getSiteBreakdown(
        ctx.user.role,
        ctx.user.assignedState || null,
        input.year,
        input.breakdownType,
        filterState
      );
    }),

  getCentreBreakdown: ownerProcedure
    .input(z.object({
      financialYear: z.number(),
      breakdownType: z.enum(['annual', 'ytd']),
      state: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { getCentreBreakdown } = await import('../fyBudgetDb');
      
      // Determine which state to filter by
      let filterState: string | undefined = input.state;
      if (ctx.user.role === 'mega_state_admin' || ctx.user.role === 'owner_state_admin') {
        // State admins can only see their assigned state
        filterState = ctx.user.assignedState || undefined;
      }
      
      return await getCentreBreakdown(
        ctx.user.role,
        ctx.user.assignedState || null,
        input.financialYear,
        input.breakdownType,
        filterState
      );
    }),

  exportBudgetReport: ownerProcedure
    .input(z.object({
      financialYear: z.number(),
      state: z.string().optional(),
      format: z.enum(['pdf', 'excel']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getCentreBreakdown, getFyPercentages, getCentreBudgetsForYear } = await import('../fyBudgetDb');
      const { getYTDMetrics } = await import('../dashboardDb');
      
      // Determine which state to filter by
      let filterState: string | undefined = input.state;
      if (ctx.user.role === 'mega_state_admin' || ctx.user.role === 'owner_state_admin') {
        filterState = ctx.user.assignedState || undefined;
      }
      
      // Get data for report
      const centreBreakdown = await getCentreBreakdown(
        ctx.user.role,
        ctx.user.assignedState || null,
        input.financialYear,
        'annual',
        filterState
      );
      
      const percentages = await getFyPercentages(input.financialYear);
      const centreBudgetsData = await getCentreBudgetsForYear(input.financialYear);
      
      // Calculate totals
      const totalBudget = centreBreakdown.reduce((sum, c) => sum + c.budget, 0);
      const totalActual = centreBreakdown.reduce((sum, c) => sum + c.actual, 0);
      const totalVariance = totalActual - totalBudget;
      const overallPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
      
      if (input.format === 'excel') {
        // Generate Excel file
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
          { header: 'Metric', key: 'metric', width: 30 },
          { header: 'Value', key: 'value', width: 20 },
        ];
        summarySheet.addRow({ metric: 'Financial Year', value: `FY ${input.financialYear - 1}-${input.financialYear}` });
        summarySheet.addRow({ metric: 'Report Generated', value: new Date().toLocaleString() });
        summarySheet.addRow({ metric: 'State Filter', value: filterState || 'All States' });
        summarySheet.addRow({ metric: '', value: '' });
        summarySheet.addRow({ metric: 'Total Annual Budget', value: `$${totalBudget.toLocaleString()}` });
        summarySheet.addRow({ metric: 'Total Actual Revenue', value: `$${totalActual.toLocaleString()}` });
        summarySheet.addRow({ metric: 'Total Variance', value: `$${totalVariance.toLocaleString()}` });
        summarySheet.addRow({ metric: 'Overall Achievement', value: `${overallPercentage.toFixed(1)}%` });
        
        // Centre Breakdown Sheet
        const breakdownSheet = workbook.addWorksheet('Centre Breakdown');
        breakdownSheet.columns = [
          { header: 'Centre', key: 'centre', width: 35 },
          { header: 'State', key: 'state', width: 10 },
          { header: 'Annual Budget', key: 'budget', width: 18 },
          { header: 'Actual Revenue', key: 'actual', width: 18 },
          { header: 'Variance', key: 'variance', width: 18 },
          { header: '% Achieved', key: 'percentage', width: 15 },
        ];
        
        centreBreakdown.forEach(centre => {
          breakdownSheet.addRow({
            centre: centre.centreName,
            state: centre.centreState,
            budget: `$${centre.budget.toLocaleString()}`,
            actual: `$${centre.actual.toLocaleString()}`,
            variance: `$${centre.variance.toLocaleString()}`,
            percentage: `${centre.percentAchieved.toFixed(1)}%`,
          });
        });
        
        // Monthly Percentages Sheet
        const percentagesSheet = workbook.addWorksheet('Monthly Percentages');
        percentagesSheet.columns = [
          { header: 'Month', key: 'month', width: 15 },
          { header: 'Percentage', key: 'percentage', width: 15 },
        ];
        const monthNames = ['July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June'];
        if (percentages) {
          const pctValues = [percentages.july, percentages.august, percentages.september, percentages.october, percentages.november, percentages.december, percentages.january, percentages.february, percentages.march, percentages.april, percentages.may, percentages.june];
          monthNames.forEach((month, i) => {
            percentagesSheet.addRow({ month, percentage: `${pctValues[i]}%` });
          });
        }
        
        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return {
          data: Buffer.from(buffer as ArrayBuffer).toString('base64'),
          filename: `Budget_Report_FY${input.financialYear - 1}-${input.financialYear}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } else {
        // Generate PDF using HTML template
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #1e40af; margin-bottom: 5px; }
              h2 { color: #374151; margin-top: 30px; }
              .subtitle { color: #6b7280; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
              th { background-color: #f3f4f6; font-weight: 600; }
              .positive { color: #059669; }
              .negative { color: #dc2626; }
              .summary-box { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
              .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
              .summary-item { text-align: center; }
              .summary-value { font-size: 24px; font-weight: bold; color: #1e40af; }
              .summary-label { color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <h1>Budget vs Actual Report</h1>
            <p class="subtitle">Financial Year ${input.financialYear - 1}-${input.financialYear} | ${filterState || 'All States'} | Generated: ${new Date().toLocaleDateString()}</p>
            
            <div class="summary-box">
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-value">$${totalBudget.toLocaleString()}</div>
                  <div class="summary-label">Annual Budget</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">$${totalActual.toLocaleString()}</div>
                  <div class="summary-label">Actual Revenue</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value ${totalVariance >= 0 ? 'positive' : 'negative'}">$${totalVariance.toLocaleString()}</div>
                  <div class="summary-label">Variance</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${overallPercentage.toFixed(1)}%</div>
                  <div class="summary-label">Achievement</div>
                </div>
              </div>
            </div>
            
            <h2>Centre Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Centre</th>
                  <th>State</th>
                  <th>Budget</th>
                  <th>Actual</th>
                  <th>Variance</th>
                  <th>% Achieved</th>
                </tr>
              </thead>
              <tbody>
                ${centreBreakdown.map(c => `
                  <tr>
                    <td>${c.centreName}</td>
                    <td>${c.centreState}</td>
                    <td>$${c.budget.toLocaleString()}</td>
                    <td>$${c.actual.toLocaleString()}</td>
                    <td class="${c.variance >= 0 ? 'positive' : 'negative'}">$${c.variance.toLocaleString()}</td>
                    <td>${c.percentAchieved.toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;
        
        // Generate PDF using pdfkit
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        // Title
        doc.fontSize(24).fillColor('#1e40af').text('Budget vs Actual Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#6b7280').text(
          `Financial Year ${input.financialYear - 1}-${input.financialYear} | ${filterState || 'All States'} | Generated: ${new Date().toLocaleDateString()}`,
          { align: 'center' }
        );
        doc.moveDown(2);
        
        // Summary Box
        doc.fontSize(14).fillColor('#1e40af').text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151');
        doc.text(`Total Annual Budget: $${totalBudget.toLocaleString()}`);
        doc.text(`Total Actual Revenue: $${totalActual.toLocaleString()}`);
        doc.text(`Total Variance: $${totalVariance.toLocaleString()}`, { continued: false });
        doc.text(`Overall Achievement: ${overallPercentage.toFixed(1)}%`);
        doc.moveDown(2);
        
        // Centre Breakdown Table
        doc.fontSize(14).fillColor('#1e40af').text('Centre Breakdown', { underline: true });
        doc.moveDown(0.5);
        
        // Table headers
        const tableTop = doc.y;
        const colWidths = [150, 40, 80, 80, 80, 60];
        const headers = ['Centre', 'State', 'Budget', 'Actual', 'Variance', '% Achieved'];
        
        doc.fontSize(10).fillColor('#374151');
        let xPos = 50;
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e5e7eb');
        doc.moveDown(0.3);
        
        // Table rows
        centreBreakdown.forEach(c => {
          const rowY = doc.y;
          xPos = 50;
          const rowData = [
            c.centreName.substring(0, 25),
            c.centreState,
            `$${c.budget.toLocaleString()}`,
            `$${c.actual.toLocaleString()}`,
            `$${c.variance.toLocaleString()}`,
            `${c.percentAchieved.toFixed(1)}%`
          ];
          rowData.forEach((cell, i) => {
            doc.text(cell, xPos, rowY, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
          });
          doc.moveDown(0.8);
        });
        
        doc.end();
        
        // Wait for PDF to finish
        await new Promise<void>((resolve) => doc.on('end', resolve));
        const pdfBuffer = Buffer.concat(chunks);
        
        return {
          data: pdfBuffer.toString('base64'),
          filename: `Budget_Report_FY${input.financialYear - 1}-${input.financialYear}.pdf`,
          mimeType: 'application/pdf',
          };
          }
          }),

          // Check for cancellations that affect a closed financial period
          getCancellationsAffectingPeriod: adminProcedure
            .input(z.object({
              periodStart: z.date(),
              periodEnd: z.date(),
            }))
            .query(async ({ input }) => {
              const { getRecentCancellationsAffectingPeriod } = await import('../dashboardDb');
              return await getRecentCancellationsAffectingPeriod(input.periodStart, input.periodEnd);
            }),
          });
