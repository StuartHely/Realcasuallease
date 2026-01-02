import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AdminAudit() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Track all administrative changes and system events
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle>Audit Log & Activity Tracking</CardTitle>
              <CardDescription>
                This feature is coming soon
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The audit log will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• View all administrative actions and changes</li>
            <li>• Track who made changes and when</li>
            <li>• Monitor user login and access attempts</li>
            <li>• Review booking modifications and cancellations</li>
            <li>• Filter logs by date, user, or action type</li>
            <li>• Export audit trails for compliance</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
