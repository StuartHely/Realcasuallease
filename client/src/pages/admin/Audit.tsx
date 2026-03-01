import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Shield, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "booking_approved", label: "Booking Approved" },
  { value: "booking_rejected", label: "Booking Rejected" },
  { value: "booking_cancelled", label: "Booking Cancelled" },
  { value: "refund_processed", label: "Refund Processed" },
  { value: "payment_method_converted", label: "Payment Method Converted" },
  { value: "user_updated", label: "User Updated" },
  { value: "centre_updated", label: "Centre Updated" },
  { value: "site_updated", label: "Site Updated" },
  { value: "site_created", label: "Site Created" },
  { value: "site_deleted", label: "Site Deleted" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Entity Types" },
  { value: "booking", label: "Booking" },
  { value: "centre", label: "Centre" },
  { value: "site", label: "Site" },
  { value: "user", label: "User" },
  { value: "refund", label: "Refund" },
  { value: "payment", label: "Payment" },
];

const PAGE_SIZE = 100;

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatActionBadge(action: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    booking_approved: "default",
    booking_rejected: "destructive",
    booking_cancelled: "destructive",
    refund_processed: "secondary",
    payment_method_converted: "outline",
  };
  return (
    <Badge variant={variants[action] ?? "secondary"}>
      {action.replace(/_/g, " ")}
    </Badge>
  );
}

function ChangesCell({ changes }: { changes: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!changes) return <span className="text-muted-foreground">—</span>;

  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(changes), null, 2);
  } catch {
    formatted = changes;
  }

  if (formatted.length <= 80 && !formatted.includes("\n")) {
    return <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{formatted}</code>;
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Collapse
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            View Changes
          </>
        )}
      </Button>
      {expanded && (
        <pre className="mt-2 text-xs bg-muted p-3 rounded-md overflow-auto max-h-64 max-w-md">
          <code>{formatted}</code>
        </pre>
      )}
    </div>
  );
}

export default function AdminAudit() {
  const [actionFilter, setActionFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = trpc.audit.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    action: actionFilter !== "all" ? actionFilter : undefined,
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilterChange = () => {
    setPage(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Track all administrative changes and system events
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-3">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Activity Log</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {total} total entries
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="w-[220px]">
                <Select
                  value={actionFilter}
                  onValueChange={(v) => {
                    setActionFilter(v);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[220px]">
                <Select
                  value={entityTypeFilter}
                  onValueChange={(v) => {
                    setEntityTypeFilter(v);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No audit log entries found.
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Date/Time</TableHead>
                        <TableHead className="w-[180px]">User</TableHead>
                        <TableHead className="w-[180px]">Action</TableHead>
                        <TableHead className="w-[120px]">Entity Type</TableHead>
                        <TableHead className="w-[90px]">Entity ID</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead className="w-[120px]">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{log.userName ?? "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{log.userEmail ?? ""}</div>
                          </TableCell>
                          <TableCell>{formatActionBadge(log.action)}</TableCell>
                          <TableCell>
                            {log.entityType ? (
                              <Badge variant="outline">{log.entityType}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.entityId ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <ChangesCell changes={log.changes} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.ipAddress ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
