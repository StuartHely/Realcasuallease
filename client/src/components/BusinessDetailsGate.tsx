import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type BusinessDetailsGateProps = {
  open: boolean;
  onComplete: () => void;
  onCancel: () => void;
};

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const PRODUCT_CATEGORIES = [
  "Fashion",
  "Food & Beverage",
  "Health & Beauty",
  "Technology",
  "Services",
  "Charity/Non-Profit",
  "Other",
] as const;

export default function BusinessDetailsGate({
  open,
  onComplete,
  onCancel,
}: BusinessDetailsGateProps) {
  const [companyName, setCompanyName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [abn, setAbn] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDetails, setProductDetails] = useState("");

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Business details saved");
      onComplete();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save business details");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    if (!productCategory) {
      toast.error("Product/service category is required");
      return;
    }

    if (abn && !/^\d{11}$/.test(abn)) {
      toast.error("ABN must be exactly 11 digits");
      return;
    }

    updateProfile.mutate({
      companyName: companyName.trim(),
      tradingName: tradingName.trim() || undefined,
      abn: abn.trim() || undefined,
      streetAddress: streetAddress.trim() || undefined,
      city: city.trim() || undefined,
      state: state || undefined,
      postcode: postcode.trim() || undefined,
      productCategory,
      productDetails: productDetails.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Your Business Details</DialogTitle>
          <DialogDescription>
            Please provide your business details to proceed with your booking.
            These will be saved to your profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gate-companyName">Company Name *</Label>
            <Input
              id="gate-companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-tradingName">Trading Name</Label>
            <Input
              id="gate-tradingName"
              value={tradingName}
              onChange={(e) => setTradingName(e.target.value)}
              placeholder="Enter trading name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-abn">ABN</Label>
            <Input
              id="gate-abn"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="11 digit ABN"
              maxLength={11}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-streetAddress">Business Address</Label>
            <Input
              id="gate-streetAddress"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="Enter business address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gate-city">City</Label>
              <Input
                id="gate-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gate-state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="gate-state" className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-postcode">Postcode</Label>
            <Input
              id="gate-postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Postcode"
              maxLength={4}
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-productCategory">Product/Service Category *</Label>
            <Select value={productCategory} onValueChange={setProductCategory}>
              <SelectTrigger id="gate-productCategory" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-productDetails">Product Details</Label>
            <Textarea
              id="gate-productDetails"
              value={productDetails}
              onChange={(e) => setProductDetails(e.target.value)}
              placeholder="Describe your products or services"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:underline"
            >
              Cancel
            </button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Continue"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
