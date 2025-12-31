import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SystemConfig() {
  const { data: config, refetch } = trpc.admin.getSystemConfig.useQuery();
  const updateMutation = trpc.admin.updateSystemConfig.useMutation();

  const [imageQuality, setImageQuality] = useState(85);
  const [imageMaxWidth, setImageMaxWidth] = useState(1200);
  const [imageMaxHeight, setImageMaxHeight] = useState(800);

  useEffect(() => {
    if (config) {
      setImageQuality(config.imageQuality || 85);
      setImageMaxWidth(config.imageMaxWidth || 1200);
      setImageMaxHeight(config.imageMaxHeight || 800);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        imageQuality,
        imageMaxWidth,
        imageMaxHeight,
      });
      toast.success("Settings saved successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Configuration</h1>
            <p className="text-muted-foreground">
              Manage global system settings
            </p>
          </div>
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Image Compression Settings</CardTitle>
            <CardDescription>
              Configure image quality and size limits for site images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Image Quality: {imageQuality}%</Label>
                <Slider
                  value={[imageQuality]}
                  onValueChange={([value]) => setImageQuality(value)}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Higher quality = larger file sizes. Recommended: 80-90%
                </p>
              </div>

              <div className="space-y-2">
                <Label>Maximum Width: {imageMaxWidth}px</Label>
                <Slider
                  value={[imageMaxWidth]}
                  onValueChange={([value]) => setImageMaxWidth(value)}
                  min={800}
                  max={2400}
                  step={100}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Images will be resized to fit within this width
                </p>
              </div>

              <div className="space-y-2">
                <Label>Maximum Height: {imageMaxHeight}px</Label>
                <Slider
                  value={[imageMaxHeight]}
                  onValueChange={([value]) => setImageMaxHeight(value)}
                  min={600}
                  max={1600}
                  step={100}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Images will be resized to fit within this height
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
