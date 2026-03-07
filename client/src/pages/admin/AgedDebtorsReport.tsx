import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, ChevronRight, ChevronDown } from "lucide-react";

const BUCKET_LABELS = ["Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"] as const;

type BucketKey = "current" | "days1_30" | "days31_60" | "days61_90" | "days90Plus" | "total";

const BUCKET_KEYS: BucketKey[] = ["current", "days1_30", "days31_60", "days61_90", "days90Plus", "total"];

const BUCKET_COLOURS: Record<BucketKey, string> = {
  current: "text-green-700 bg-green-50 border-green-200",
  days1_30: "text-amber-700 bg-amber-50 border-amber-200",
  days31_60: "text-amber-700 bg-amber-50 border-amber-200",
  days61_90: "text-red-700 bg-red-50 border-red-200",
  days90Plus: "text-red-700 bg-red-50 border-red-200",
  total: "text-gray-900 bg-gray-50 border-gray-200",
};

const CELL_COLOURS: Record<string, string> = {
  current: "text-green-700",
  days1_30: "text-amber-600",
  days31_60: "text-amber-600",
  days61_90: "text-red-600",
  days90Plus: "text-red-700 font-semibold",
};

function fmt(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function AgedDebtorsReport() {
  const [groupBy, setGroupBy] = useState<"customer" | "centre">("customer");
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set());

  const { data, isLoading } = trpc.reports.agedDebtors.useQuery({ groupBy });

  function toggleExpanded(groupId: string | number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function exportCsv() {
    if (!data) return;

    const rows: string[][] = [];
    rows.push(["Group", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"]);

    // Summary row
    const s = data.summary;
    rows.push(["SUMMARY", fmt(s.current), fmt(s.days1_30), fmt(s.days31_60), fmt(s.days61_90), fmt(s.days90Plus), fmt(s.total)]);
    rows.push([]);

    rows.push(["Group", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total",
      "Booking #", "Asset Type", "Centre", "Start Date", "End Date", "Total (GST)", "Due Date", "Days Overdue", "Bucket"]);

    for (const group of data.groups) {
      const b = group.buckets;
      rows.push([group.groupName, fmt(b.current), fmt(b.days1_30), fmt(b.days31_60), fmt(b.days61_90), fmt(b.days90Plus), fmt(b.total)]);

      for (const d of group.details) {
        rows.push([
          "", "", "", "", "", "", "",
          d.bookingNumber,
          d.assetType,
          d.centreName,
          String(d.startDate),
          String(d.endDate),
          fmt(d.totalWithGst),
          String(d.dueDate),
          String(d.daysOverdue),
          d.bucket,
        ]);
      }
    }

    const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aged-debtors-${groupBy}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aged Debtors Report</h1>
          <p className="text-gray-600 mt-1">Outstanding invoice payments by ageing period</p>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Group by:</span>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "customer" | "centre")}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">By Customer</SelectItem>
                    <SelectItem value="centre">By Centre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button size="sm" onClick={exportCsv} disabled={!data || data.groups.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.groups.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-600">No outstanding debtor records found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {BUCKET_KEYS.map((key, i) => (
                <Card key={key} className={`border ${BUCKET_COLOURS[key]}`}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide opacity-80">
                      {BUCKET_LABELS[i]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-lg font-bold">{fmt(data.summary[key])}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detail table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[280px]">Name</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">1-30 Days</TableHead>
                        <TableHead className="text-right">31-60 Days</TableHead>
                        <TableHead className="text-right">61-90 Days</TableHead>
                        <TableHead className="text-right">90+ Days</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.groups.map((group) => {
                        const isExpanded = expanded.has(group.groupId);
                        return (
                          <>
                            <TableRow
                              key={`group-${group.groupId}`}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleExpanded(group.groupId)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                                  )}
                                  <div>
                                    <span>{group.groupName}</span>
                                    {group.groupSubtitle && (
                                      <span className="block text-xs text-gray-500">{group.groupSubtitle}</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              {BUCKET_KEYS.map((key) => (
                                <TableCell
                                  key={key}
                                  className={`text-right font-medium ${key === "total" ? "font-bold" : CELL_COLOURS[key] ?? ""}`}
                                >
                                  {fmt(group.buckets[key])}
                                </TableCell>
                              ))}
                            </TableRow>

                            {isExpanded &&
                              group.details.map((d) => (
                                <TableRow key={`detail-${d.bookingId}`} className="bg-gray-50/50">
                                  <TableCell className="pl-12">
                                    <div className="text-sm">
                                      <span className="font-medium">{d.bookingNumber}</span>
                                      <span className="text-gray-500 ml-2">{d.assetType}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {d.centreName} · {new Date(d.startDate).toLocaleDateString()} – {new Date(d.endDate).toLocaleDateString()}
                                    </div>
                                  </TableCell>
                                  {BUCKET_KEYS.map((key) => (
                                    <TableCell
                                      key={key}
                                      className={`text-right text-sm ${d.bucket === key ? (CELL_COLOURS[key] ?? "font-medium") : "text-gray-300"}`}
                                    >
                                      {d.bucket === key ? fmt(d.totalWithGst) : key === "total" ? fmt(d.totalWithGst) : "–"}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                          </>
                        );
                      })}

                      {/* Summary footer row */}
                      <TableRow className="border-t-2 bg-gray-100 font-bold">
                        <TableCell>Total</TableCell>
                        {BUCKET_KEYS.map((key) => (
                          <TableCell key={key} className={`text-right ${key === "total" ? "text-gray-900" : CELL_COLOURS[key] ?? ""}`}>
                            {fmt(data.summary[key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
