import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export default function AuthGuard({ children }: AuthGuardProps) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const isPublicPath = PUBLIC_PATHS.some(p => location === p || location.startsWith(p + "?"));

  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicPath) {
      sessionStorage.setItem("returnUrl", location);
      setLocation("/login");
    }
  }, [isAuthenticated, loading, location, isPublicPath, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
