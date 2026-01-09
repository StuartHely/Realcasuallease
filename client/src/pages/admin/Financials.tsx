import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function AdminFinancials() {
  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground mt-1">
          View revenue, commissions, and payment reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>Financial Reports & Analytics</CardTitle>
              <CardDescription>
                This feature is coming soon
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The financial reports dashboard will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• View total revenue and booking statistics</li>
            <li>• Track commission splits and platform fees</li>
            <li>• Generate monthly remittance reports</li>
            <li>• Monitor GST collections and payments</li>
            <li>• Export financial data for accounting</li>
            <li>• View payment history and pending transactions</li>
          </ul>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
