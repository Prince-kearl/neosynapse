import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTouchedFields } from "@/shared/hooks/useTouchedFields";
import {
  Loader2, Mail, Lock, Eye, EyeOff, Activity, User,
  CheckCircle, XCircle, Stethoscope, Award, FileText,
} from "lucide-react";
import type { Invitation } from "@/shared/types/healthcare";

const acceptSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function InviteAccept() {
  type RequiredField = "fullName" | "password" | "confirmPassword";

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);

  // Required fields
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Optional professional fields
  const [professionType, setProfessionType] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const touched = useTouchedFields<RequiredField>();

  const fullNameError = fullName.trim().length < 2 ? "Name must be at least 2 characters" : undefined;
  const passwordError = password.length < 6 ? "Password must be at least 6 characters" : undefined;
  const confirmPasswordError = confirmPassword !== password ? "Passwords do not match" : undefined;

  const showFullNameError = touched.isTouched("fullName") && !!fullNameError;
  const showPasswordError = touched.isTouched("password") && !!passwordError;
  const showConfirmPasswordError = touched.isTouched("confirmPassword") && !!confirmPasswordError;

  useEffect(() => {
    async function verifyInvitation() {
      if (!token) {
        setError("Invalid invitation link — no token provided");
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .maybeSingle();

      if (fetchErr || !data) {
        setError("Invitation not found, already used, or has been revoked");
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired. Please ask your administrator to send a new one.");
        setLoading(false);
        return;
      }

      setInvitation(data as Invitation);
      setLoading(false);
    }

    verifyInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setError(null);
    setConfigWarning(null);

    const validation = acceptSchema.safeParse({ fullName, password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      // Call the secure edge function to handle everything server-side
      const { data, error: fnErr } = await supabase.functions.invoke("accept-invitation", {
        body: {
          token: invitation.token,
          fullName,
          password,
          professionType: professionType || undefined,
          specialty: specialty || undefined,
          licenseNumber: licenseNumber || undefined,
        },
      });

      if (fnErr) {
        setError("Failed to create account. Please try again.");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      // Account created and auto-confirmed — sign in immediately
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (signInErr) {
        const isEmailConfirmationEnabled = signInErr.message.includes("Email not confirmed");

        if (isEmailConfirmationEnabled) {
          setConfigWarning(
            "Admin/Dev warning: Supabase email confirmation is enabled. New users must verify email before first login."
          );
          setError("Account created. Please verify your email, then sign in.");
        } else {
          setError("Account created, but automatic sign-in failed. Please sign in manually.");
        }
        return;
      }

      // Signed in successfully — redirect based on role
      setSuccess(true);
      const target = invitation.role === "admin" ? "/admin/dashboard" : "/professional/dashboard";
      setTimeout(() => navigate(target, { replace: true }), 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Success state ─────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Welcome aboard!</h1>
          <p className="text-muted-foreground">
            Your account has been created. Redirecting to your workspace…
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Error state (no valid invitation) ─────────────────────────
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold">Invalid Invitation</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => navigate("/auth/sign-in")}>
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // ─── Accept form ───────────────────────────────────────────────
  const isProfessional = invitation?.role === "professional";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow-green">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Neo Synapse</span>
        </Link>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Accept Invitation</h1>
            <p className="text-muted-foreground mt-1">
              You've been invited to join as a{" "}
              <span className="text-primary font-medium capitalize">{invitation?.role}</span>
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{invitation?.email}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {configWarning && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                {configWarning}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    touched.touch("fullName");
                  }}
                  onBlur={() => touched.touch("fullName")}
                  aria-invalid={showFullNameError}
                  className="pl-10 h-12 rounded-xl"
                  required
                />
              </div>
              {showFullNameError && <p className="text-xs text-destructive">{fullNameError}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    touched.touch("password");
                  }}
                  onBlur={() => touched.touch("password")}
                  aria-invalid={showPasswordError}
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
              {showPasswordError ? (
                <p className="text-xs text-destructive">{passwordError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    touched.touch("confirmPassword");
                  }}
                  onBlur={() => touched.touch("confirmPassword")}
                  aria-invalid={showConfirmPasswordError}
                  className="pl-10 h-12 rounded-xl"
                  required
                />
              </div>
              {showConfirmPasswordError && <p className="text-xs text-destructive">{confirmPasswordError}</p>}
            </div>

            {/* Optional professional fields */}
            {isProfessional && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Stethoscope className="w-4 h-4" />
                  <span>Professional Details (optional — can be completed later)</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="professionType">Profession Type</Label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="professionType"
                      type="text"
                      placeholder="e.g. Physician, Nurse, Pharmacist"
                      value={professionType}
                      onChange={(e) => setProfessionType(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="specialty"
                      type="text"
                      placeholder="e.g. Cardiology, Pediatrics"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="licenseNumber"
                      type="text"
                      placeholder="e.g. MC-123456"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accept & Create Account"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth/sign-in" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
