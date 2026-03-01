import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, DollarSign, Save, Mail, Globe, ShieldCheck } from "lucide-react";
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

  const [testEmail, setTestEmail] = useState("");

  const smtpStatus = trpc.systemConfig.getSmtpStatus.useQuery(undefined, {
    enabled: user?.role === "mega_admin" || user?.role === "owner_super_admin",
  });

  const sendTestEmailMutation = trpc.systemConfig.sendTestEmail.useMutation({
    onSuccess: () => {
      toast.success("Test email sent successfully!");
      setTestEmail("");
    },
    onError: (error) => {
      toast.error(`Failed to send test email: ${error.message}`);
    },
  });

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }
    sendTestEmailMutation.mutate({ to: testEmail });
  };

  const isSuperAdmin = user?.role === "mega_admin" || user?.role === "owner_super_admin";

  // Auto-approval rules
  const autoApprovalQuery = trpc.systemConfig.getAutoApprovalRules.useQuery(undefined, {
    enabled: isSuperAdmin,
  });
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(false);
  const [maxBookingValue, setMaxBookingValue] = useState("");
  const [minPriorBookings, setMinPriorBookings] = useState("");
  const [requireValidInsurance, setRequireValidInsurance] = useState(true);

  useEffect(() => {
    if (autoApprovalQuery.data) {
      setAutoApprovalEnabled(autoApprovalQuery.data.enabled);
      setMaxBookingValue(autoApprovalQuery.data.maxBookingValue?.toString() ?? "");
      setMinPriorBookings(autoApprovalQuery.data.minPriorBookings?.toString() ?? "");
      setRequireValidInsurance(autoApprovalQuery.data.requireValidInsurance);
    }
  }, [autoApprovalQuery.data]);

  const updateAutoApprovalMutation = trpc.systemConfig.updateAutoApprovalRules.useMutation({
    onSuccess: () => {
      toast.success("Auto-approval rules updated");
      autoApprovalQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update auto-approval rules: ${error.message}`);
    },
  });

  const handleSaveAutoApproval = () => {
    const maxVal = maxBookingValue.trim() ? parseFloat(maxBookingValue) : null;
    const minBookings = minPriorBookings.trim() ? parseInt(minPriorBookings, 10) : null;

    if (maxVal !== null && (isNaN(maxVal) || maxVal < 0)) {
      toast.error("Please enter a valid max booking value");
      return;
    }
    if (minBookings !== null && (isNaN(minBookings) || minBookings < 0)) {
      toast.error("Please enter a valid minimum prior bookings count");
      return;
    }

    updateAutoApprovalMutation.mutate({
      enabled: autoApprovalEnabled,
      maxBookingValue: maxVal,
      minPriorBookings: minBookings,
      requireValidInsurance,
      allowedCategoryIds: autoApprovalQuery.data?.allowedCategoryIds ?? null,
      excludeCentreIds: autoApprovalQuery.data?.excludeCentreIds ?? null,
    });
  };

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

        {/* SMTP Email Configuration Card */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>SMTP Email Configuration</CardTitle>
                  <CardDescription>
                    View SMTP status and send a test email
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium">Status:</span>
                  {smtpStatus.data?.configured ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      Not Configured
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Host</p>
                    <p className="font-mono">{smtpStatus.data?.host ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Port</p>
                    <p className="font-mono">{smtpStatus.data?.port ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Secure</p>
                    <p className="font-mono">{smtpStatus.data?.secure ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">From Address</p>
                    <p className="font-mono">{smtpStatus.data?.from ?? "—"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testEmail">Send Test Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="recipient@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={sendTestEmailMutation.isPending || !smtpStatus.data?.configured}
                  >
                    {sendTestEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                  </Button>
                </div>
                {!smtpStatus.data?.configured && (
                  <p className="text-xs text-muted-foreground">
                    SMTP must be configured before sending test emails.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Domain & Application Card */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-3">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Domain & Application</CardTitle>
                  <CardDescription>
                    Application URL and environment information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm font-medium">Current APP_URL</p>
                <p className="font-mono text-sm mt-1">{smtpStatus.data?.appUrl ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Domain configuration is managed via your hosting platform's DNS settings.
                </p>
                <p className="text-sm text-amber-800">
                  <strong>Required environment variables:</strong>{" "}
                  <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">APP_URL</code>,{" "}
                  <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">SMTP_HOST</code>,{" "}
                  <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">SMTP_PORT</code>,{" "}
                  <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">SMTP_USER</code>,{" "}
                  <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">SMTP_PASS</code>,{" "}
                  <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">SMTP_FROM</code>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auto-Approval Rules Card */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Auto-Approval Rules</CardTitle>
                  <CardDescription>
                    Configure rules to automatically approve bookings that would normally require manual review
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Enable Auto-Approval</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When enabled, bookings meeting all rule criteria will be automatically approved
                  </p>
                </div>
                <Switch
                  checked={autoApprovalEnabled}
                  onCheckedChange={setAutoApprovalEnabled}
                />
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="maxBookingValue">Maximum Booking Value ($)</Label>
                  <Input
                    id="maxBookingValue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="No limit"
                    value={maxBookingValue}
                    onChange={(e) => setMaxBookingValue(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-approve bookings with a total value at or below this amount. Leave empty for no limit.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minPriorBookings">Minimum Prior Confirmed Bookings</Label>
                  <Input
                    id="minPriorBookings"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="No requirement"
                    value={minPriorBookings}
                    onChange={(e) => setMinPriorBookings(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only auto-approve if the customer has at least this many prior confirmed bookings. Leave empty to skip this check.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requireInsurance">Require Valid Insurance</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only auto-approve if insurance is valid through the booking end date
                    </p>
                  </div>
                  <Switch
                    id="requireInsurance"
                    checked={requireValidInsurance}
                    onCheckedChange={setRequireValidInsurance}
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveAutoApproval}
                disabled={updateAutoApprovalMutation.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {updateAutoApprovalMutation.isPending ? "Saving..." : "Save Auto-Approval Rules"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
