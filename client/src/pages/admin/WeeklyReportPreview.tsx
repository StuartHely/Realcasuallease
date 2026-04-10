import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useDefaultCentre } from "@/hooks/useDefaultCentre";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Calendar, Mail, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function WeeklyReportPreview() {
  const { selectedCentreId: defaultCentreId, setSelectedCentreId: setDefaultCentreId, centres } = useDefaultCentre();
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [weekDate, setWeekDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const next = new Date(today);
    next.setDate(today.getDate() + (day === 0 ? 1 : 8 - day));
    next.setHours(0, 0, 0, 0);
    return next;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    base64: string;
    filename: string;
    recipients: string[];
    centreName: string;
  } | null>(null);

  // Sync from hook's auto-selection
  useEffect(() => {
    if (defaultCentreId && !selectedCentreId) {
      setSelectedCentreId(String(defaultCentreId));
    }
  }, [defaultCentreId]);

  const generateMutation = trpc.reports.weeklyReportDownload.useMutation({
    onSuccess: (data) => {
      setReportData(data);
      toast.success("Report generated successfully");
    },
    onError: (error) => {
      toast.error("Failed to generate report: " + error.message);
    },
  });

  const handleGenerate = () => {
    if (!selectedCentreId) return;
    setReportData(null);
    generateMutation.mutate({
      centreId: Number(selectedCentreId),
      weekCommencingDate: format(weekDate, "yyyy-MM-dd"),
    });
  };

  const handleDownload = () => {
    if (!reportData) return;
    const byteCharacters = atob(reportData.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = reportData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const day = date.getDay();
    const monday = new Date(date);
    if (day !== 1) {
      const diff = day === 0 ? 1 : -(day - 1);
      monday.setDate(date.getDate() + diff);
    }
    monday.setHours(0, 0, 0, 0);
    setWeekDate(monday);
    setReportData(null);
    setCalendarOpen(false);
  };

  const weekEndDate = new Date(weekDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Weekly Report Preview</h1>
          <p className="text-muted-foreground mt-2">
            Generate and download the weekly booking report for any centre and week
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Generate Report
            </CardTitle>
            <CardDescription>
              Select a centre and week to generate the same Excel report that is emailed every Friday at 3pm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Centre Selector - native select for reliability */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Shopping Centre</label>
              <select
                value={selectedCentreId}
                onChange={(e) => {
                  setSelectedCentreId(e.target.value);
                  if (e.target.value) setDefaultCentreId(Number(e.target.value));
                  setReportData(null);
                }}
                className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a centre...</option>
                {centres?.map((centre) => (
                  <option key={centre.id} value={centre.id.toString()}>
                    {centre.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Week Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Week Commencing (Monday)</label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prev = new Date(weekDate);
                    prev.setDate(prev.getDate() - 7);
                    setWeekDate(prev);
                    setReportData(null);
                  }}
                >
                  ← Previous Week
                </Button>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[280px] justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(weekDate, "EEE dd/MM/yyyy")} — {format(weekEndDate, "EEE dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={weekDate}
                      onSelect={handleDateSelect}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = new Date(weekDate);
                    next.setDate(next.getDate() + 7);
                    setWeekDate(next);
                    setReportData(null);
                  }}
                >
                  Next Week →
                </Button>
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <Button
                onClick={handleGenerate}
                disabled={!selectedCentreId || generateMutation.isPending}
                className="flex items-center gap-2"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                {generateMutation.isPending ? "Generating..." : "Generate Report"}
              </Button>
            </div>

            {/* Error */}
            {generateMutation.isError && (
              <p className="text-red-600 text-sm">Error: {generateMutation.error.message}</p>
            )}

            {/* Results */}
            {reportData && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button onClick={handleDownload} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {reportData.filename}
                  </span>
                </div>

                {/* Show recipients info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    Email Recipients for {reportData.centreName}
                  </div>
                  {reportData.recipients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {reportData.recipients.map((email) => (
                        <Badge key={email} variant="secondary">{email}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No email recipients configured for this centre.
                      Configure them in Owners &amp; Managers → Weekly Report Settings.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
