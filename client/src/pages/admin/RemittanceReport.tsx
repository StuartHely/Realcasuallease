import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Building2, Landmark } from "lucide-react";

export default function RemittanceReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { data: report, isLoading, refetch } = trpc.dashboard.getRemittanceReport.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const exportMutation = trpc.dashboard.exportRemittanceExcel.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const yearOptions = [selectedYear, selectedYear - 1, selectedYear - 2];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Month-End Remittance Report</h1>
            <p className="text-gray-600 mt-1">Grouped by Owner → Portfolio → Centre with bank details</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => exportMutation.mutate({ month: selectedMonth, year: selectedYear })}
              disabled={exportMutation.isPending || !report || report.owners.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              {exportMutation.isPending ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !report || report.owners.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-600">No confirmed bookings found for {monthNames[selectedMonth - 1]} {selectedYear}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {report.owners.map((owner) => (
              <Card key={owner.ownerId}>
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {owner.ownerName}
                    <span className="text-sm font-normal text-gray-500 ml-auto">
                      Subtotal: {formatCurrency(owner.subtotal.totalAmount + owner.subtotal.gstAmount)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {owner.portfolios.map((portfolio) => (
                    <div key={portfolio.portfolioId ?? 'none'} className="border-b last:border-b-0">
                      <div className="px-6 py-3 bg-blue-50 flex items-center justify-between">
                        <p className="text-sm font-semibold text-blue-900">{portfolio.portfolioName}</p>
                        <span className="text-sm text-blue-700">
                          Subtotal: {formatCurrency(portfolio.subtotal.totalAmount + portfolio.subtotal.gstAmount)}
                        </span>
                      </div>

                      {portfolio.centres.map((centre) => (
                        <div key={centre.centreId} className="border-t">
                          <div className="px-6 py-3 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-medium text-gray-900">{centre.centreName}</p>
                              {centre.bankDetails && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Landmark className="h-3 w-3" />
                                  BSB: {centre.bankDetails.bsb} | Acct: {centre.bankDetails.accountNumber} | {centre.bankDetails.accountName}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {formatCurrency(centre.subtotal.totalAmount + centre.subtotal.gstAmount)}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Booking #</TableHead>
                                  <TableHead>Customer</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Asset</TableHead>
                                  <TableHead>Start</TableHead>
                                  <TableHead>End</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead className="text-right">GST</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead>Payment</TableHead>
                                  <TableHead>Paid</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {centre.bookings.map((booking) => (
                                  <TableRow key={booking.bookingNumber}>
                                    <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                                    <TableCell>{booking.customerName}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {booking.assetType === 'site' ? 'Site' : booking.assetType === 'vacant_shop' ? 'VS' : '3rdL'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{booking.assetIdentifier}</TableCell>
                                    <TableCell>{formatDate(booking.startDate)}</TableCell>
                                    <TableCell>{formatDate(booking.endDate)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(booking.totalAmount)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(booking.gstAmount)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(booking.totalAmount + booking.gstAmount)}</TableCell>
                                    <TableCell>
                                      <Badge variant={booking.paymentMethod === 'invoice' ? 'secondary' : 'default'} className="text-xs">
                                        {booking.paymentMethod === 'invoice' ? 'Invoice' : 'Stripe'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={booking.paidAt ? 'default' : 'destructive'} className={`text-xs ${booking.paidAt ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}`}>
                                        {booking.paidAt ? 'Paid' : 'Unpaid'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Grand Total */}
            <Card className="border-2 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-900">Grand Total</p>
                  <div className="text-right space-y-1">
                    <p className="text-sm text-gray-600">
                      Amount: {formatCurrency(report.grandTotal.totalAmount)} | GST: {formatCurrency(report.grandTotal.gstAmount)}
                    </p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(report.grandTotal.totalAmount + report.grandTotal.gstAmount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Owner: {formatCurrency(report.grandTotal.ownerAmount)} | Platform: {formatCurrency(report.grandTotal.platformFee)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
