import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface UpdateInsuranceDialogProps {
  bookingId: number;
  bookingNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UpdateInsuranceDialog({
  bookingId,
  bookingNumber,
  open,
  onOpenChange,
  onSuccess,
}: UpdateInsuranceDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const updateInsuranceMutation = trpc.bookings.updateBookingInsurance.useMutation({
    onSuccess: (data) => {
      if (data.insuranceValid) {
        toast.success(data.message || "Insurance uploaded successfully!");
      } else {
        toast.warning("Insurance uploaded but has issues. Please correct and re-upload.");
      }
      setSelectedFile(null);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to upload insurance: " + error.message);
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PDF, JPEG, or PNG file");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        updateInsuranceMutation.mutate({
          bookingId,
          base64Document: base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast.error("Error uploading file");
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Insurance Certificate</DialogTitle>
          <DialogDescription>
            Upload a new insurance certificate for booking {bookingNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Your insurance certificate must show:</strong>
              <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
                <li>Expiry date (valid for at least 6 months)</li>
                <li>Coverage amount ($20 million minimum)</li>
                <li>Policy number</li>
                <li>Insurance company name</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Tips for a good upload:</strong>
              <ul className="mt-1 ml-4 space-y-1 text-sm list-disc">
                <li>Use a scanner if possible (better than phone camera)</li>
                <li>Ensure image is clear, well-lit, and in focus</li>
                <li>Make sure entire document is visible</li>
                <li>Save as PDF or high-quality JPEG</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="insurance-file">Select Insurance Document</Label>
            <Input
              id="insurance-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {selectedFile && (
              <p className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {updateInsuranceMutation.data && !updateInsuranceMutation.data.insuranceValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Issues found:</strong>
                <ul className="mt-1 ml-4 space-y-1 text-sm list-disc">
                  {updateInsuranceMutation.data.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Insurance
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
