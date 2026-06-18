import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Loader2, Mail, ShieldCheck, XCircle } from "lucide-react";
import type { Invitation } from "@/shared/types/healthcare";
import { BrandMark } from "@/components/BrandMark";

const acceptSchema = z.object({
  password: z.string().min(1, "Enter the password for the invited account"),
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyInvitation() {
      if (!token) {
        setError("Invalid invitation link. No token was provided.");
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .in("status", ["pending", "sent"])
        .maybeSingle();

      if (fetchErr || !data) {
        setError("Invitation not found, already used, or has been revoked.");
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invitation) return;

    setError(null);
    const validation = acceptSchema.safeParse({ password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const invitedEmail = normalizeEmail(invitation.email);
      const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: invitedEmail,
        password,
      });

      if (signInErr || !authData.session?.access_token || !authData.user?.email) {
        setError("Sign in failed. Use the existing account credentials for the invited email.");
        return;
      }

      if (normalizeEmail(authData.user.email) !== invitedEmail) {
        await supabase.auth.signOut();
        setError(`This invitation is for ${invitation.email}. Please sign in with that exact account.`);
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke("accept-invitation", {
        body: { token: invitation.token },
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
      });

      if (fnErr) {
        setError("Invitation could not be accepted. Please try again.");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-profile", authData.user.id] }),
        queryClient.invalidateQueries({ queryKey: ["user-roles", authData.user.id] }),
        queryClient.invalidateQueries({ queryKey: ["profile", authData.user.id] }),
      ]);

      setSuccess(true);
      const target = data?.role === "admin" ? "/admin/dashboard" : "/professional/dashboard";
      setTimeout(() => navigate(target, { replace: true }), 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Invitation accepted</h1>
          <p className="text-muted-foreground">Your access has been updated. Redirecting to your workspace...</p>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
            <XCircle className="h-10 w-10 text-destructive" />
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 p-4">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-xl font-bold">Neo Synapse</span>
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Accept Invitation</h1>
            <p className="mt-1 text-muted-foreground">
              Sign in as the invited account to join as a{" "}
              <span className="font-medium capitalize text-primary">{invitation?.role}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                This link only grants access after the invited email signs in. If someone else opens the link, the server will reject the invitation.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Invited email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={invitation?.email || ""}
                  className="h-12 rounded-xl bg-muted/60 pl-10"
                  readOnly
                  aria-readonly
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Existing account password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-xl pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in & Accept Invitation"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Do not have access to this email account? Ask an administrator to issue a new invitation.
          </p>
        </div>
      </div>
    </div>
  );
}
