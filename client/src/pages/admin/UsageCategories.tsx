import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function UsageCategories() {
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [allTickedOverride, setAllTickedOverride] = useState(false);
  

  
  // Queries
  const { data: centres } = trpc.centres.list.useQuery();
  const { data: categories } = trpc.usageCategories.list.useQuery();
  const { data: sitesWithCategories, refetch: refetchSites } = trpc.usageCategories.getSitesWithCategories.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );
  
  // Mutation
  const setApprovedMutation = trpc.usageCategories.setApprovedCategories.useMutation({
    onSuccess: () => {
      toast.success("Approved categories updated successfully");
      refetchSites();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Get sorted centres
  const sortedCentres = centres?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  
  // Handle centre selection
  const handleCentreChange = (centreId: string) => {
    setSelectedCentreId(parseInt(centreId));
    setSelectedSiteId(null);
    setSelectedCategories([]);
    setAllTickedOverride(false);
  };
  
  // Handle site selection
  const handleSiteChange = (siteId: string) => {
    const id = parseInt(siteId);
    setSelectedSiteId(id);
    
    // Load existing approved categories for this site
    const site = sitesWithCategories?.find(s => s.id === id);
    if (site && categories) {
      // If no approvals exist yet (empty array), default to all approved
      if (site.approvedCategoryIds.length === 0) {
        setSelectedCategories(categories.map(c => c.id));
        setAllTickedOverride(false);
      } else {
        setSelectedCategories(site.approvedCategoryIds);
        // Check if all categories are selected
        setAllTickedOverride(site.approvedCategoryIds.length === categories.length);
      }
    }
  };
  
  // Handle "untick all" checkbox
  const handleUntickAll = (checked: boolean) => {
    setAllTickedOverride(!checked);
    if (checked) {
      // Untick all
      setSelectedCategories([]);
    } else {
      // Tick all
      setSelectedCategories(categories?.map(c => c.id) || []);
    }
  };
  
  // Handle individual category toggle
  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId]);
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    }
    
    // Update "all ticked" state
    const newCount = checked 
      ? selectedCategories.length + 1 
      : selectedCategories.length - 1;
    setAllTickedOverride(newCount === categories?.length);
  };
  
  // Handle save
  const handleSave = () => {
    if (!selectedSiteId) {
      toast.error("Please select a site");
      return;
    }
    
    setApprovedMutation.mutate({
      siteId: selectedSiteId,
      categoryIds: selectedCategories,
    });
  };
  
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Usage Categories Management</CardTitle>
          <CardDescription>
            Manage which usage categories are approved for each site. All categories are ticked by default.
            Untick individual categories or use "Untick All" to deselect everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Centre Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Shopping Centre</label>
            <Select value={selectedCentreId?.toString() || ""} onValueChange={handleCentreChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a shopping centre" />
              </SelectTrigger>
              <SelectContent>
                {sortedCentres.map((centre) => (
                  <SelectItem key={centre.id} value={centre.id.toString()}>
                    {centre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Site Selection */}
          {selectedCentreId && sitesWithCategories && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Site</label>
              <Select value={selectedSiteId?.toString() || ""} onValueChange={handleSiteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sitesWithCategories.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.siteNumber} - {site.description || "No description"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Categories Checkboxes */}
          {selectedSiteId && categories && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Approved Categories</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="untick-all"
                    checked={selectedCategories.length === 0}
                    onCheckedChange={handleUntickAll}
                  />
                  <label htmlFor="untick-all" className="text-sm cursor-pointer">
                    Untick All
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg max-h-96 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => handleCategoryToggle(category.id, checked as boolean)}
                    />
                    <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer">
                      {category.name}
                      {category.isFree && <span className="ml-1 text-green-600 font-semibold">(FREE)</span>}
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <p className="text-sm text-muted-foreground">
                  {selectedCategories.length} of {categories.length} categories selected
                </p>
                <Button 
                  onClick={handleSave}
                  disabled={setApprovedMutation.isPending}
                >
                  {setApprovedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Approved Categories
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
