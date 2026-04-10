import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MessageSquare, ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "suggestion", label: "Suggestion" },
  { value: "bug", label: "Bug Report" },
  { value: "complaint", label: "Complaint" },
];

const READ_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const categoryBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  general: "secondary",
  suggestion: "default",
  bug: "destructive",
  complaint: "outline",
};

export default function FeedbackAdmin() {
  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number } | null>(null);

  type FeedbackCategory = "general" | "suggestion" | "bug" | "complaint";
  const queryInput: { category?: FeedbackCategory; isRead?: boolean } = {};
  if (categoryFilter !== "all") queryInput.category = categoryFilter as FeedbackCategory;
  if (readFilter !== "all") queryInput.isRead = readFilter === "read";

  const { data: feedbackList, isLoading, refetch } = trpc.feedback.list.useQuery(queryInput);
  const markReadMutation = trpc.feedback.markRead.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteMutation = trpc.feedback.delete.useMutation({
    onSuccess: () => {
      toast.success("Feedback deleted");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete feedback");
    },
  });

  const totalCount = feedbackList?.length ?? 0;
  const unreadCount = feedbackList?.filter((f) => !f.isRead).length ?? 0;

  const canDelete = user?.role === "mega_admin" || user?.role === "mega_state_admin";

  const toggleRow = (id: number, isRead: boolean) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!isRead) {
          markReadMutation.mutate({ id });
        }
      }
      return next;
    });
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm({ id });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
            <p className="text-muted-foreground">View and manage user feedback</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {READ_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !feedbackList || feedbackList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                <p>No feedback entries found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    {canDelete && <TableHead className="w-12" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackList.map((item) => {
                    const isExpanded = expandedRows.has(item.id);
                    return (
                      <>
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(item.id, item.isRead)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(item.createdAt)}
                          </TableCell>
                          <TableCell>{item.name || "Anonymous"}</TableCell>
                          <TableCell>{item.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={categoryBadgeVariant[item.category] ?? "secondary"}>
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.message.length > 80
                              ? item.message.slice(0, 80) + "…"
                              : item.message}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.isRead ? "secondary" : "default"}>
                              {item.isRead ? "Read" : "Unread"}
                            </Badge>
                          </TableCell>
                          {canDelete && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.id);
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${item.id}-detail`}>
                            <TableCell colSpan={canDelete ? 8 : 7} className="bg-muted/30 p-4">
                              <div className="whitespace-pre-wrap text-sm">{item.message}</div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Feedback"
        description="Are you sure you want to delete this feedback?"
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteConfirm) {
            deleteMutation.mutate({ id: deleteConfirm.id });
            setDeleteConfirm(null);
          }
        }}
      />
      </div>
    </AdminLayout>
  );
}
