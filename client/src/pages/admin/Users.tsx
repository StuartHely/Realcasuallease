import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Users as UsersIcon, Search, Edit, Loader2, FileText, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<{ id: number; name: string | null; canPayByInvoice: boolean } | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    name: "",
    password: "",
    role: "customer" as "customer" | "owner_centre_manager" | "owner_marketing_manager" | "owner_regional_admin" | "owner_state_admin" | "owner_super_admin" | "mega_state_admin" | "mega_admin",
    canPayByInvoice: false,
  });
  
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const updateInvoiceFlagMutation = trpc.users.updateInvoiceFlag.useMutation({
    onSuccess: () => {
      toast.success("Invoice payment setting updated successfully");
      refetch();
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update setting");
    },
  });

  const registerUserMutation = trpc.admin.registerUser.useMutation({
    onSuccess: () => {
      toast.success("User registered successfully");
      refetch();
      setRegisterDialogOpen(false);
      setNewUserData({
        email: "",
        name: "",
        password: "",
        role: "customer",
        canPayByInvoice: false,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to register user");
    },
  });

  const handleRegisterUser = () => {
    if (!newUserData.email || !newUserData.name || !newUserData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    registerUserMutation.mutate(newUserData);
  };

  const filteredUsers = users?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handleSaveInvoiceFlag = () => {
    if (!editingUser) return;
    
    updateInvoiceFlagMutation.mutate({
      userId: editingUser.id,
      canPayByInvoice: editingUser.canPayByInvoice,
    });
  };

  const getRoleBadgeColor = (role: string) => {
    if (role.includes("admin")) return "bg-purple-100 text-purple-800";
    if (role.includes("manager")) return "bg-blue-100 text-blue-800";
    if (role.includes("owner")) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, roles, and payment settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>
                  View and manage all registered users. SuperAdmin can enable invoice payment for approved clients.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setRegisterDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register New User
                </Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredUsers || filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Pay by Invoice</TableHead>
                    <TableHead>Last Signed In</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "—"}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)} variant="secondary">
                          {user.role.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.canPayByInvoice ? (
                          <Badge className="bg-green-100 text-green-800">
                            <FileText className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser({ id: user.id, name: user.name, canPayByInvoice: user.canPayByInvoice })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Invoice Payment Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invoice Payment Settings</DialogTitle>
              <DialogDescription>
                Configure invoice payment option for {editingUser?.name || "this user"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="canPayByInvoice"
                  checked={editingUser?.canPayByInvoice || false}
                  onCheckedChange={(checked) => {
                    if (editingUser) {
                      setEditingUser({ ...editingUser, canPayByInvoice: checked as boolean });
                    }
                  }}
                />
                <div className="space-y-1">
                  <label
                    htmlFor="canPayByInvoice"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Allow payment by invoice
                  </label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, this user can make bookings without immediate payment. 
                    An invoice will be generated and payment must be recorded manually by SuperAdmin.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveInvoiceFlag}
                disabled={updateInvoiceFlagMutation.isPending}
              >
                {updateInvoiceFlagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Register New User Dialog */}
        <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
              <DialogDescription>
                Create a new user account. The user will be able to log in with the provided credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name *
                </label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password *
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">
                  Role
                </label>
                <select
                  id="role"
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="customer">Customer</option>
                  <option value="owner_centre_manager">Owner - Centre Manager</option>
                  <option value="owner_marketing_manager">Owner - Marketing Manager</option>
                  <option value="owner_regional_admin">Owner - Regional Admin</option>
                  <option value="owner_state_admin">Owner - State Admin</option>
                  <option value="owner_super_admin">Owner - Super Admin</option>
                  <option value="mega_state_admin">Mega - State Admin</option>
                  <option value="mega_admin">Mega - Admin</option>
                </select>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="canPayByInvoice-new"
                  checked={newUserData.canPayByInvoice}
                  onCheckedChange={(checked) => {
                    setNewUserData({ ...newUserData, canPayByInvoice: checked === true });
                  }}
                />
                <div className="space-y-1">
                  <label
                    htmlFor="canPayByInvoice-new"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Allow payment by invoice
                  </label>
                  <p className="text-sm text-muted-foreground">
                    User can make bookings without immediate payment
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRegisterUser}
                disabled={registerUserMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {registerUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
