import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  DollarSign,
  Trash2,
  Plus,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function EFTPayments() {
  const utils = trpc.useUtils();

  // Deposit selection & filter
  const [selectedDepositId, setSelectedDepositId] = useState<number | null>(null);
  const [depositFilter, setDepositFilter] = useState<"all" | "unallocated" | "fully_allocated">("unallocated");

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankReference, setBankReference] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [notes, setNotes] = useState("");

  // Invoice search & allocation state
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Queries
  const { data: deposits = [], isLoading: depositsLoading } = trpc.eftPayments.listDeposits.useQuery({
    status: depositFilter,
  });

  const { data: unpaidInvoices = [], isLoading: invoicesLoading } = trpc.eftPayments.getUnpaidInvoices.useQuery(
    { search: invoiceSearchTerm },
    { enabled: selectedDepositId !== null },
  );

  const { data: depositDetail } = trpc.eftPayments.getDepositDetail.useQuery(
    { depositId: selectedDepositId! },
    { enabled: selectedDepositId !== null },
  );

  const selectedDeposit = deposits.find((d) => d.id === selectedDepositId);

  // Mutations
  const createDepositMutation = trpc.eftPayments.createDeposit.useMutation({
    onSuccess: () => {
      toast.success("Deposit recorded successfully");
      setDepositAmount("");
      setDepositDate(new Date().toISOString().slice(0, 10));
      setBankReference("");
      setDepositorName("");
      setNotes("");
      utils.eftPayments.listDeposits.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to record deposit: ${error.message}`);
    },
  });

  const deleteDepositMutation = trpc.eftPayments.deleteDeposit.useMutation({
    onSuccess: () => {
      toast.success("Deposit deleted");
      setSelectedDepositId(null);
      utils.eftPayments.listDeposits.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete deposit: ${error.message}`);
    },
  });

  const allocateDepositMutation = trpc.eftPayments.allocateDeposit.useMutation({
    onSuccess: () => {
      toast.success("Allocations applied successfully");
      setAllocations({});
      utils.eftPayments.listDeposits.invalidate();
      utils.eftPayments.getUnpaidInvoices.invalidate();
      utils.eftPayments.getDepositDetail.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to apply allocations: ${error.message}`);
    },
  });

  // Clear allocations when selecting a different deposit
  useEffect(() => {
    setAllocations({});
    setInvoiceSearch("");
    setInvoiceSearchTerm("");
  }, [selectedDepositId]);

  // Quick-match: auto-populate allocation if bankReference matches a booking number
  useEffect(() => {
    if (!selectedDeposit || !unpaidInvoices.length) return;

    const ref = selectedDeposit.bankReference?.trim();
    if (!ref) return;

    const remaining = parseFloat(String(selectedDeposit.unallocatedAmount));
    if (remaining <= 0) return;

    for (const inv of unpaidInvoices) {
      if (inv.bookingNumber === ref) {
        const outstanding = inv.outstandingBalance;
        const amount = Math.min(outstanding, remaining);
        if (amount > 0) {
          setAllocations((prev) => ({
            ...prev,
            [`${inv.bookingType}-${inv.bookingId}`]: amount,
          }));
        }
        break;
      }
    }
  }, [selectedDepositId, unpaidInvoices, selectedDeposit]);

  // Derived values
  const depositUnallocated = selectedDeposit ? parseFloat(String(selectedDeposit.unallocatedAmount)) : 0;
  const allocationTotal = Object.values(allocations).reduce((sum, a) => sum + a, 0);
  const remainingDeposit = depositUnallocated - allocationTotal;
  const isFullyAllocated = selectedDeposit && depositUnallocated === 0 && parseFloat(String(selectedDeposit.allocatedAmount)) > 0;

  const handleCreateDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    createDepositMutation.mutate({
      depositAmount: amount,
      depositDate,
      bankReference: bankReference || undefined,
      depositorName: depositorName || undefined,
      notes: notes || undefined,
    });
  };

  const handleInvoiceSearch = () => {
    setInvoiceSearchTerm(invoiceSearch);
  };

  const handleApplyAllocations = () => {
    if (!selectedDepositId) return;
    const items = Object.entries(allocations)
      .filter(([_, amount]) => amount > 0)
      .map(([key, amount]) => {
        const [bookingType, bookingId] = key.split("-");
        return { bookingId: parseInt(bookingId), bookingType: bookingType as "cl" | "vs" | "tli", amount };
      });

    if (items.length === 0) return;

    allocateDepositMutation.mutate({
      eftDepositId: selectedDepositId,
      allocations: items,
    });
  };

  const getStatusBadge = (deposit: (typeof deposits)[0]) => {
    const allocated = parseFloat(String(deposit.allocatedAmount));
    const unallocated = parseFloat(String(deposit.unallocatedAmount));

    if (unallocated === 0 && allocated > 0) {
      return <Badge variant="default">Fully Allocated</Badge>;
    }
    if (allocated > 0 && unallocated > 0) {
      return <Badge variant="secondary">Partial</Badge>;
    }
    return <Badge variant="destructive">Unallocated</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">EFT Payment Matching</h1>
          <p className="text-muted-foreground mt-2">
            Record bank deposits and allocate them to unpaid invoices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Deposit Entry + Deposit List */}
          <div className="space-y-6">
            {/* Record Bank Deposit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Record Bank Deposit
                </CardTitle>
                <CardDescription>
                  Enter details of an EFT deposit received into the bank account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount">Amount *</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depositDate">Date *</Label>
                    <Input
                      id="depositDate"
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankReference">Bank Reference</Label>
                    <Input
                      id="bankReference"
                      placeholder="e.g. EFT-123456"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depositorName">Depositor Name</Label>
                    <Input
                      id="depositorName"
                      placeholder="Name on deposit"
                      value={depositorName}
                      onChange={(e) => setDepositorName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateDeposit}
                  disabled={createDepositMutation.isPending}
                  className="w-full"
                >
                  {createDepositMutation.isPending ? "Recording..." : "Record Deposit"}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Deposits */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Recent Deposits</h2>
              <div className="flex gap-2">
                <Button
                  variant={depositFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepositFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={depositFilter === "unallocated" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepositFilter("unallocated")}
                >
                  Unallocated
                </Button>
                <Button
                  variant={depositFilter === "fully_allocated" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepositFilter("fully_allocated")}
                >
                  Fully Allocated
                </Button>
              </div>

              {depositsLoading ? (
                <p className="text-muted-foreground text-sm">Loading deposits...</p>
              ) : deposits.length === 0 ? (
                <p className="text-muted-foreground text-sm">No deposits found</p>
              ) : (
                <div className="space-y-2">
                  {deposits.map((deposit) => {
                    const allocated = parseFloat(String(deposit.allocatedAmount));
                    const isSelected = selectedDepositId === deposit.id;
                    const hasNoAllocations = allocated === 0;

                    return (
                      <Card
                        key={deposit.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setSelectedDepositId(isSelected ? null : deposit.id)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {formatCurrency(parseFloat(String(deposit.depositAmount)))}
                                </span>
                                {getStatusBadge(deposit)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(deposit.depositDate)}
                                {deposit.bankReference && ` · ${deposit.bankReference}`}
                                {deposit.depositorName && ` · ${deposit.depositorName}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Allocated: {formatCurrency(allocated)} · Unallocated:{" "}
                                {formatCurrency(parseFloat(String(deposit.unallocatedAmount)))}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && hasNoAllocations && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Delete this deposit?")) {
                                      deleteDepositMutation.mutate({ depositId: deposit.id });
                                    }
                                  }}
                                  disabled={deleteDepositMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Allocation */}
          <div className="space-y-6">
            {!selectedDepositId ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a deposit from the left to allocate payments
                  </p>
                </CardContent>
              </Card>
            ) : isFullyAllocated ? (
              /* Fully allocated — show allocation summary */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Deposit Fully Allocated
                  </CardTitle>
                  <CardDescription>
                    {formatCurrency(parseFloat(String(selectedDeposit!.depositAmount)))} deposited on{" "}
                    {formatDate(selectedDeposit!.depositDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {depositDetail?.allocations && depositDetail.allocations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Booking #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {depositDetail.allocations.map((alloc, i) => (
                          <TableRow key={i}>
                            <TableCell>{alloc.bookingNumber || `#${alloc.bookingId}`}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{alloc.bookingType}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(parseFloat(String(alloc.amount)))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading allocation details...</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Allocation panel */
              <>
                {/* Selected deposit summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Allocate Deposit</CardTitle>
                    <CardDescription>
                      {formatDate(selectedDeposit!.depositDate)}
                      {selectedDeposit!.bankReference && ` · ${selectedDeposit!.bankReference}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(parseFloat(String(selectedDeposit!.depositAmount)))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Allocated</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(parseFloat(String(selectedDeposit!.allocatedAmount)))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(remainingDeposit)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoice search */}
                <Card>
                  <CardHeader>
                    <CardTitle>Find Unpaid Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by booking #, customer, or centre..."
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleInvoiceSearch()}
                          className="pl-9"
                        />
                      </div>
                      <Button onClick={handleInvoiceSearch} disabled={invoicesLoading}>
                        {invoicesLoading ? "Searching..." : "Search"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Unpaid invoices table */}
                {unpaidInvoices.length > 0 && (
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Booking #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Centre</TableHead>
                              <TableHead>Asset</TableHead>
                              <TableHead className="text-right">Total (inc GST)</TableHead>
                              <TableHead className="text-right">Paid</TableHead>
                              <TableHead className="text-right">Outstanding</TableHead>
                              <TableHead className="text-right">Apply</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unpaidInvoices.map((inv) => {
                              const key = `${inv.bookingType}-${inv.bookingId}`;
                              const outstanding = inv.outstandingBalance;
                              const maxApply = Math.min(outstanding, Math.max(0, remainingDeposit + (allocations[key] || 0)));

                              return (
                                <TableRow key={key}>
                                  <TableCell className="font-mono text-sm">
                                    {inv.bookingNumber}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{inv.bookingType}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{inv.customerName}</TableCell>
                                  <TableCell className="text-sm">{inv.centreName}</TableCell>
                                  <TableCell className="text-sm">{inv.assetLabel}</TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatCurrency(parseFloat(String(inv.totalIncGst)))}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatCurrency(inv.amountPaid)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {formatCurrency(outstanding)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={maxApply}
                                      placeholder="0.00"
                                      className="w-28 text-right"
                                      value={allocations[key] || ""}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setAllocations((prev) => ({
                                          ...prev,
                                          [key]: Math.min(val, maxApply),
                                        }));
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Running total & apply button */}
                      <div className="border-t p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Total to allocate:{" "}
                            <span className="text-primary">{formatCurrency(allocationTotal)}</span>
                            {" "}of{" "}
                            <span>{formatCurrency(depositUnallocated)}</span> remaining
                          </p>
                          {allocationTotal > depositUnallocated && (
                            <p className="text-sm text-destructive font-medium">
                              Exceeds remaining deposit
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={handleApplyAllocations}
                          disabled={
                            allocationTotal === 0 ||
                            allocationTotal > depositUnallocated ||
                            allocateDepositMutation.isPending
                          }
                          className="w-full"
                        >
                          {allocateDepositMutation.isPending
                            ? "Applying..."
                            : `Apply Allocations (${formatCurrency(allocationTotal)})`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {invoiceSearchTerm && !invoicesLoading && unpaidInvoices.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No unpaid invoices found for "{invoiceSearchTerm}"
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
