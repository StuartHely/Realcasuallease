import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, DollarSign, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminSettings() {
  const { user } = useAuth();
  const { data: gstData, refetch } = trpc.systemConfig.getGstPercentage.useQuery();
  const [gstPercentage, setGstPercentage] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const updateGstMutation = trpc.systemConfig.setGstPercentage.useMutation({
    onSuccess: (data) => {
      toast.success(`GST percentage updated to ${data.gstPercentage}%`);
      setIsEditing(false);
      setGstPercentage("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update GST: ${error.message}`);
    },
  });

  const handleSaveGst = () => {
    const percentage = parseFloat(gstPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Please enter a valid percentage between 0 and 100");
      return;
    }
    updateGstMutation.mutate({ gstPercentage: percentage });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setGstPercentage("");
  };

  const isSuperAdmin = user?.role === "mega_admin" || user?.role === "owner_super_admin";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure platform settings and preferences
          </p>
        </div>

        {/* GST Configuration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>GST Configuration</CardTitle>
                  <CardDescription>
                    Manage the GST percentage applied to all invoiced amounts
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current GST Rate</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {gstData?.gstPercentage ?? 10.0}%
                  </p>
                </div>
                {isSuperAdmin && !isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    Edit Rate
                  </Button>
                )}
              </div>
            </div>

            {isEditing && isSuperAdmin && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="gstPercentage">New GST Percentage</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="gstPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder={`Current: ${gstData?.gstPercentage ?? 10.0}%`}
                        value={gstPercentage}
                        onChange={(e) => setGstPercentage(e.target.value)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a value between 0 and 100. This will apply to all new bookings and invoices.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveGst}
                    disabled={updateGstMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateGstMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    disabled={updateGstMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!isSuperAdmin && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Only SuperAdmin users can modify the GST percentage.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Settings Placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-3">
                <SettingsIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <CardTitle>Additional Settings</CardTitle>
                <CardDescription>
                  More configuration options coming soon
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Future settings will include:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• Platform commission percentages</li>
              <li>• Email templates and notifications</li>
              <li>• Payment gateway settings</li>
              <li>• Booking rules and restrictions</li>
              <li>• Site usage categories management</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
