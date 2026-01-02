import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users as UsersIcon } from "lucide-react";

export default function AdminUsers() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                This feature is coming soon
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The user management interface will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• View and search all registered users</li>
            <li>• Edit user profiles and contact information</li>
            <li>• Manage user roles and permissions</li>
            <li>• Activate or deactivate user accounts</li>
            <li>• View user booking history</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
