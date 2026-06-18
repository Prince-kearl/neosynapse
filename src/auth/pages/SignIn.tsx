import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { getDefaultRouteForRole, isRouteAllowedForPrimaryRole } from "@/auth/roleRouting";
import { Loader2, Mail, Lock, Eye, EyeOff, Download } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { legacyPasswordSchema, normalizeEmail, signInEmailSchema } from "@/shared/lib/inputValidation";

const signInSchema = z.object({
  email: signInEmailSchema,
  password: legacyPasswordSchema,
});

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn, user, isLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  useEffect(() => {
    if (user && !isLoading && !roleLoading && role) {
      if (isRouteAllowedForPrimaryRole(role, from)) {
        navigate(from, { replace: true });
      } else {
        navigate(getDefaultRouteForRole(role), { replace: true });
      }
    }
  }, [user, isLoading, roleLoading, role, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signIn(normalizeEmail(email), password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password");
        } else {
          setError(error.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 p-4">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-xl font-bold">Neo Synapse</span>
        </Link>
        <Button variant="outline" size="sm" asChild>
          <Link to="/downloads">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download app</span>
            <span className="sm:hidden">App</span>
          </Link>
        </Button>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground mt-1">
              Sign in to access your healthcare dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              New patient?{" "}
              <Link to="/auth/patient-sign-up" className="text-primary font-medium hover:underline">
                Create an account
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              Review how health data is handled in our{" "}
              <Link to="/privacy" className="text-primary font-medium hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              Healthcare professionals and administrators are invite-only
            </p>
            <Button variant="secondary" className="h-11 w-full rounded-xl font-semibold" asChild>
              <Link to="/downloads">
                <Download className="h-4 w-4" />
                Download mobile app
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
