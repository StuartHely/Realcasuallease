import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  const { data: profile, isLoading } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  // Fetch usage categories for the dropdown
  const { data: usageCategories } = trpc.usageCategories.list.useQuery();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    website: "",
    abn: "",
    streetAddress: "",
    city: "",
    state: "",
    postcode: "",
    productCategory: "",
    insuranceCompany: "",
    insurancePolicyNo: "",
    insuranceAmount: "",
    insuranceExpiry: "",
    insuranceDocumentUrl: "",
  });

  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const [scanningInsurance, setScanningInsurance] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        companyName: profile.companyName || "",
        website: profile.website || "",
        abn: profile.abn || "",
        streetAddress: profile.streetAddress || "",
        city: profile.city || "",
        state: profile.state || "",
        postcode: profile.postcode || "",
        productCategory: profile.productCategory || "",
        insuranceCompany: profile.insuranceCompany || "",
        insurancePolicyNo: profile.insurancePolicyNo || "",
        insuranceAmount: profile.insuranceAmount || "",
        insuranceExpiry: profile.insuranceExpiry
          ? new Date(profile.insuranceExpiry).toISOString().split("T")[0]
          : "",
        insuranceDocumentUrl: profile.insuranceDocumentUrl || "",
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      ...formData,
      insuranceExpiry: formData.insuranceExpiry ? new Date(formData.insuranceExpiry) : undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Please log in to view your profile</p>
            <Button onClick={() => (window.location.href = getLoginUrl())} className="bg-blue-600 hover:bg-blue-700">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation("/")}
            >
              <img src="/logo.png" alt="Real Casual Leasing" className="h-12" />
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")}>Home</Button>
            <Button variant="ghost" onClick={() => setLocation("/my-bookings")}>My Bookings</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-blue-900 mb-2">My Profile</h2>
          <p className="text-gray-600">Manage your contact and business information</p>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        )}

        {!isLoading && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Insurance Details - Upload First */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-blue-900">Step 1: Upload Insurance Certificate</CardTitle>
                  <CardDescription className="text-blue-700">
                    Start by uploading your Public Liability Insurance certificate (minimum $20M coverage required). 
                    We'll automatically scan and fill in your insurance details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="insuranceDocument" className="text-base font-semibold">Insurance Document *</Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Upload your certificate as PDF, JPG, or PNG
                    </p>
                    <Input
                      id="insuranceDocument"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setInsuranceFile(file);
                        setUploadingInsurance(true);
                        
                        try {
                          // Convert file to base64
                          const reader = new FileReader();
                          const fileData = await new Promise<string>((resolve) => {
                            reader.onload = () => {
                              const base64 = reader.result as string;
                              resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
                            };
                            reader.readAsDataURL(file);
                          });
                          
                          // Upload to S3
                          const uploadMutation = trpc.profile.uploadInsurance.useMutation();
                          const { url } = await uploadMutation.mutateAsync({
                            fileData,
                            fileName: file.name,
                            mimeType: file.type,
                          });
                          
                          // Scan document
                          setScanningInsurance(true);
                          const scanMutation = trpc.profile.scanInsurance.useMutation();
                          const scanData = await scanMutation.mutateAsync({ documentUrl: url });
                          
                          // Auto-fill fields
                          setFormData(prev => ({
                            ...prev,
                            insuranceDocumentUrl: url,
                            insuranceCompany: scanData.insuranceCompany || prev.insuranceCompany,
                            insurancePolicyNo: scanData.policyNumber || prev.insurancePolicyNo,
                            insuranceAmount: scanData.insuredAmount ? String(scanData.insuredAmount) : prev.insuranceAmount,
                            insuranceExpiry: scanData.expiryDate || prev.insuranceExpiry,
                          }));
                          
                          // Show warnings if any (e.g., expired policy)
                          if (scanData.warnings && scanData.warnings.length > 0) {
                            toast.warning(`Document scanned with warnings: ${scanData.warnings.join(', ')}`);
                          } else {
                            toast.success('Insurance document scanned successfully! Fields have been auto-filled.');
                          }
                        } catch (error) {
                          toast.error('Failed to process insurance document. Please enter details manually.');
                          console.error(error);
                        } finally {
                          setUploadingInsurance(false);
                          setScanningInsurance(false);
                        }
                      }}
                      disabled={uploadingInsurance || scanningInsurance}
                    />
                    {(uploadingInsurance || scanningInsurance) && (
                      <p className="text-sm text-blue-600 mt-2 font-medium">
                        {uploadingInsurance ? '⏳ Uploading...' : '🔍 Scanning document and extracting details...'}
                      </p>
                    )}
                    {formData.insuranceDocumentUrl && (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        ✓ Document uploaded and scanned successfully
                      </p>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="insuranceCompany">Insurance Company</Label>
                      <Input
                        id="insuranceCompany"
                        name="insuranceCompany"
                        value={formData.insuranceCompany}
                        onChange={handleChange}
                        placeholder="Auto-filled from document"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurancePolicyNo">Policy No</Label>
                      <Input
                        id="insurancePolicyNo"
                        name="insurancePolicyNo"
                        value={formData.insurancePolicyNo}
                        onChange={handleChange}
                        placeholder="Auto-filled from document"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insuranceAmount">Coverage Amount (in millions)</Label>
                      <Input
                        id="insuranceAmount"
                        name="insuranceAmount"
                        value={formData.insuranceAmount}
                        onChange={handleChange}
                        placeholder="e.g., 20 for $20M"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insuranceExpiry">Expiry Date</Label>
                      <Input
                        id="insuranceExpiry"
                        name="insuranceExpiry"
                        type="date"
                        value={formData.insuranceExpiry}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                  <CardDescription>Your personal contact information</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} disabled />
                  </div>
                </CardContent>
              </Card>

              {/* Company Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                  <CardDescription>Your business information</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      name="abn"
                      value={formData.abn}
                      onChange={handleChange}
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <Label htmlFor="productCategory">Product Category/Service</Label>
                    <Select
                      value={formData.productCategory}
                      onValueChange={(value) => setFormData({ ...formData, productCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {usageCategories?.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      name="streetAddress"
                      value={formData.streetAddress}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                    />
                  </div>
                </CardContent>
              </Card>


              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
