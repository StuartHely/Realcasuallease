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
  { value: "booking_created", label: "Booking Created" },
  { value: "booking_approved", label: "Booking Approved" },
  { value: "booking_rejected", label: "Booking Rejected" },
  { value: "booking_auto_approved", label: "Booking Auto-Approved" },
  { value: "booking_cancelled", label: "Booking Cancelled" },
  { value: "vs_booking_confirmed", label: "VS Booking Confirmed" },
  { value: "vs_booking_rejected", label: "VS Booking Rejected" },
  { value: "tli_booking_confirmed", label: "TLI Booking Confirmed" },
  { value: "tli_booking_rejected", label: "TLI Booking Rejected" },
  { value: "invoice_generated", label: "Invoice Generated" },
  { value: "payment_recorded", label: "Payment Recorded" },
  { value: "payment_received_stripe", label: "Payment Received (Stripe)" },
  { value: "payment_method_converted", label: "Payment Method Converted" },
  { value: "refund_processed", label: "Refund Processed" },
  { value: "licence_signed", label: "Licence Signed" },
  { value: "admin_booking_create", label: "Admin Booking Create" },
  { value: "admin_booking_update", label: "Admin Booking Update" },
  { value: "admin_booking_cancel", label: "Admin Booking Cancel" },
  { value: "budget_created", label: "Budget Created" },
  { value: "budget_updated", label: "Budget Updated" },
  { value: "budget_deleted", label: "Budget Deleted" },
  { value: "budget_imported", label: "Budget Imported" },
  { value: "centre_created", label: "Centre Created" },
  { value: "centre_updated", label: "Centre Updated" },
  { value: "centre_deleted", label: "Centre Deleted" },
  { value: "site_created", label: "Site Created" },
  { value: "site_updated", label: "Site Updated" },
  { value: "user_created", label: "User Created" },
  { value: "user_updated", label: "User Updated" },
  { value: "owner_created", label: "Owner Created" },
  { value: "owner_updated", label: "Owner Updated" },
  { value: "gst_percentage_changed", label: "GST % Changed" },
  { value: "tenant_domain_added", label: "Tenant Domain Added" },
  { value: "tenant_domain_removed", label: "Tenant Domain Removed" },
  { value: "tenant_branding_updated", label: "Tenant Branding Updated" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Entity Types" },
  { value: "booking", label: "Booking" },
  { value: "vs_booking", label: "VS Booking" },
  { value: "tli_booking", label: "TLI Booking" },
  { value: "centre", label: "Centre" },
  { value: "site", label: "Site" },
  { value: "user", label: "User" },
  { value: "owner", label: "Owner" },
  { value: "budget", label: "Budget" },
  { value: "refund", label: "Refund" },
  { value: "payment", label: "Payment" },
  { value: "system_config", label: "System Config" },
  { value: "tenant_domain", label: "Tenant Domain" },
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
    booking_created: "default",
    booking_approved: "default",
    booking_auto_approved: "default",
    vs_booking_confirmed: "default",
    tli_booking_confirmed: "default",
    booking_rejected: "destructive",
    booking_cancelled: "destructive",
    vs_booking_rejected: "destructive",
    tli_booking_rejected: "destructive",
    centre_deleted: "destructive",
    budget_deleted: "destructive",
    refund_processed: "secondary",
    payment_recorded: "secondary",
    payment_received_stripe: "secondary",
    invoice_generated: "secondary",
    payment_method_converted: "outline",
    licence_signed: "outline",
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
                            {log.userId ? (
                              <>
                                <div className="text-sm font-medium">{log.userName ?? "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{log.userEmail ?? ""}</div>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">System</span>
                            )}
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
