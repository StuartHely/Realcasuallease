import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, AlertCircle, Clock, CheckCircle, Download, Search } from 'lucide-react';

export default function InvoiceDashboard() {
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'overdue' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMode, setPaymentMode] = useState<'all' | 'invoice' | 'stripe'>('all');

  const { data: stats, isLoading: statsLoading } = trpc.admin.getInvoiceStats.useQuery({ paymentMode });
  const { data: invoices, isLoading: invoicesLoading } = trpc.admin.getInvoiceList.useQuery({ filter, paymentMode });
  const { data: paymentHistory, isLoading: historyLoading } = trpc.admin.getPaymentHistory.useQuery({ searchTerm, paymentMode });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(Number(amount));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const exportToCSV = () => {
    if (!invoices || invoices.length === 0) return;

    const headers = ['Booking Number', 'Customer', 'Company', 'Centre', 'Site', 'Start Date', 'End Date', 'Amount', 'Payment Mode', 'Due Date', 'Days Until Due', 'Status'];
    const rows = invoices.map(inv => [
      inv.bookingNumber,
      inv.customerName,
      inv.companyName || '',
      inv.centreName,
      inv.siteNumber,
      formatDate(inv.startDate),
      formatDate(inv.endDate),
      formatCurrency(Number(inv.totalAmount) + Number(inv.gstAmount)),
      inv.paymentMethod === 'invoice' ? 'Invoice' : 'Stripe',
      inv.dueDate ? formatDate(inv.dueDate) : '',
      inv.daysUntilDue.toString(),
      inv.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${filter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Dashboard</h1>
          <p className="text-gray-600 mt-2">Track outstanding invoices and payment history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.totalOutstanding || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {stats?.outstandingCount || 0} invoice{stats?.outstandingCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? '...' : formatCurrency(stats?.totalOverdue || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {stats?.overdueCount || 0} invoice{stats?.overdueCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency((stats?.totalOutstanding || 0) + (stats?.totalOverdue || 0))}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {(stats?.outstandingCount || 0) + (stats?.overdueCount || 0)} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Required</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.overdueCount || 0}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Overdue invoices need follow-up
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Invoice List and Payment History */}
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList>
            <TabsTrigger value="invoices">Invoice List</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invoices</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      disabled={!invoices || invoices.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === 'outstanding' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('outstanding')}
                  >
                    Outstanding
                  </Button>
                  <Button
                    variant={filter === 'overdue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('overdue')}
                  >
                    Overdue
                  </Button>
                  <Button
                    variant={filter === 'paid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('paid')}
                  >
                    Paid
                  </Button>

                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)}>
                    <SelectTrigger className="w-[150px] h-8">
                      <SelectValue placeholder="Payment Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      <SelectItem value="invoice">Invoice Only</SelectItem>
                      <SelectItem value="stripe">Stripe Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="text-center py-8 text-gray-600">Loading invoices...</div>
                ) : !invoices || invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">No invoices found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.bookingId}>
                            <TableCell className="font-medium">{invoice.bookingNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{invoice.customerName}</div>
                                <div className="text-sm text-gray-600">{invoice.customerEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>{invoice.companyName || '-'}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{invoice.centreName}</div>
                                <div className="text-sm text-gray-600">Site {invoice.siteNumber}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(Number(invoice.totalAmount) + Number(invoice.gstAmount))}
                            </TableCell>
                            <TableCell>
                              <Badge variant={invoice.paymentMethod === 'invoice' ? 'secondary' : 'default'} className="text-xs">
                                {invoice.paymentMethod === 'invoice' ? 'Invoice' : 'Stripe'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</div>
                                <div className={`text-sm ${invoice.daysUntilDue < 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                  {invoice.daysUntilDue < 0
                                    ? `${Math.abs(invoice.daysUntilDue)} days overdue`
                                    : `${invoice.daysUntilDue} days remaining`}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === 'overdue' ? 'destructive' : 'default'}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by booking number, customer name, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center py-8 text-gray-600">Loading payment history...</div>
                ) : !paymentHistory || paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">No payment history found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Paid Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.bookingId}>
                            <TableCell className="font-medium">{payment.bookingNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{payment.customerName}</div>
                                <div className="text-sm text-gray-600">{payment.customerEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>{payment.companyName || '-'}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{payment.centreName}</div>
                                <div className="text-sm text-gray-600">Site {payment.siteNumber}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payment.totalWithGst)}
                            </TableCell>
                            <TableCell>
                              {payment.paidAt ? formatDate(payment.paidAt) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
