import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const passwordSchema = z.string().min(8, { message: "Password must be at least 8 characters" }).max(100);
const emailSchema = z.string().trim().email({ message: "Invalid email address" }).max(255);

function parseRecoveryParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    accessToken: hashParams.get("access_token") ?? searchParams.get("access_token"),
    type: hashParams.get("type") ?? searchParams.get("type"),
    error: hashParams.get("error") ?? searchParams.get("error"),
    errorDescription:
      hashParams.get("error_description") ?? searchParams.get("error_description"),
  };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);

  const recoveryParams = useMemo(() => parseRecoveryParams(), []);

  useEffect(() => {
    const { accessToken, type, error: linkError, errorDescription } = recoveryParams;
    const invalidReason =
      linkError ||
      errorDescription ||
      (type !== "recovery" && !accessToken)
        ? "This password reset link is invalid or has expired."
        : null;

    if (invalidReason) {
      setQueryError(invalidReason);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    if (accessToken || type === "recovery") {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    }

    const maybeGetSessionFromUrl = (supabase.auth as any).getSessionFromUrl;
    if (typeof maybeGetSessionFromUrl === "function") {
      void maybeGetSessionFromUrl({ storeSession: true }).catch(() => {
        // Silent fallback; user can still attempt to reset password if recovery session is present.
      });
    }
  }, [recoveryParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      setError(passwordValidation.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          updateError.message.includes("session")
            ? "Your reset link has expired or is invalid. Request a new password recovery email."
            : "Unable to reset your password right now. Please try again later."
        );
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError(null);
    setError(null);

    const validation = emailSchema.safeParse(resendEmail);
    if (!validation.success) {
      setResendError(validation.error.errors[0].message);
      return;
    }

    setIsResending(true);
    try {
      const { error: resendErr } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resendErr && !/user not found|no user/.test(resendErr.message.toLowerCase())) {
        setResendError("Unable to send recovery instructions right now. Please try again later.");
        return;
      }

      setResendSent(true);
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoaderPlaceholder />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="p-4 flex items-center gap-3">
          <Link to="/auth/sign-in" className="flex items-center gap-2">
            <BrandMark />
            <span className="font-display text-xl font-bold">Neo Synapse</span>
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Password Reset Complete</h1>
            <p className="text-muted-foreground">
              Your password has been updated successfully. You can now sign in with your new password.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth/sign-in">Go to Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center gap-3">
        <Link to="/auth/sign-in" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-xl font-bold">Neo Synapse</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Reset Your Password</h1>
            <p className="text-muted-foreground mt-1">
              Enter a new password to complete your secure account recovery.
            </p>
          </div>

          {queryError ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {queryError}
              </div>
              {resendSent ? (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
                  If an account exists for that email, recovery instructions have been sent. Check your inbox and spam folder.
                </div>
              ) : (
                <form onSubmit={handleResendSubmit} className="space-y-4">
                  {resendError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {resendError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="resendEmail">Email</Label>
                    <Input
                      id="resendEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    disabled={isResending}
                  >
                    {isResending ? <LoaderPlaceholder /> : "Send new reset link"}
                  </Button>
                </form>
              )}
              <Button className="w-full" variant="outline" onClick={() => navigate("/auth/forgot-password")}>Use Forgot Password page</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
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
                  <p className="text-xs text-muted-foreground">
                    Your password should be at least 8 characters long.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoaderPlaceholder /> : "Reset Password"}
              </Button>

              <p className="text-sm text-muted-foreground">
                If your reset link has expired, request a new link from the Forgot Password page.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function LoaderPlaceholder() {
  return <div className="w-5 h-5 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}
