import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, DollarSign, Save, Mail, Globe, ShieldCheck, FileSignature, ImagePlus, DatabaseBackup, Upload, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { RichTextEditor } from "@/components/RichTextEditor";

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

  // Hero image
  const heroImageQuery = trpc.systemConfig.getHeroImageUrl.useQuery(undefined, { enabled: isSuperAdmin });
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);

  const uploadHeroMutation = trpc.systemConfig.uploadHeroImage.useMutation({
    onSuccess: (data) => {
      toast.success("Hero image updated");
      setHeroImagePreview(null);
      heroImageQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to upload hero image: ${error.message}`);
    },
  });

  const resetHeroMutation = trpc.systemConfig.setHeroImageUrl.useMutation({
    onSuccess: () => {
      toast.success("Hero image reset to default");
      setHeroImagePreview(null);
      heroImageQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reset hero image: ${error.message}`);
    },
  });

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setHeroImagePreview(base64);
      uploadHeroMutation.mutate({ base64Image: base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleResetHero = () => {
    resetHeroMutation.mutate({ heroImageUrl: null });
  };

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

  // Licence Terms & Conditions
  const [licenceTerms, setLicenceTerms] = useState("");
  const [termsChanged, setTermsChanged] = useState(false);

  const termsQuery = trpc.licence.getTermsAdmin.useQuery(undefined, {
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (termsQuery.data?.terms) {
      setLicenceTerms(termsQuery.data.terms);
    }
  }, [termsQuery.data]);

  const updateTermsMutation = trpc.licence.updateTerms.useMutation({
    onSuccess: () => {
      toast.success("Licence terms updated successfully");
      setTermsChanged(false);
      termsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update terms: ${error.message}`);
    },
  });

  const handleTermsChange = (value: string) => {
    setLicenceTerms(value);
    setTermsChanged(true);
  };

  const handleSaveTerms = () => {
    updateTermsMutation.mutate({ terms: licenceTerms });
  };

  // Data Sync
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const importMutation = trpc.admin.importAllData.useMutation({
    onSuccess: (data) => {
      const imgCount = (data as any).imagesWritten || 0;
      toast.success(`Data import completed — ${imgCount} image files transferred`);
      setImportResult({ ...data.imported, "Image Files": imgCount });
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await utils.admin.exportAllData.fetch();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `casuallease-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.exportedAt || !data.tables) {
          toast.error("Invalid export file format");
          return;
        }
        if (!confirm(`Import data exported at ${data.exportedAt}? This will upsert records into the database.`)) {
          return;
        }
        importMutation.mutate(data);
      } catch {
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

        {/* Hero Image Card */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-3">
                  <ImagePlus className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Landing Page Hero Image</CardTitle>
                  <CardDescription>
                    Upload a background image for the landing page hero section
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Current Hero Image</p>
                {heroImageQuery.data?.heroImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden" style={{ maxHeight: 200 }}>
                    <img
                      src={heroImagePreview || heroImageQuery.data.heroImageUrl}
                      alt="Current hero"
                      className="w-full object-cover"
                      style={{ maxHeight: 200 }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-sm font-medium bg-black/40 px-3 py-1 rounded">
                        Preview
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 bg-[#0C4A5E] rounded-lg flex items-center justify-center">
                    <span className="text-white/60 text-sm">No image set — using solid colour fallback</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroUpload">Upload New Hero Image</Label>
                <Input
                  id="heroUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleHeroImageUpload}
                  disabled={uploadHeroMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: Wide landscape image (1920×800 or similar). Max 5MB.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleResetHero}
                  variant="outline"
                  disabled={resetHeroMutation.isPending}
                >
                  {resetHeroMutation.isPending ? "Resetting..." : "Reset to Default"}
                </Button>
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

        {/* Licence Terms & Conditions Card */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-3">
                  <FileSignature className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Licence Terms & Conditions</CardTitle>
                  <CardDescription>
                    Edit the terms and conditions included in licence agreements sent to tenants
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <RichTextEditor value={licenceTerms} onChange={handleTermsChange} />
              <Button
                onClick={handleSaveTerms}
                disabled={!termsChanged || updateTermsMutation.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {updateTermsMutation.isPending ? "Saving..." : "Save Terms"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Data Synchronization Card */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-100 p-3">
                  <DatabaseBackup className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <CardTitle>Data Synchronization</CardTitle>
                  <CardDescription>
                    Export all data as JSON or import data from another environment
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
                <p className="text-sm font-medium">Export Data</p>
                <p className="text-xs text-muted-foreground">
                  Downloads all owners, users (excluding passwords), centres, sites, categories, and configuration as a JSON file.
                </p>
                <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export Data"}
                </Button>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Import Data</p>
                <p className="text-xs text-muted-foreground">
                  Upload a previously exported JSON file. Records are upserted — existing rows are updated, new rows are inserted. Passwords are never overwritten.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importMutation.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {importMutation.isPending ? "Importing..." : "Import Data"}
                </Button>
              </div>

              {importResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                  <p className="text-sm font-medium text-green-800">Import Results</p>
                  <div className="space-y-0.5 text-xs text-green-700">
                    {Object.entries(importResult).map(([table, count]) => {
                      const labels: Record<string, string> = {
                        owners: "Owners",
                        users: "Users",
                        shoppingCentres: "Shopping Centres",
                        floorLevels: "Floor Levels",
                        sites: "Sites",
                        usageCategories: "Usage Categories",
                        siteUsageCategories: "Site ↔ Category Links",
                        thirdLineCategories: "Third Line Categories",
                        thirdLineIncome: "Third Line Income Assets",
                        vacantShops: "Vacant Shops",
                        seasonalRates: "Seasonal Rates",
                        systemConfig: "System Config",
                        faqs: "FAQs",
                        "Image Files": "Image Files",
                      };
                      return (
                        <div key={table} className="flex justify-between max-w-xs">
                          <span>{labels[table] || table}</span>
                          <span className="font-mono ml-4">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
