import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { DollarSign, Loader2, Download } from "lucide-react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function GSTReport() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [basis, setBasis] = useState<"cash" | "accrual" | "both">("cash");

  const { data, isLoading } = trpc.reports.gstSummary.useQuery({
    month,
    year,
    basis,
  });

  const centres = data?.centres ?? [];

  const grandTotal = centres.reduce(
    (acc, c) => ({
      bookingCount: acc.bookingCount + (c.bookingCount ?? 0),
      revenueExGst: acc.revenueExGst + (Number(c.revenueExGst) || 0),
      gstAmount: acc.gstAmount + (Number(c.gstAmount) || 0),
      totalIncGst: acc.totalIncGst + (Number(c.totalIncGst) || 0),
      cancellationAdjustment:
        acc.cancellationAdjustment + (Number(c.cancellationAdjustment) || 0),
      netGst: acc.netGst + (Number(c.netGst) || 0),
    }),
    {
      bookingCount: 0,
      revenueExGst: 0,
      gstAmount: 0,
      totalIncGst: 0,
      cancellationAdjustment: 0,
      netGst: 0,
    },
  );

  const exportCSV = () => {
    const headers = [
      "Centre",
      "Owner",
      "Bookings",
      "Revenue (ex GST)",
      "GST",
      "Total (inc GST)",
      "Cancellation Adj.",
      "Net GST",
    ];
    const rows = centres.map((c) => [
      c.centreName ?? "",
      c.ownerName ?? "",
      c.bookingCount,
      c.revenueExGst,
      c.gstAmount,
      c.totalIncGst,
      c.cancellationAdjustment,
      c.netGst,
    ]);
    const totalRow = [
      "Grand Total",
      "",
      grandTotal.bookingCount,
      grandTotal.revenueExGst,
      grandTotal.gstAmount,
      grandTotal.totalIncGst,
      grandTotal.cancellationAdjustment,
      grandTotal.netGst,
    ];
    const csv = [headers, ...rows, totalRow]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gst-report-${MONTHS[month - 1]}-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderSummaryCard = (
    title: string,
    summary: {
      bookingCount: number;
      revenueExGst: number;
      gstAmount: number;
      totalIncGst: number;
      cancellationAdjustment: number;
      netGst: number;
    } | null,
  ) => {
    if (!summary) return null;
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Bookings</p>
              <p className="text-2xl font-bold">{summary.bookingCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue (ex GST)</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.revenueExGst)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GST Collected</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.gstAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total (inc GST)</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalIncGst)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Cancellation Adj.
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.cancellationAdjustment)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net GST</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.netGst)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">GST Report</h1>
          <p className="text-muted-foreground mt-1">
            Monthly GST summary for BAS reporting
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Month</label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Year</label>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(Number(v))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Basis</label>
                <Select value={basis} onValueChange={(v) => setBasis(v as "cash" | "accrual" | "both")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="accrual">Accrual</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={exportCSV}
                disabled={isLoading || centres.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No data */}
        {!isLoading && data && centres.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No data for this period
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && data && centres.length > 0 && (
          <>
            {/* Summary cards */}
            {basis === "both" ? (
              <div className="flex flex-col gap-4 md:flex-row">
                {renderSummaryCard("Cash Summary", data.cashSummary)}
                {renderSummaryCard("Accrual Summary", data.accrualSummary)}
              </div>
            ) : basis === "cash" ? (
              renderSummaryCard("Cash Summary", data.cashSummary)
            ) : (
              renderSummaryCard("Accrual Summary", data.accrualSummary)
            )}

            {/* Centre breakdown table */}
            <Card>
              <CardHeader>
                <CardTitle>Centre Breakdown</CardTitle>
                <CardDescription>
                  GST breakdown by shopping centre for{" "}
                  {MONTHS[month - 1]} {year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centre</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">
                        Revenue (ex GST)
                      </TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">
                        Total (inc GST)
                      </TableHead>
                      <TableHead className="text-right">
                        Cancellation Adj.
                      </TableHead>
                      <TableHead className="text-right">Net GST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centres.map((c) => (
                      <TableRow key={c.centreId}>
                        <TableCell className="font-medium">
                          {c.centreName}
                        </TableCell>
                        <TableCell>{c.ownerName ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {c.bookingCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.revenueExGst)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.gstAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.totalIncGst)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.cancellationAdjustment)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.netGst)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Grand total row */}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell>Grand Total</TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        {grandTotal.bookingCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(grandTotal.revenueExGst)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(grandTotal.gstAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(grandTotal.totalIncGst)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(grandTotal.cancellationAdjustment)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(grandTotal.netGst)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
