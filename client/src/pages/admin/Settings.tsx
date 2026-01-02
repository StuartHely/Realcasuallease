import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function AdminSettings() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure platform settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-3">
              <SettingsIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <CardTitle>System Settings & Configuration</CardTitle>
              <CardDescription>
                This feature is coming soon
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The settings interface will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Configure GST rates and tax settings</li>
            <li>• Set platform commission percentages</li>
            <li>• Manage email templates and notifications</li>
            <li>• Configure payment gateway settings</li>
            <li>• Set booking rules and restrictions</li>
            <li>• Customize site usage categories</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
