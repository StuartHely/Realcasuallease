import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/_core/hooks/useAuth";

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
  const tenant = useTenant();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await refresh();
      const returnUrl = sessionStorage.getItem("returnUrl");
      if (returnUrl) {
        sessionStorage.removeItem("returnUrl");
        setLocation(returnUrl);
      } else {
        setLocation("/");
      }
    },
    onError: () => {
      setLocation("/login");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully!");
      loginMutation.mutate({ username: email, password });
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
      phone: phone || undefined,
    });
  }, [registerMutation, email, name, password, confirmPassword, phone]);

  const canSubmit =
    email.length > 0 &&
    name.length > 0 &&
    phone.length > 0 &&
    password.length >= 8 &&
    password === confirmPassword &&
    emailCheck.data?.available !== false;

  const passwordStrength = getPasswordStrength(password);
  const isPending = registerMutation.isPending || loginMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo height={60} width={180} />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription className="text-base">
            Create your account to get started.
            <span className="block text-sm text-muted-foreground mt-1">
              Business details will be required before your first booking.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
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
              <Label htmlFor="phone">Mobile</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Your mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>
          </div>

          <Button
            type="button"
            className="w-full h-12 text-lg"
            size="lg"
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

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
