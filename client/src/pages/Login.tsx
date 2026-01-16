import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if there's a return URL stored
      const returnUrl = sessionStorage.getItem("returnUrl");
      if (returnUrl) {
        sessionStorage.removeItem("returnUrl");
        setLocation(returnUrl);
      } else {
        setLocation("/");
      }
    }
  }, [isAuthenticated, loading, setLocation]);

  const handleLogin = () => {
    // Store current intended destination for post-login redirect
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== "/login") {
      sessionStorage.setItem("returnUrl", currentPath);
    }
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-blue-700">
              <MapPin className="h-8 w-8" />
              <span className="text-2xl font-bold">Real Casual Leasing</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription className="text-base">
            Sign in to access the AI-Driven Short-Term Retail Leasing Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Book short-term retail spaces in Australian shopping centres.</p>
            <p className="mt-2">Search, compare, and book pop-up spaces instantly.</p>
          </div>
          <Button 
            onClick={handleLogin} 
            className="w-full h-12 text-lg"
            size="lg"
          >
            Sign In with Manus
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
