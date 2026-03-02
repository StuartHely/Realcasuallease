import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const PRODUCT_CATEGORIES = [
  "Fashion",
  "Food & Beverage",
  "Health & Beauty",
  "Technology",
  "Services",
  "Charity/Non-Profit",
  "Other",
] as const;

const TOTAL_STEPS = 3;

function getPasswordStrength(password: string): { label: string; color: string } {
  if (password.length === 0) return { label: "", color: "" };
  if (password.length < 8) return { label: "Too short", color: "text-red-500" };
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score <= 1) return { label: "Weak", color: "text-red-500" };
  if (score === 2) return { label: "Fair", color: "text-yellow-500" };
  if (score === 3) return { label: "Good", color: "text-blue-500" };
  return { label: "Strong", color: "text-green-500" };
}

export default function Register() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [abn, setAbn] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");

  const [productService, setProductService] = useState("");
  const [productDetails, setProductDetails] = useState("");

  const [debouncedEmail, setDebouncedEmail] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setDebouncedEmail(email);
      } else {
        setDebouncedEmail("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const emailCheck = trpc.auth.checkEmailAvailable.useQuery(
    { email: debouncedEmail },
    { enabled: debouncedEmail.length > 0 }
  );

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully! Please sign in.");
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const handleSubmit = useCallback(() => {
    registerMutation.mutate({
      email,
      name,
      password,
      confirmPassword,
      companyName: companyName || undefined,
      tradingName: tradingName || undefined,
      companyWebsite: companyWebsite || undefined,
      abn: abn || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      postcode: postcode || undefined,
      productService: productService || undefined,
      productDetails: productDetails || undefined,
    });
  }, [registerMutation, email, name, password, confirmPassword, companyName, tradingName, companyWebsite, abn, address, city, state, postcode, productService, productDetails]);

  const canProceedStep1 =
    email.length > 0 &&
    name.length > 0 &&
    password.length >= 8 &&
    password === confirmPassword &&
    (emailCheck.data?.available !== false);

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-blue-700">
              <MapPin className="h-8 w-8" />
              <span className="text-2xl font-bold">Real Casual Leasing</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription className="text-base">
            Register for the AI-Driven Short-Term Retail Leasing Platform
          </CardDescription>
          <div className="flex items-center justify-center gap-2 pt-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isComplete = stepNum < step;
              return (
                <div key={stepNum} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className={`h-0.5 w-8 ${isComplete || isActive ? "bg-blue-600" : "bg-gray-300"}`} />
                  )}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      isComplete
                        ? "bg-blue-600 text-white"
                        : isActive
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : stepNum}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-sm text-muted-foreground">
            Step {step}: {step === 1 ? "Account" : step === 2 ? "Company Details (Optional)" : "Product/Service (Optional)"}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={registerMutation.isPending}
                  />
                  {debouncedEmail && emailCheck.data && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {emailCheck.data.available ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {debouncedEmail && emailCheck.data && !emailCheck.data.available && (
                  <p className="text-sm text-red-500">This email is already registered</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={registerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={registerMutation.isPending}
                />
                {passwordStrength.label && (
                  <p className={`text-sm ${passwordStrength.color}`}>
                    Password strength: {passwordStrength.label}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={registerMutation.isPending}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={registerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradingName">Trading Name</Label>
                <Input
                  id="tradingName"
                  placeholder="Trading as..."
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  disabled={registerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  placeholder="11-digit ABN"
                  value={abn}
                  onChange={(e) => setAbn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  disabled={registerMutation.isPending}
                />
                {abn && abn.length !== 11 && (
                  <p className="text-sm text-yellow-600">ABN must be 11 digits</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  placeholder="https://..."
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  disabled={registerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={registerMutation.isPending}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={registerMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={state} onValueChange={setState} disabled={registerMutation.isPending}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    placeholder="0000"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    disabled={registerMutation.isPending}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productService">Product/Service Category</Label>
                <Select value={productService} onValueChange={setProductService} disabled={registerMutation.isPending}>
                  <SelectTrigger id="productService">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productDetails">Details</Label>
                <Textarea
                  id="productDetails"
                  placeholder="Tell us more about your product or service..."
                  value={productDetails}
                  onChange={(e) => setProductDetails(e.target.value)}
                  disabled={registerMutation.isPending}
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(step - 1)}
                disabled={registerMutation.isPending}
              >
                Back
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                className="flex-1"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !canProceedStep1}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1 h-12 text-lg"
                size="lg"
                onClick={handleSubmit}
                disabled={registerMutation.isPending || !canProceedStep1}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            )}
          </div>

          <div className="text-center">
            <span className="text-sm text-muted-foreground">Already have an account? </span>
            <Link href="/login">
              <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                Sign in
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
