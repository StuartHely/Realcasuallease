import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save } from "lucide-react";

export default function AdminSiteAssignment() {
  const [, setLocation] = useLocation();
  const [selectedCentreId, setSelectedCentreId] = useState<number>(0);
  const [assignments, setAssignments] = useState<Record<number, number | null>>({});

  // Fetch centres
  const { data: centres = [] } = trpc.centres.list.useQuery();

  // Fetch selected centre details
  const { data: centre } = trpc.centres.getById.useQuery(
    { id: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Fetch floor levels for selected centre
  const { data: floorLevels = [] } = trpc.admin.getFloorLevels.useQuery(
    { centreId: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Fetch all sites for selected centre
  const { data: sites = [], refetch: refetchSites } = trpc.centres.getSites.useQuery(
    { centreId: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Mutation for updating site floor assignments
  const updateAssignmentMutation = trpc.admin.updateSiteFloorAssignment.useMutation({
    onSuccess: () => {
      toast.success("Site floor assignments saved successfully");
      refetchSites();
      setAssignments({});
    },
    onError: (error) => {
      toast.error(`Failed to save assignments: ${error.message}`);
    },
  });

  const handleCentreChange = (value: string) => {
    const centreId = parseInt(value);
    setSelectedCentreId(centreId);
    setAssignments({});
  };

  const handleFloorAssignment = (siteId: number, floorLevelId: string) => {
    const floorId = floorLevelId === "unassigned" ? null : parseInt(floorLevelId);
    setAssignments(prev => ({
      ...prev,
      [siteId]: floorId
    }));
  };

  const handleSaveAssignments = () => {
    const updates = Object.entries(assignments).map(([siteId, floorLevelId]) => ({
      siteId: parseInt(siteId),
      floorLevelId
    }));

    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateAssignmentMutation.mutate({ assignments: updates });
  };

  const getCurrentFloorLevel = (siteId: number) => {
    if (assignments[siteId] !== undefined) {
      return assignments[siteId];
    }
    const site = sites.find(s => s.id === siteId);
    return site?.floorLevelId || null;
  };

  const hasChanges = Object.keys(assignments).length > 0;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site Floor Assignment</h1>
          <p className="text-muted-foreground mt-1">
            Assign sites to floor levels for multi-level shopping centres
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Shopping Centre</CardTitle>
          <CardDescription>
            Choose a shopping centre to assign its sites to floor levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCentreId.toString()} onValueChange={handleCentreChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a shopping centre..." />
            </SelectTrigger>
            <SelectContent>
              {centres.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCentreId > 0 && (
        <>
          {floorLevels.length === 0 ? (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  This shopping centre has no floor levels defined. Please create floor levels in the Maps tool first.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Site Assignments for {centre?.name}</CardTitle>
                    <CardDescription>
                      {sites.length} sites • {floorLevels.length} floor levels
                    </CardDescription>
                  </div>
                  {hasChanges && (
                    <Button onClick={handleSaveAssignments} disabled={updateAssignmentMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes ({Object.keys(assignments).length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-400px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Current Floor</TableHead>
                      <TableHead>Assign to Floor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.map((site) => {
                      const currentFloor = getCurrentFloorLevel(site.id);
                      const currentFloorName = currentFloor 
                        ? floorLevels.find(fl => fl.id === currentFloor)?.levelName 
                        : "Unassigned";
                      
                      return (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium">{site.siteNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{site.description || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {site.size || "—"}
                          </TableCell>
                          <TableCell>
                            <span className={currentFloor ? "text-foreground" : "text-muted-foreground"}>
                              {currentFloorName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={currentFloor?.toString() || "unassigned"}
                              onValueChange={(value) => handleFloorAssignment(site.id, value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {floorLevels.map((fl) => (
                                  <SelectItem key={fl.id} value={fl.id.toString()}>
                                    {fl.levelName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
