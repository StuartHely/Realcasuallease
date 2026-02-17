import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Building2, User } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OwnerLogoAllocation() {
  const { data: owners, isLoading, refetch } = trpc.systemConfig.getOwnersWithLogos.useQuery();
  const { data: allLogos } = trpc.systemConfig.getAllLogos.useQuery();
  const [savingOwnerId, setSavingOwnerId] = useState<number | null>(null);

  const allocateLogoMutation = trpc.systemConfig.allocateLogoToOwner.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Logo allocated successfully");
      refetch();
      setSavingOwnerId(null);
    },
    onError: (error) => {
      toast.error("Failed to allocate logo: " + error.message);
      setSavingOwnerId(null);
    },
  });

  const handleLogoChange = (ownerId: number, logoId: string | null) => {
    setSavingOwnerId(ownerId);
    allocateLogoMutation.mutate({
      ownerId,
      logoId: logoId as any,
    });
  };

  const getRoleBadgeColor = (role: string) => {
    if (role.includes("super")) return "bg-purple-100 text-purple-700 border-purple-200";
    if (role.includes("state")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (role.includes("regional")) return "bg-green-100 text-green-700 border-green-200";
    if (role.includes("marketing")) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const formatRole = (role: string) => {
    return role
      .replace("owner_", "")
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-gray-600">Loading owners...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Owner Logo Allocation</h1>
          <p className="text-muted-foreground mt-2">
            Assign specific logos to owners. Their allocated logo will appear on their dashboards,
            reports, invoices, and documents related to their properties.
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-blue-900">How Owner Logo Allocation Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Each owner can have their own logo from the 5 available options</li>
                  <li>• Owner's logo appears on invoices for their properties</li>
                  <li>• Reports for their centres use their logo</li>
                  <li>• If no logo assigned, the default platform logo is used</li>
                  <li>• Owners see their logo in their admin dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Owners List */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Owners ({owners?.length || 0})</h2>
          
          {!owners || owners.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No owners found in the system</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {owners.map((owner) => (
                <Card key={owner.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Owner Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">
                            {owner.name || owner.email}
                          </h3>
                          <Badge variant="outline" className={getRoleBadgeColor(owner.role)}>
                            {formatRole(owner.role)}
                          </Badge>
                          {owner.assignedState && (
                            <Badge variant="outline" className="bg-slate-100">
                              {owner.assignedState}
                            </Badge>
                          )}
                        </div>
                        {owner.name && (
                          <p className="text-sm text-gray-600">{owner.email}</p>
                        )}
                      </div>

                      {/* Current Logo Preview */}
                      <div className="flex items-center gap-3">
                        {owner.allocatedLogoId && allLogos ? (
                          <div className="text-center">
                            <img
                              src={allLogos[owner.allocatedLogoId as keyof typeof allLogos]}
                              alt="Owner's Logo"
                              className="h-12 max-w-[150px] object-contain mb-1"
                            />
                            <p className="text-xs text-gray-500">Current Logo</p>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">
                            <div className="h-12 w-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded mb-1">
                              <span className="text-xs">No logo</span>
                            </div>
                            <p className="text-xs text-gray-500">Using default</p>
                          </div>
                        )}

                        {/* Logo Selection */}
                        <div className="w-48">
                          <Select
                            value={owner.allocatedLogoId || "default"}
                            onValueChange={(value) =>
                              handleLogoChange(
                                owner.id,
                                value === "default" ? null : value
                              )
                            }
                            disabled={savingOwnerId === owner.id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select logo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">
                                Platform Default
                              </SelectItem>
                              <SelectItem value="logo_1">Logo 1</SelectItem>
                              <SelectItem value="logo_2">Logo 2</SelectItem>
                              <SelectItem value="logo_3">Logo 3</SelectItem>
                              <SelectItem value="logo_4">Logo 4</SelectItem>
                              <SelectItem value="logo_5">Logo 5</SelectItem>
                            </SelectContent>
                          </Select>
                          {savingOwnerId === owner.id && (
                            <p className="text-xs text-gray-500 mt-1">Saving...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Where Owner Logos Appear</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Owner Dashboards</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Admin dashboard sidebar</li>
                  <li>• Owner's centre management pages</li>
                  <li>• Booking approval pages</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Documents & Reports</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Invoices for their properties</li>
                  <li>• Weekly booking reports</li>
                  <li>• Financial reports</li>
                  <li>• Export documents</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
