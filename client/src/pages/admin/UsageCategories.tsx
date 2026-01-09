import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UsageCategories() {
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [allTickedOverride, setAllTickedOverride] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIsFree, setNewCategoryIsFree] = useState(false);
  

  
  // Queries
  const { data: centres } = trpc.centres.list.useQuery();
  const { data: categories } = trpc.usageCategories.list.useQuery();
  const { data: sitesWithCategories, refetch: refetchSites } = trpc.usageCategories.getSitesWithCategories.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );
  
  // Mutations
  const setApprovedMutation = trpc.usageCategories.setApprovedCategories.useMutation({
    onSuccess: () => {
      toast.success("Approved categories updated successfully");
      refetchSites();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const applyToAllSitesMutation = trpc.usageCategories.applyToAllSites.useMutation({
    onSuccess: (data) => {
      toast.success(`Applied to ${data.sitesUpdated} sites in this centre`);
      refetchSites();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const createCategoryMutation = trpc.usageCategories.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      setShowAddDialog(false);
      setNewCategoryName("");
      setNewCategoryIsFree(false);
      // Refetch categories list
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Get sorted centres
  const sortedCentres = centres?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  
  // Check if all sites in the selected centre have identical category approvals
  const allSitesHaveSameApprovals = useMemo(() => {
    if (!sitesWithCategories || sitesWithCategories.length === 0) return false;
    
    const firstSiteCategories = sitesWithCategories[0].approvedCategoryIds.sort((a: number, b: number) => a - b);
    
    return sitesWithCategories.every(site => {
      const siteCategories = site.approvedCategoryIds.sort((a: number, b: number) => a - b);
      return JSON.stringify(siteCategories) === JSON.stringify(firstSiteCategories);
    });
  }, [sitesWithCategories]);
  
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
  
  // Handle apply to all sites
  const handleApplyToAll = () => {
    if (!selectedCentreId) {
      toast.error("Please select a centre");
      return;
    }
    
    applyToAllSitesMutation.mutate({
      centreId: selectedCentreId,
      categoryIds: selectedCategories,
    });
  };
  
  // Handle create category
  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    // Get next display order
    const maxOrder = categories ? Math.max(...categories.map(c => c.displayOrder)) : 0;
    
    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      isFree: newCategoryIsFree,
      displayOrder: maxOrder + 1,
    });
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usage Categories Management</CardTitle>
              <CardDescription>
                Manage which usage categories are approved for each site. All categories are ticked by default.
                Untick individual categories or use "Untick All" to deselect everything.
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Usage Category</DialogTitle>
                  <DialogDescription>
                    Create a new usage category that will be available across all sites.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Custom Category"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-free"
                      checked={newCategoryIsFree}
                      onCheckedChange={(checked) => setNewCategoryIsFree(checked as boolean)}
                    />
                    <Label htmlFor="is-free" className="cursor-pointer">
                      This is a free category (no charge)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={createCategoryMutation.isPending}
                  >
                    {createCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
              
              {/* Consistency Indicator */}
              {allSitesHaveSameApprovals && sitesWithCategories.length > 1 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    All sites in this centre have the same usage approvals
                  </p>
                </div>
              )}
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
                <div className="flex gap-2">
                  <Button 
                    onClick={handleApplyToAll}
                    disabled={applyToAllSitesMutation.isPending}
                    variant="outline"
                  >
                    {applyToAllSitesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Apply to All Sites in Centre
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={setApprovedMutation.isPending}
                  >
                    {setApprovedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save for This Site
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
