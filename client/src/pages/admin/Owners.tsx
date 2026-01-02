import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function AdminOwners() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Owners & Managers</h1>
        <p className="text-muted-foreground mt-1">
          Manage shopping centre owners and property managers
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Owners & Managers Management</CardTitle>
              <CardDescription>
                This feature is coming soon
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The owners and managers interface will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• View and manage shopping centre owners</li>
            <li>• Assign managers to centres and regions</li>
            <li>• Configure bank account details for payments</li>
            <li>• Set commission rates and monthly fees</li>
            <li>• Manage email notification preferences</li>
            <li>• View ownership hierarchy and access levels</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
