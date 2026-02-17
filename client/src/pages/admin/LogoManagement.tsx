import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function LogoManagement() {
  const { data: currentLogo, refetch: refetchCurrent } = trpc.systemConfig.getCurrentLogo.useQuery();
  const { data: allLogos, refetch: refetchAll } = trpc.systemConfig.getAllLogos.useQuery();
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const setLogoMutation = trpc.systemConfig.setLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo updated successfully");
      refetchCurrent();
    },
    onError: (error) => {
      toast.error("Failed to update logo: " + error.message);
    },
  });

  const uploadLogoMutation = trpc.systemConfig.uploadLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo uploaded successfully");
      refetchAll();
      setUploadingSlot(null);
    },
    onError: (error) => {
      toast.error("Failed to upload logo: " + error.message);
      setUploadingSlot(null);
    },
  });

  const handleLogoSelect = (logoId: string) => {
    setLogoMutation.mutate({ logoId: logoId as any });
  };

  const handleFileUpload = async (logoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploadingSlot(logoId);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      uploadLogoMutation.mutate({
        logoId: logoId as any,
        base64Image: base64,
        fileName: file.name,
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploadingSlot(null);
    };
    reader.readAsDataURL(file);
  };

  const selectedLogo = currentLogo?.selectedLogo || "logo_1";

  const logos = [
    { id: "logo_1", name: "Logo Option 1" },
    { id: "logo_2", name: "Logo Option 2" },
    { id: "logo_3", name: "Logo Option 3" },
    { id: "logo_4", name: "Logo Option 4" },
    { id: "logo_5", name: "Logo Option 5" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logo Management</h1>
          <p className="text-muted-foreground mt-2">
            Select which logo to display across the platform (MegaAdmin only)
          </p>
        </div>

        {/* Current Logo Preview */}
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle>Current Logo</CardTitle>
            <CardDescription>
              This logo is currently displayed on all pages, reports, and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
              {allLogos && (
                <img
                  src={allLogos[selectedLogo as keyof typeof allLogos]}
                  alt="Current Logo"
                  className="max-w-md max-h-32"
                  style={{ objectFit: 'contain' }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logo Selection Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Select Logo</h2>
          <p className="text-sm text-gray-600 mb-6">
            Click on a logo to make it active across the entire platform. You can also upload your own logos to replace any of the 5 slots.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {logos.map((logo) => {
              const isSelected = selectedLogo === logo.id;
              const logoUrl = allLogos?.[logo.id as keyof typeof allLogos];
              const isUploading = uploadingSlot === logo.id;

              return (
                <Card
                  key={logo.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? "border-blue-500 border-2 bg-blue-50" : ""
                  }`}
                  onClick={() => !isUploading && handleLogoSelect(logo.id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{logo.name}</CardTitle>
                      {isSelected && (
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Logo Preview */}
                    <div className="mb-4 h-32 flex items-center justify-center bg-gray-50 rounded-lg p-4">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={logo.name}
                          className="max-w-full max-h-full"
                          style={{ objectFit: 'contain' }}
                        />
                      ) : (
                        <ImageIcon className="h-16 w-16 text-gray-300" />
                      )}
                    </div>

                    {/* Upload Button */}
                    <div className="space-y-2">
                      <Label htmlFor={`upload-${logo.id}`} className="text-xs text-gray-600">
                        Upload new image for this slot
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`upload-${logo.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(logo.id, e)}
                          disabled={isUploading}
                          className="text-xs"
                        />
                        {isUploading && (
                          <Button size="sm" disabled>
                            Uploading...
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Recommended: PNG or SVG, max 2MB
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Usage Information */}
        <Card>
          <CardHeader>
            <CardTitle>Where This Logo Appears</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Website</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Homepage header</li>
                  <li>• All public pages</li>
                  <li>• Customer dashboard</li>
                  <li>• Booking pages</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Admin & Documents</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Admin dashboard</li>
                  <li>• All admin pages</li>
                  <li>• Invoice PDFs</li>
                  <li>• Reports and exports</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              Logo Design Tips
            </h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Use a transparent background (PNG) for best results</li>
              <li>• Recommended dimensions: 400-600px wide, 100-200px tall</li>
              <li>• Ensure logo is readable at small sizes</li>
              <li>• Use high contrast colors for visibility</li>
              <li>• SVG format is ideal for crisp display at any size</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
