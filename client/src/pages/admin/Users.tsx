import { useState, useEffect } from "react";
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
  const [editingFullUser, setEditingFullUser] = useState<any>(null);
  const [editTab, setEditTab] = useState<"basic" | "company" | "insurance">("basic");
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [skipScanning, setSkipScanning] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    name: "",
    password: "",
    role: "customer" as "customer" | "owner_centre_manager" | "owner_marketing_manager" | "owner_regional_admin" | "owner_state_admin" | "owner_super_admin" | "mega_state_admin" | "mega_admin",
    canPayByInvoice: false,
    // Company details
    companyName: "",
    companyWebsite: "",
    abn: "",
    address: "",
    city: "",
    state: "",
    postcode: "",
    productService: "",
    // Insurance details
    insuranceCompany: "",
    insurancePolicyNo: "",
    insuranceAmount: "",
    insuranceExpiryDate: "",
  });
  const [registrationTab, setRegistrationTab] = useState<"basic" | "company" | "insurance">("basic");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [editEmailError, setEditEmailError] = useState<string | null>(null);
  const [checkingEditEmail, setCheckingEditEmail] = useState(false);
  
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();
  
  // Email validation helper
  const validateEmail = (email: string): string | null => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Invalid email format";
    return null;
  };
  
  // Debounced email check for new user
  useEffect(() => {
    const formatError = validateEmail(newUserData.email);
    if (formatError) {
      setEmailError(formatError);
      return;
    }
    
    setCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const result = await utils.client.auth.checkEmailAvailable.query({ email: newUserData.email });
        if (!result.available) {
          setEmailError("Email already registered");
        } else {
          setEmailError(null);
        }
      } catch (error) {
        console.error('Email check failed:', error);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      setCheckingEmail(false);
    };
  }, [newUserData.email]);
  
  // Debounced email check for edit user
  useEffect(() => {
    if (!editingFullUser?.email) {
      setEditEmailError(null);
      return;
    }
    
    const formatError = validateEmail(editingFullUser.email);
    if (formatError) {
      setEditEmailError(formatError);
      return;
    }
    
    setCheckingEditEmail(true);
    const timer = setTimeout(async () => {
      try {
        const result = await utils.client.auth.checkEmailAvailable.query({ email: editingFullUser.email });
        // Allow if email is unchanged or available
        const originalUser = users?.find(u => u.id === editingFullUser.id);
        if (!result.available && originalUser?.email !== editingFullUser.email) {
          setEditEmailError("Email already registered");
        } else {
          setEditEmailError(null);
        }
      } catch (error) {
        console.error('Email check failed:', error);
      } finally {
        setCheckingEditEmail(false);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      setCheckingEditEmail(false);
    };
  }, [editingFullUser?.email, editingFullUser?.id, users]);
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
        companyName: "",
        companyWebsite: "",
        abn: "",
        address: "",
        city: "",
        state: "",
        postcode: "",
        productService: "",
        insuranceCompany: "",
        insurancePolicyNo: "",
        insuranceAmount: "",
        insuranceExpiryDate: "",
      });
      setRegistrationTab("basic");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to register user");
    },
  });

  const uploadInsuranceMutation = trpc.profile.uploadInsurance.useMutation();
  const scanInsuranceMutation = trpc.profile.scanInsurance.useMutation();

  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      refetch();
      setEditingFullUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const handleUpdateUser = () => {
    if (!editingFullUser) return;
    setScanError(null); // Clear error on save
    
    updateUserMutation.mutate({
      userId: editingFullUser.id,
      email: editingFullUser.email,
      name: editingFullUser.name,
      role: editingFullUser.role,
      assignedState: editingFullUser.assignedState,
      canPayByInvoice: editingFullUser.canPayByInvoice,
      companyName: editingFullUser.profile?.companyName,
      website: editingFullUser.profile?.website,
      abn: editingFullUser.profile?.abn,
      streetAddress: editingFullUser.profile?.streetAddress,
      city: editingFullUser.profile?.city,
      state: editingFullUser.profile?.state,
      postcode: editingFullUser.profile?.postcode,
      productCategory: editingFullUser.profile?.productCategory,
      productDetails: editingFullUser.profile?.productDetails,
      insuranceCompany: editingFullUser.profile?.insuranceCompany,
      insurancePolicyNo: editingFullUser.profile?.insurancePolicyNo,
      insuranceAmount: editingFullUser.profile?.insuranceAmount,
      insuranceExpiry: editingFullUser.profile?.insuranceExpiry,
      insuranceDocumentUrl: editingFullUser.profile?.insuranceDocumentUrl,
    });
  };

  const handleRegisterUser = () => {
    if (!newUserData.email || !newUserData.name || !newUserData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (emailError) {
      toast.error("Please fix email validation errors");
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
                          onClick={() => {
                            setEditingFullUser(user);
                            setEditTab("basic");
                          }}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
              <DialogDescription>
                Create a new user account. The user will be able to log in with the provided credentials.
              </DialogDescription>
            </DialogHeader>
            
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setRegistrationTab("basic")}
                className={`px-4 py-2 font-medium ${registrationTab === "basic" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setRegistrationTab("company")}
                className={`px-4 py-2 font-medium ${registrationTab === "company" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
              >
                Company Details
              </button>
              <button
                onClick={() => setRegistrationTab("insurance")}
                className={`px-4 py-2 font-medium ${registrationTab === "insurance" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
              >
                Insurance
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Basic Info Tab */}
              {registrationTab === "basic" && (
              <>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email *
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className={emailError ? "border-red-500" : ""}
                  />
                  {checkingEmail && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {emailError && (
                  <p className="text-sm text-red-500">{emailError}</p>
                )}
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
              </>
              )}

              {/* Company Details Tab */}
              {registrationTab === "company" && (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                  <Input id="companyName" value={newUserData.companyName} onChange={(e) => setNewUserData({ ...newUserData, companyName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="abn" className="text-sm font-medium">ABN</label>
                  <Input id="abn" value={newUserData.abn} onChange={(e) => setNewUserData({ ...newUserData, abn: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="companyWebsite" className="text-sm font-medium">Company Website</label>
                <Input id="companyWebsite" placeholder="https://" value={newUserData.companyWebsite} onChange={(e) => setNewUserData({ ...newUserData, companyWebsite: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label htmlFor="productService" className="text-sm font-medium">Product/Service</label>
                <Input id="productService" value={newUserData.productService} onChange={(e) => setNewUserData({ ...newUserData, productService: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium">Address</label>
                <Input id="address" value={newUserData.address} onChange={(e) => setNewUserData({ ...newUserData, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium">City</label>
                  <Input id="city" value={newUserData.city} onChange={(e) => setNewUserData({ ...newUserData, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="state" className="text-sm font-medium">State</label>
                  <Input id="state" value={newUserData.state} onChange={(e) => setNewUserData({ ...newUserData, state: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="postcode" className="text-sm font-medium">Postcode</label>
                  <Input id="postcode" value={newUserData.postcode} onChange={(e) => setNewUserData({ ...newUserData, postcode: e.target.value })} />
                </div>
              </div>
              </>
              )}

              {/* Insurance Tab */}
              {registrationTab === "insurance" && (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="insuranceCompany" className="text-sm font-medium">Insurance Company</label>
                  <Input id="insuranceCompany" value={newUserData.insuranceCompany} onChange={(e) => setNewUserData({ ...newUserData, insuranceCompany: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="insurancePolicyNo" className="text-sm font-medium">Policy Number</label>
                  <Input id="insurancePolicyNo" value={newUserData.insurancePolicyNo} onChange={(e) => setNewUserData({ ...newUserData, insurancePolicyNo: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="insuranceAmount" className="text-sm font-medium">Insured Amount ($M)</label>
                  <Input id="insuranceAmount" type="number" placeholder="20" value={newUserData.insuranceAmount} onChange={(e) => setNewUserData({ ...newUserData, insuranceAmount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="insuranceExpiryDate" className="text-sm font-medium">Expiry Date</label>
                  <Input id="insuranceExpiryDate" type="date" value={newUserData.insuranceExpiryDate} onChange={(e) => setNewUserData({ ...newUserData, insuranceExpiryDate: e.target.value })} />
                </div>
              </div>
              </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRegisterUser}
                disabled={registerUserMutation.isPending || !!emailError || checkingEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {registerUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingFullUser} onOpenChange={(open) => !open && setEditingFullUser(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information, company details, and insurance
              </DialogDescription>
            </DialogHeader>
            
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setEditTab("basic")}
                className={`px-4 py-2 font-medium ${editTab === "basic" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setEditTab("company")}
                className={`px-4 py-2 font-medium ${editTab === "company" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
              >
                Company Details
              </button>
              <button
                onClick={() => setEditTab("insurance")}
                className={`px-4 py-2 font-medium ${editTab === "insurance" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
              >
                Insurance
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Basic Info Tab */}
              {editTab === "basic" && editingFullUser && (
              <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Input 
                    value={editingFullUser.email || ""} 
                    onChange={(e) => setEditingFullUser({ ...editingFullUser, email: e.target.value })} 
                    className={editEmailError ? "border-red-500" : ""}
                  />
                  {checkingEditEmail && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {editEmailError && (
                  <p className="text-sm text-red-500">{editEmailError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input value={editingFullUser.name || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={editingFullUser.role}
                  onChange={(e) => setEditingFullUser({ ...editingFullUser, role: e.target.value })}
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
              {(editingFullUser.role === 'mega_state_admin' || editingFullUser.role === 'owner_state_admin') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assigned State</label>
                  <select
                    value={editingFullUser.assignedState || ""}
                    onChange={(e) => setEditingFullUser({ ...editingFullUser, assignedState: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select state...</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                  <p className="text-sm text-muted-foreground">State Admins can only access centres in their assigned state</p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={editingFullUser.canPayByInvoice}
                  onCheckedChange={(checked) => setEditingFullUser({ ...editingFullUser, canPayByInvoice: checked === true })}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium leading-none cursor-pointer">Allow payment by invoice</label>
                  <p className="text-sm text-muted-foreground">User can make bookings without immediate payment</p>
                </div>
              </div>
              </>
              )}

              {/* Company Details Tab */}
              {editTab === "company" && editingFullUser && (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input value={editingFullUser.profile?.companyName || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, companyName: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ABN</label>
                  <Input value={editingFullUser.profile?.abn || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, abn: e.target.value } })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Website</label>
                <Input placeholder="https://" value={editingFullUser.profile?.website || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, website: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product/Service Category</label>
                <select
                  value={editingFullUser.profile?.productCategory || ""}
                  onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, productCategory: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a category</option>
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Health & Beauty">Health & Beauty</option>
                  <option value="Electronics & Technology">Electronics & Technology</option>
                  <option value="Home & Living">Home & Living</option>
                  <option value="Sports & Fitness">Sports & Fitness</option>
                  <option value="Books & Stationery">Books & Stationery</option>
                  <option value="Toys & Games">Toys & Games</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Services">Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product/Service Details</label>
                <Input 
                  placeholder="e.g., Women's activewear, Organic coffee, Mobile phone accessories" 
                  value={editingFullUser.profile?.productDetails || ""} 
                  onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, productDetails: e.target.value } })} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input value={editingFullUser.profile?.streetAddress || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, streetAddress: e.target.value } })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input value={editingFullUser.profile?.city || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, city: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input value={editingFullUser.profile?.state || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, state: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Postcode</label>
                  <Input value={editingFullUser.profile?.postcode || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, postcode: e.target.value } })} />
                </div>
              </div>
              </>
              )}

              {/* Insurance Tab */}
              {editTab === "insurance" && editingFullUser && (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Insurance Company</label>
                  <Input value={editingFullUser.profile?.insuranceCompany || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, insuranceCompany: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Policy Number</label>
                  <Input value={editingFullUser.profile?.insurancePolicyNo || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, insurancePolicyNo: e.target.value } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Insured Amount ($M)</label>
                  <Input type="number" placeholder="20" value={editingFullUser.profile?.insuranceAmount || ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, insuranceAmount: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expiry Date</label>
                  <Input type="date" value={editingFullUser.profile?.insuranceExpiry ? new Date(editingFullUser.profile.insuranceExpiry).toISOString().split('T')[0] : ""} onChange={(e) => setEditingFullUser({ ...editingFullUser, profile: { ...editingFullUser.profile, insuranceExpiry: e.target.value } })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Insurance Document</label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {editingFullUser.profile?.insuranceDocumentUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        {editingFullUser.profile.insuranceDocumentUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                          <img 
                            src={editingFullUser.profile.insuranceDocumentUrl} 
                            alt="Insurance document preview"
                            className="w-32 h-32 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-gray-100 rounded border flex items-center justify-center">
                            <FileText className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">Document uploaded</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(editingFullUser.profile.insuranceDocumentUrl, '_blank')}
                            className="w-full"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Full Document
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No document uploaded</p>
                  )}
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <input
                      type="checkbox"
                      id="skipScanning"
                      checked={skipScanning}
                      onChange={(e) => setSkipScanning(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="skipScanning" className="text-sm text-muted-foreground cursor-pointer">
                      Skip automatic scanning (enter details manually)
                    </label>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploadingInsurance}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      setUploadingInsurance(true);
                      try {
                        // Convert file to base64
                        const reader = new FileReader();
                        const base64Promise = new Promise<string>((resolve, reject) => {
                          reader.onload = () => resolve(reader.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(file);
                        });
                        
                        const base64 = await base64Promise;
                        
                        // Upload via tRPC
                        const uploadResult = await uploadInsuranceMutation.mutateAsync({
                          fileData: base64,
                          fileName: file.name,
                          mimeType: file.type,
                        });
                        
                        // Save document URL first
                        setEditingFullUser({
                          ...editingFullUser,
                          profile: {
                            ...editingFullUser.profile,
                            insuranceDocumentUrl: uploadResult.url,
                          },
                        });
                        
                        // Try to scan document (unless skipped)
                        if (!skipScanning) {
                          try {
                            const scanRes = await scanInsuranceMutation.mutateAsync({ documentUrl: uploadResult.url });
                          
                          setEditingFullUser({
                            ...editingFullUser,
                            profile: {
                              ...editingFullUser.profile,
                              insuranceDocumentUrl: uploadResult.url,
                              insuranceCompany: scanRes.insuranceCompany || editingFullUser.profile?.insuranceCompany,
                              insurancePolicyNo: scanRes.policyNumber || editingFullUser.profile?.insurancePolicyNo,
                              insuranceAmount: scanRes.insuredAmount || editingFullUser.profile?.insuranceAmount,
                              insuranceExpiry: scanRes.expiryDate || editingFullUser.profile?.insuranceExpiry,
                            },
                          });
                          
                            // Show warnings if any (e.g., expired policy)
                            if (scanRes.warnings && scanRes.warnings.length > 0) {
                              setScanError(scanRes.warnings.join(', '));
                              toast.warning('Document scanned with warnings. Please review the details.');
                            } else {
                              setScanError(null);
                              toast.success('Insurance document uploaded and scanned successfully');
                            }
                          } catch (scanError: any) {
                            console.error('Scan error:', scanError);
                            setScanError(`Failed to scan document: ${scanError.message || 'Unknown error'}. Please enter insurance details manually.`);
                            toast.warning('Document uploaded but automatic scanning failed. Please enter details manually.');
                          }
                        } else {
                          setScanError(null);
                          toast.success('Insurance document uploaded. Please enter details manually.');
                        }
                      } catch (error: any) {
                        console.error('Upload error:', error);
                        toast.error(error.message || 'Failed to upload insurance document');
                        setScanError(null);
                      } finally {
                        setUploadingInsurance(false);
                      }
                    }}
                  />
                  {uploadingInsurance && (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Uploading and scanning...</span>
                    </div>
                  )}
                  {editingFullUser?.profile?.insuranceDocumentUrl && (
                    <div className="mt-2">
                      <a 
                        href={editingFullUser.profile.insuranceDocumentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        View Uploaded Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
              </>
              )}
            </div>
            {scanError && (
              <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-600">{scanError}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFullUser(null)}>Cancel</Button>
              <Button 
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending || !!editEmailError || checkingEditEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
