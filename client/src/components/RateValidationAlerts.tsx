import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cleanHtmlDescription } from "@/lib/htmlUtils";

export function RateValidationAlerts() {
  const [showAlerts, setShowAlerts] = useState(false);
  const { data: alerts, refetch } = trpc.systemConfig.getRateValidationAlerts.useQuery(
    undefined,
    { enabled: showAlerts }
  );
  const triggerValidation = trpc.systemConfig.triggerRateValidation.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Rate validation complete", {
        description: `Found ${alerts?.length || 0} sites with invalid rates`
      });
    },
  });

  if (!showAlerts) {
    return (
      <Button
        variant="outline"
        onClick={() => setShowAlerts(true)}
        className="w-full border-red-200 text-red-700 hover:bg-red-50"
      >
        <Bell className="h-4 w-4 mr-2" />
        Check Rate Validation Alerts
      </Button>
    );
  }
  
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-900">All rates are valid</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowAlerts(false)}>Hide</Button>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-red-900">Rate Validation Alerts ({alerts.length})</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => triggerValidation.mutate()}
                disabled={triggerValidation.isPending}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${triggerValidation.isPending ? 'animate-spin' : ''}`} />
                {triggerValidation.isPending ? 'Checking...' : 'Refresh'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAlerts(false)} className="h-7 text-xs">
                Hide
              </Button>
            </div>
          </div>
          <div className="text-sm text-red-800 space-y-1">
            {alerts.map((alert: any, index: number) => (
              <div key={index}>
                Check the rate in {alert.centreName} – Site {alert.siteNumber}, {cleanHtmlDescription(alert.siteName)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
