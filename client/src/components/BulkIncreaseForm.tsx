import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface BulkIncreaseFormProps {
  centres: Array<{ id: number; name: string; ownerId: number }>;
  onSuccess: () => void;
}

export function BulkIncreaseForm({ centres, onSuccess }: BulkIncreaseFormProps) {
  const [selectedCentres, setSelectedCentres] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [percentageIncrease, setPercentageIncrease] = useState("");

  const { data: owners } = trpc.admin.getOwners.useQuery();

  const bulkCreateMutation = trpc.admin.bulkCreateSeasonalRates.useMutation({
    onSuccess: (result: any) => {
      toast.success(`Successfully created ${result.created} seasonal rates`);
      // Reset form
      setSelectedCentres([]);
      setName("");
      setStartDate("");
      setEndDate("");
      setPercentageIncrease("");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error("Failed to create seasonal rates: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCentres.length === 0) {
      toast.error("Please select at least one centre");
      return;
    }

    if (!name || !startDate || !endDate || !percentageIncrease) {
      toast.error("Please fill in all fields");
      return;
    }

    const percentage = parseFloat(percentageIncrease);
    if (isNaN(percentage) || percentage <= 0) {
      toast.error("Please enter a valid percentage");
      return;
    }

    bulkCreateMutation.mutate({
      centreIds: selectedCentres,
      name,
      startDate,
      endDate,
      percentageIncrease: percentage,
    });
  };

  // Group centres by owner
  const centresByOwner = centres.reduce((acc, centre) => {
    const ownerId = centre.ownerId;
    if (!acc[ownerId]) {
      acc[ownerId] = [];
    }
    acc[ownerId].push(centre);
    return acc;
  }, {} as Record<number, typeof centres>);

  const toggleCentre = (centreId: number) => {
    setSelectedCentres(prev =>
      prev.includes(centreId)
        ? prev.filter(id => id !== centreId)
        : [...prev, centreId]
    );
  };

  const toggleAllCentresForOwner = (ownerId: number) => {
    const ownerCentres = centresByOwner[ownerId] || [];
    const ownerCentreIds = ownerCentres.map(c => c.id);
    const allSelected = ownerCentreIds.every(id => selectedCentres.includes(id));

    if (allSelected) {
      // Deselect all centres for this owner
      setSelectedCentres(prev => prev.filter(id => !ownerCentreIds.includes(id)));
    } else {
      // Select all centres for this owner
      setSelectedCentres(prev => {
        const combined = [...prev, ...ownerCentreIds];
        return Array.from(new Set(combined));
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bulk-name">Rate Name</Label>
          <Input
            id="bulk-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Christmas 2024"
            required
          />
        </div>
        <div>
          <Label htmlFor="bulk-percentage">Percentage Increase (%)</Label>
          <Input
            id="bulk-percentage"
            type="number"
            step="0.1"
            value={percentageIncrease}
            onChange={(e) => setPercentageIncrease(e.target.value)}
            placeholder="e.g., 30"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bulk-start">Start Date</Label>
          <Input
            id="bulk-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="bulk-end">End Date</Label>
          <Input
            id="bulk-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Select Centres (grouped by owner)</Label>
        <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-4">
          {Object.entries(centresByOwner).map(([ownerId, ownerCentres]) => {
            const owner = owners?.find((o: any) => o.id === parseInt(ownerId));
            const ownerCentreIds = ownerCentres.map(c => c.id);
            const allSelected = ownerCentreIds.every(id => selectedCentres.includes(id));
            const someSelected = ownerCentreIds.some(id => selectedCentres.includes(id));

            return (
              <div key={ownerId} className="space-y-2">
                <div className="flex items-center space-x-2 font-semibold">
                  <Checkbox
                    id={`owner-${ownerId}`}
                    checked={allSelected}
                    onCheckedChange={() => toggleAllCentresForOwner(parseInt(ownerId))}
                    className={someSelected && !allSelected ? "opacity-50" : ""}
                  />
                  <label
                    htmlFor={`owner-${ownerId}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {owner?.name || `Owner ${ownerId}`} ({ownerCentres.length} centres)
                  </label>
                </div>
                <div className="ml-6 space-y-2">
                  {ownerCentres.map(centre => (
                    <div key={centre.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`centre-${centre.id}`}
                        checked={selectedCentres.includes(centre.id)}
                        onCheckedChange={() => toggleCentre(centre.id)}
                      />
                      <label
                        htmlFor={`centre-${centre.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {centre.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {selectedCentres.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {selectedCentres.length} centre(s) selected
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={bulkCreateMutation.isPending || selectedCentres.length === 0}
        className="w-full"
      >
        {bulkCreateMutation.isPending ? "Creating..." : "Apply Bulk Increase"}
      </Button>
    </form>
  );
}
