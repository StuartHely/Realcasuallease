import { useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface BulkImageImportVSProps {
  centreId: number;
  onComplete: () => void;
}

interface ImportResult {
  shopNumber: string;
  slot: number;
  success: boolean;
  error?: string;
}

export default function BulkImageImportVS({ centreId, onComplete }: BulkImageImportVSProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  
  const { data: shops } = trpc.vacantShops.getByCentre.useQuery({ centreId });
  const uploadImageMutation = trpc.vacantShops.uploadImage.useMutation();

  const processZipFile = async (file: File) => {
    setIsProcessing(true);
    setResults([]);
    
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(file);
      const importResults: ImportResult[] = [];
      
      const filenamePattern = /(?:shop[-_])?(\d+)(?:[-_](?:image[-_])?(\d+))?/i;
      
      for (const [filename, zipEntry] of Object.entries(zipData.files)) {
        if (zipEntry.dir) continue;
        
        const ext = filename.split('.').pop()?.toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) continue;
        
        const match = filename.match(filenamePattern);
        if (!match) {
          importResults.push({
            shopNumber: filename,
            slot: 0,
            success: false,
            error: "Filename doesn't match pattern (e.g., shop-1-1.jpg)",
          });
          continue;
        }
        
        const shopNumber = match[1];
        const slot = parseInt(match[2] || '1');
        
        if (slot < 1 || slot > 2) {
          importResults.push({
            shopNumber,
            slot,
            success: false,
            error: "Slot must be between 1 and 2",
          });
          continue;
        }
        
        const shop = shops?.find(s => s.shopNumber === shopNumber || s.shopNumber.includes(shopNumber));
        if (!shop) {
          importResults.push({
            shopNumber,
            slot,
            success: false,
            error: `Shop ${shopNumber} not found`,
          });
          continue;
        }
        
        try {
          const imageData = await zipEntry.async('base64');
          const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
          const base64Image = `data:${mimeType};base64,${imageData}`;
          
          await uploadImageMutation.mutateAsync({
            shopId: shop.id,
            imageSlot: slot,
            base64Image,
          });
          
          importResults.push({
            shopNumber: shop.shopNumber,
            slot,
            success: true,
          });
        } catch (error: any) {
          importResults.push({
            shopNumber: shop.shopNumber,
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
    
    if (file.size > 50 * 1024 * 1024) {
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
              Upload a ZIP file containing shop images. Files should be named using patterns like:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>shop-1-1.jpg</code> (Shop 1, Image slot 1)</li>
                <li><code>shop-1-image-2.jpg</code> (Shop 1, Image slot 2)</li>
                <li><code>1-2.jpg</code> (Shop 1, Image slot 2)</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!isProcessing && results.length === 0 && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  id="vs-zip-upload"
                  onChange={handleFileSelect}
                />
                <label htmlFor="vs-zip-upload" className="cursor-pointer">
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
                      <span className="font-medium">{result.shopNumber}</span> - Image {result.slot}
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
