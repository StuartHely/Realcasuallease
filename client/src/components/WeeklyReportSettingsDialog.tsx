import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Mail, Send, Calendar } from "lucide-react";

interface WeeklyReportSettingsDialogProps {
  centre: {
    id: number;
    name: string;
    weeklyReportEmail1?: string | null;
    weeklyReportEmail2?: string | null;
    weeklyReportEmail3?: string | null;
    weeklyReportEmail4?: string | null;
    weeklyReportEmail5?: string | null;
    weeklyReportEmail6?: string | null;
    weeklyReportEmail7?: string | null;
    weeklyReportEmail8?: string | null;
    weeklyReportEmail9?: string | null;
    weeklyReportEmail10?: string | null;
    weeklyReportTimezone?: string | null;
    weeklyReportNextOverrideDay?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIMEZONES = [
  { value: "Australia/Sydney", label: "Sydney (NSW, VIC, TAS, ACT)" },
  { value: "Australia/Brisbane", label: "Brisbane (QLD)" },
  { value: "Australia/Adelaide", label: "Adelaide (SA)" },
  { value: "Australia/Perth", label: "Perth (WA)" },
  { value: "Australia/Darwin", label: "Darwin (NT)" },
];

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export function WeeklyReportSettingsDialog({ centre, open, onOpenChange }: WeeklyReportSettingsDialogProps) {
  const utils = trpc.useUtils();
  const [emails, setEmails] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("Australia/Sydney");
  const [overrideDay, setOverrideDay] = useState<string>("none");

  // Reset form data when centre changes or dialog opens
  useEffect(() => {
    if (open) {
      // Combine all email fields into comma-separated string
      const emailList: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const emailField = `weeklyReportEmail${i}` as keyof typeof centre;
        const email = centre[emailField];
        if (email && typeof email === 'string' && email.trim()) {
          emailList.push(email.trim());
        }
      }
      setEmails(emailList.join(", "));
      setTimezone(centre.weeklyReportTimezone || "Australia/Sydney");
      setOverrideDay(centre.weeklyReportNextOverrideDay || "none");
    }
  }, [centre, open]);

  const updateMutation = trpc.centres.updateWeeklyReportSettings.useMutation({
    onSuccess: () => {
      toast.success("Weekly report settings updated successfully");
      utils.centres.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const testReportMutation = trpc.centres.sendTestWeeklyReport.useMutation({
    onSuccess: () => {
      toast.success("Test report sent! Check your inbox.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send test report");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse comma-separated emails
    const emailList = emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailList.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }

    if (emailList.length > 10) {
      toast.error("Maximum 10 email addresses allowed");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emailList) {
      if (!emailRegex.test(email)) {
        toast.error(`Invalid email format: ${email}`);
        return;
      }
    }

    // Prepare update data
    const updateData: any = {
      id: centre.id,
      weeklyReportTimezone: timezone,
      weeklyReportNextOverrideDay: overrideDay === "none" ? null : overrideDay,
    };

    // Add email fields
    for (let i = 1; i <= 10; i++) {
      updateData[`weeklyReportEmail${i}`] = emailList[i - 1] || null;
    }

    updateMutation.mutate(updateData);
  };

  const handleTestReport = () => {
    testReportMutation.mutate({ centreId: centre.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Weekly Booking Report Settings
          </DialogTitle>
          <DialogDescription>
            Configure automated Friday 3pm booking reports for {centre.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Recipients */}
          <div className="space-y-2">
            <Label htmlFor="emails">
              Email Recipients (comma-separated, max 10)
            </Label>
            <Input
              id="emails"
              type="text"
              placeholder="email1@example.com, email2@example.com, ..."
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Enter up to 10 email addresses separated by commas
            </p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">
              Timezone (for 3pm send time)
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Reports will be sent at 3:00 PM in this timezone every Friday
            </p>
          </div>

          {/* Public Holiday Override */}
          <div className="space-y-2">
            <Label htmlFor="override" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Public Holiday Override (one-time only)
            </Label>
            <Select value={overrideDay} onValueChange={setOverrideDay}>
              <SelectTrigger id="override">
                <SelectValue placeholder="Use default Friday (no override)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No override (use Friday)</SelectItem>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              If a public holiday falls on Friday, select an alternative day for the next report only. 
              After sending, this will automatically reset to Friday.
            </p>
          </div>

          {/* Report Info */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium">Report Details</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Sent every Friday at 3:00 PM (or override day if set)</li>
              <li>• Covers 9 consecutive days: Sunday before week + 7 days + Monday after</li>
              <li>• Excel format with site-by-site booking details</li>
              <li>• Includes company name, contact info, dates, tables/chairs</li>
            </ul>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestReport}
              disabled={testReportMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {testReportMutation.isPending ? "Sending..." : "Send Test Report Now"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
