import { useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface BulkImageImportTLIProps {
  centreId: number;
  onComplete: () => void;
}

interface ImportResult {
  assetNumber: string;
  slot: number;
  success: boolean;
  error?: string;
}

export default function BulkImageImportTLI({ centreId, onComplete }: BulkImageImportTLIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  
  const { data: assets } = trpc.thirdLineIncome.getByCentre.useQuery({ centreId });
  const uploadImageMutation = trpc.thirdLineIncome.uploadImage.useMutation();

  const processZipFile = async (file: File) => {
    setIsProcessing(true);
    setResults([]);
    
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(file);
      const importResults: ImportResult[] = [];
      
      // Pattern matching for filenames:
      // - asset-1-1.jpg, asset-1-2.jpg (asset number - slot number)
      // - asset-1-image-1.jpg (asset number - image - slot number)
      // - 1-1.jpg, 1-2.jpg (asset number - slot number)
      const filenamePattern = /(?:asset[-_])?(\d+)(?:[-_](?:image[-_])?(\d+))?/i;
      
      for (const [filename, zipEntry] of Object.entries(zipData.files)) {
        if (zipEntry.dir) continue;
        
        // Check if it's an image file
        const ext = filename.split('.').pop()?.toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) continue;
        
        // Extract asset number and slot from filename
        const match = filename.match(filenamePattern);
        if (!match) {
          importResults.push({
            assetNumber: filename,
            slot: 0,
            success: false,
            error: "Filename doesn't match pattern (e.g., asset-1-1.jpg)",
          });
          continue;
        }
        
        const assetNumber = match[1];
        const slot = parseInt(match[2] || '1'); // Default to slot 1 if not specified
        
        if (slot < 1 || slot > 2) {
          importResults.push({
            assetNumber,
            slot,
            success: false,
            error: "Slot must be between 1 and 2",
          });
          continue;
        }
        
        // Find the asset
        const asset = assets?.find(a => a.assetNumber === assetNumber || a.assetNumber.includes(assetNumber));
        if (!asset) {
          importResults.push({
            assetNumber,
            slot,
            success: false,
            error: `Asset ${assetNumber} not found`,
          });
          continue;
        }
        
        try {
          // Read image as base64
          const imageData = await zipEntry.async('base64');
          const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
          const base64Image = `data:${mimeType};base64,${imageData}`;
          
          // Upload image
          await uploadImageMutation.mutateAsync({
            assetId: asset.id,
            imageSlot: slot,
            base64Image,
          });
          
          importResults.push({
            assetNumber: asset.assetNumber,
            slot,
            success: true,
          });
        } catch (error: any) {
          importResults.push({
            assetNumber: asset.assetNumber,
            slot,
            success: false,
            error: error.message || "Upload failed",
          });
        }
      }
      
      setResults(importResults);
      
      const successCount = importResults.filter(r => r.success).length;
      const failCount = importResults.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} image(s)`);
        onComplete();
      }
      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} image(s)`);
      }
    } catch (error: any) {
      toast.error("Failed to process ZIP file: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.zip')) {
      toast.error("Please select a ZIP file");
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error("ZIP file must be less than 50MB");
      return;
    }
    
    processZipFile(file);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <FileArchive className="h-4 w-4" />
        Bulk Import Images
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Image Import</DialogTitle>
            <DialogDescription>
              Upload a ZIP file containing asset images. Files should be named using patterns like:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>asset-1-1.jpg</code> (Asset 1, Image slot 1)</li>
                <li><code>asset-1-image-2.jpg</code> (Asset 1, Image slot 2)</li>
                <li><code>1-1.jpg</code> (Asset 1, Image slot 1)</li>
              </ul>
              <p className="mt-2 text-xs">Note: Assets have 2 image slots.</p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!isProcessing && results.length === 0 && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  id="tli-zip-upload"
                  onChange={handleFileSelect}
                />
                <label htmlFor="tli-zip-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="text-lg font-medium mb-2">Select ZIP File</div>
                  <div className="text-sm text-gray-500">Max 50MB</div>
                </label>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                <span className="text-lg">Processing images...</span>
              </div>
            )}
            
            {results.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                <div className="font-medium mb-2">Import Results:</div>
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded ${
                      result.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{result.assetNumber}</span> - Image {result.slot}
                      {result.error && <span className="text-red-600 ml-2">({result.error})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setResults([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
