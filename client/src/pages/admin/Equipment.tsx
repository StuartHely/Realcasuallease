import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Package, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function Equipment() {
  const [editingCentreId, setEditingCentreId] = useState<number | null>(null);
  const [tables, setTables] = useState<string>("");
  const [chairs, setChairs] = useState<string>("");

  const { data: centres, isLoading, refetch } = trpc.admin.getAllCentres.useQuery();
  const updateEquipment = trpc.admin.updateCentreEquipment.useMutation({
    onSuccess: () => {
      toast.success("Equipment updated successfully");
      setEditingCentreId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update equipment");
    },
  });

  const handleEdit = (centreId: number, currentTables: number | null, currentChairs: number | null) => {
    setEditingCentreId(centreId);
    setTables(currentTables?.toString() || "0");
    setChairs(currentChairs?.toString() || "0");
  };

  const handleSave = (centreId: number) => {
    updateEquipment.mutate({
      centreId,
      totalTablesAvailable: parseInt(tables) || 0,
      totalChairsAvailable: parseInt(chairs) || 0,
    });
  };

  const handleCancel = () => {
    setEditingCentreId(null);
    setTables("");
    setChairs("");
  };

  // Calculate max tables needed for a centre (sum of all sites' maxTables)
  const calculateMaxTablesNeeded = (centreId: number) => {
    if (!centres) return 0;
    const centre = centres.find(c => c.id === centreId);
    if (!centre) return 0;
    return centre.sites.reduce((sum, site) => sum + (site.maxTables || 0), 0);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="w-8 h-8" />
            Equipment Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage tables and chairs inventory for each shopping centre
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Centre Equipment Inventory</CardTitle>
            <CardDescription>
              Track available equipment and identify shortfalls when all sites are occupied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Centre Name</TableHead>
                    <TableHead className="text-right">Total Tables Available</TableHead>
                    <TableHead className="text-right">Max Tables Needed</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead className="text-right">Total Chairs Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centres && centres.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No shopping centres found
                      </TableCell>
                    </TableRow>
                  )}
                  {centres?.map((centre) => {
                    const isEditing = editingCentreId === centre.id;
                    const maxNeeded = calculateMaxTablesNeeded(centre.id);
                    const available = centre.totalTablesAvailable || 0;
                    const shortfall = Math.max(0, maxNeeded - available);
                    const hasShortfall = shortfall > 0;
                    const noEquipment = available === 0 && (centre.totalChairsAvailable || 0) === 0;

                    return (
                      <TableRow key={centre.id}>
                        <TableCell className="font-medium">
                          {centre.name}
                          {noEquipment && (
                            <div className="text-sm text-muted-foreground mt-1">
                              No equipment provided by the centre
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              value={tables}
                              onChange={(e) => setTables(e.target.value)}
                              className="w-24 ml-auto"
                            />
                          ) : (
                            <span>{available}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{maxNeeded}</TableCell>
                        <TableCell className="text-right">
                          {hasShortfall ? (
                            <span className="flex items-center justify-end gap-1 text-amber-600">
                              <AlertTriangle className="w-4 h-4" />
                              {shortfall}
                            </span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              value={chairs}
                              onChange={(e) => setChairs(e.target.value)}
                              className="w-24 ml-auto"
                            />
                          ) : (
                            <span>{centre.totalChairsAvailable || 0}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleSave(centre.id)}
                                disabled={updateEquipment.isPending}
                              >
                                {updateEquipment.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={updateEquipment.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(centre.id, centre.totalTablesAvailable, centre.totalChairsAvailable)}
                            >
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">About Equipment Management</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Total Tables Available:</strong> Total number of tables the centre can provide to all sites</li>
                <li>• <strong>Max Tables Needed:</strong> Sum of maximum table capacity across all sites (based on site dimensions)</li>
                <li>• <strong>Shortfall:</strong> Additional tables needed if all sites are fully occupied simultaneously</li>
                <li>• <strong>Chairs:</strong> Not site-size dependent; tracked separately per centre</li>
                <li>• Customers can request equipment during booking; system will track availability per date</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
