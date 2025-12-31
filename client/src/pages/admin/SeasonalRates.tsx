import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function SeasonalRates() {
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);

  const { data: centres } = trpc.centres.list.useQuery();
  const { data: sites } = trpc.sites.getByCentreId.useQuery(
    { centreId: parseInt(selectedCentreId) },
    { enabled: !!selectedCentreId }
  );
  const { data: seasonalRates, refetch } = trpc.admin.getSeasonalRatesBySite.useQuery(
    { siteId: parseInt(selectedSiteId) },
    { enabled: !!selectedSiteId }
  );

  const createMutation = trpc.admin.createSeasonalRate.useMutation({
    onSuccess: () => {
      toast.success("Seasonal rate created successfully");
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to create seasonal rate: " + error.message);
    },
  });

  const updateMutation = trpc.admin.updateSeasonalRate.useMutation({
    onSuccess: () => {
      toast.success("Seasonal rate updated successfully");
      setEditingRate(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to update seasonal rate: " + error.message);
    },
  });

  const deleteMutation = trpc.admin.deleteSeasonalRate.useMutation({
    onSuccess: () => {
      toast.success("Seasonal rate deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete seasonal rate: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      siteId: parseInt(selectedSiteId),
      name: formData.get("name") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      weekdayRate: formData.get("weekdayRate") ? parseFloat(formData.get("weekdayRate") as string) : undefined,
      weekendRate: formData.get("weekendRate") ? parseFloat(formData.get("weekendRate") as string) : undefined,
    };

    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Seasonal Pricing Management
          </CardTitle>
          <CardDescription>
            Set special rates for holidays, events, and peak seasons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Centre and Site Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shopping Centre</Label>
              <Select value={selectedCentreId} onValueChange={(value) => {
                setSelectedCentreId(value);
                setSelectedSiteId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a centre" />
                </SelectTrigger>
                <SelectContent>
                  {centres?.map((centre) => (
                    <SelectItem key={centre.id} value={centre.id.toString()}>
                      {centre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={!selectedCentreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.siteNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedSiteId && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Seasonal Rates</h3>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Seasonal Rate
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Weekday Rate</TableHead>
                    <TableHead>Weekend Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasonalRates?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No seasonal rates configured
                      </TableCell>
                    </TableRow>
                  )}
                  {seasonalRates?.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.name}</TableCell>
                      <TableCell>{rate.startDate}</TableCell>
                      <TableCell>{rate.endDate}</TableCell>
                      <TableCell>${rate.weekdayRate || "-"}</TableCell>
                      <TableCell>${rate.weekendRate || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingRate(rate)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("Delete this seasonal rate?")) {
                                deleteMutation.mutate({ id: rate.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingRate} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingRate(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit" : "Add"} Seasonal Rate</DialogTitle>
            <DialogDescription>
              Set special pricing for specific date ranges
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Christmas 2024, Summer Sale"
                  defaultValue={editingRate?.name}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={editingRate?.startDate}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={editingRate?.endDate}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weekdayRate">Weekday Rate ($)</Label>
                  <Input
                    id="weekdayRate"
                    name="weekdayRate"
                    type="number"
                    step="0.01"
                    placeholder="Leave empty to use default"
                    defaultValue={editingRate?.weekdayRate}
                  />
                </div>
                <div>
                  <Label htmlFor="weekendRate">Weekend Rate ($)</Label>
                  <Input
                    id="weekendRate"
                    name="weekendRate"
                    type="number"
                    step="0.01"
                    placeholder="Leave empty to use default"
                    defaultValue={editingRate?.weekendRate}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateOpen(false);
                setEditingRate(null);
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRate ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
