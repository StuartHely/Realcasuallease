import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface ManageSiteCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: number;
  siteNumber: string;
  centreName: string;
}

export function ManageSiteCategoriesDialog({
  open,
  onOpenChange,
  siteId,
  siteNumber,
  centreName,
}: ManageSiteCategoriesDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all available categories
  const { data: allCategories } = trpc.usageCategories.list.useQuery();

  // Fetch currently approved categories for this site
  const { data: approvedCategories, refetch: refetchApproved } = trpc.sites.getApprovedCategories.useQuery(
    { siteId },
    { enabled: open }
  );

  // Save categories mutation
  const saveCategoriesMutation = trpc.sites.setApprovedCategories.useMutation({
    onSuccess: () => {
      toast.success("Categories updated successfully");
      refetchApproved();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update categories: ${error.message}`);
    },
  });

  // Initialize selected categories when dialog opens or data loads
  useEffect(() => {
    if (approvedCategories) {
      setSelectedCategories(new Set(approvedCategories.map((c: any) => c.id)));
    }
  }, [approvedCategories]);

  const handleToggleCategory = (categoryId: number) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = () => {
    if (allCategories) {
      setSelectedCategories(new Set(allCategories.map(c => c.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedCategories(new Set());
  };

  const handleSave = () => {
    saveCategoriesMutation.mutate({
      siteId,
      categoryIds: Array.from(selectedCategories),
    });
  };

  // Filter categories based on search query
  const filteredCategories = allCategories?.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Approved Categories</DialogTitle>
          <DialogDescription>
            {centreName} - Site {siteNumber}
            <br />
            Select which business categories are permitted for this site.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search and bulk actions */}
          <div className="flex gap-2 items-center sticky top-0 bg-background pb-2 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
          </div>

          {/* Category checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            {filteredCategories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${category.id}`}
                  checked={selectedCategories.has(category.id)}
                  onCheckedChange={() => handleToggleCategory(category.id)}
                />
                <Label
                  htmlFor={`cat-${category.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No categories found matching "{searchQuery}"
            </p>
          )}

          {/* Summary */}
          <div className="text-sm text-muted-foreground pt-2 border-t">
            {selectedCategories.size} of {allCategories?.length || 0} categories selected
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveCategoriesMutation.isPending}
          >
            {saveCategoriesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
