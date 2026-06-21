import { Mail, Plus, Send, XCircle, Loader2, AlertTriangle, CheckCircle2, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useTouchedFields } from "@/shared/hooks/useTouchedFields";
import { buildInvitationLink, buildInvitationMailtoUrl, buildWhatsAppShareUrl } from "@/shared/lib/invitations";
import { getEmailValidationError, normalizeEmail } from "@/shared/lib/inputValidation";
import { PUBLIC_APP_URL } from "@/shared/lib/appUrl";

type InvitationRow = {
  id: string;
  email: string;
  role: "professional" | "admin";
  facility_id: string | null;
  token: string;
  status: string;
  expires_at: string;
};

type FacilityOption = {
  id: string;
  name: string;
};

type EmailDraft = {
  recipient: string;
  url: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to create invitation right now.";

const openMailtoLink = (url: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_self";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const statusStyles: Record<string, string> = {
  pending: "border-yellow-500/50 text-yellow-500",
  sent: "border-blue-500/50 text-blue-500",
  accepted: "border-emerald-500/50 text-emerald-500",
  revoked: "border-destructive/50 text-destructive",
  expired: "border-muted-foreground/50 text-muted-foreground",
};

const invitationActionButtonClass =
  "h-10 justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-medium hover:bg-muted/70 sm:h-9 sm:w-auto sm:border-transparent sm:bg-transparent";

export default function AdminInvitations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("professional");
  const [facilityId, setFacilityId] = useState<string>("");
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const pendingComposerWindow = useRef<Window | null>(null);
  const touched = useTouchedFields<"email">();

  const emailValue = normalizeEmail(email);
  const emailError = getEmailValidationError(emailValue);
  const showEmailError = touched.isTouched("email") && !!emailError;
  const isInviteFormValid = !emailError;

  const resetForm = () => {
    setEmail("");
    setFacilityId("");
    setRole("professional");
    touched.reset();
  };

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as InvitationRow[];
    },
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["admin-facilities-list"],
    queryFn: async () => {
      const { data } = await supabase.from("facilities").select("id, name").order("name");
      return (data || []) as FacilityOption[];
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const normalizedRole = role as InvitationRow["role"];
      const { data: existing, error: existingError } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", emailValue)
        .eq("role", normalizedRole)
        .in("status", ["pending", "sent"])
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) return { invitation: existing as InvitationRow, reused: true };

      const { data, error } = await supabase
        .from("invitations")
        .insert({
          email: emailValue,
          role: normalizedRole,
          invited_by: user!.id,
          facility_id: facilityId || null,
          status: "pending",
        })
        .select("*")
        .single();

      if (error) throw error;
      return { invitation: data as InvitationRow, reused: false };
    },
    onSuccess: ({ invitation, reused }) => {
      const link = buildInvitationLink(PUBLIC_APP_URL, invitation.token);
      const mailtoUrl = buildInvitationMailtoUrl(invitation.email, link, invitation.role);
      const composerWindow = pendingComposerWindow.current;

      setEmailDraft({ recipient: invitation.email, url: mailtoUrl });
      if (composerWindow && !composerWindow.closed) {
        composerWindow.location.href = mailtoUrl;
      } else {
        openMailtoLink(mailtoUrl);
      }
      pendingComposerWindow.current = null;
      toast({
        title: reused ? "Existing invitation opened" : "Invitation created",
        description: `If your mail app did not open, use the Open Email App button.`,
      });
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
    onError: (error: unknown) => {
      pendingComposerWindow.current?.close();
      pendingComposerWindow.current = null;
      toast({ title: "Error creating invitation", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const createAndOpenEmail = () => {
    pendingComposerWindow.current = window.open("about:blank", "neo-synapse-invitation-email");
    if (pendingComposerWindow.current) {
      pendingComposerWindow.current.document.title = "Preparing Neo Synapse invitation";
      pendingComposerWindow.current.document.body.textContent = "Preparing invitation email...";
    }
    createInvite.mutate();
  };

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast({ title: "Invitation revoked" });
    },
  });

  const copyInviteLink = (token: string) => {
    const link = buildInvitationLink(PUBLIC_APP_URL, token);
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Link copied", description: "Invite link copied to clipboard" });
    });
  };

  const shareViaWhatsApp = (inv: InvitationRow) => {
    const link = buildInvitationLink(PUBLIC_APP_URL, inv.token);
    window.open(buildWhatsAppShareUrl(link, inv.role), "_blank", "noopener,noreferrer");
  };

  const shareViaEmail = (inv: InvitationRow) => {
    const link = buildInvitationLink(PUBLIC_APP_URL, inv.token);
    const mailtoUrl = buildInvitationMailtoUrl(inv.email, link, inv.role);
    setEmailDraft({ recipient: inv.email, url: mailtoUrl });
    openMailtoLink(mailtoUrl);
  };

  const actionable = invitations.filter((i) => i.status === "pending" || i.status === "sent");
  const history = invitations.filter((i) => i.status !== "pending" && i.status !== "sent");

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 max-[380px]:p-3 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Invitations</h1>
            <p className="text-muted-foreground">Manage professional and admin invitations</p>
          </div>
          <Button
            onClick={() => {
              if (showForm) {
                resetForm();
              }
              setShowForm(!showForm);
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> New Invitation
          </Button>
        </div>

        {emailDraft && (
          <div className="flex flex-col gap-3 border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold">Invitation email ready</p>
              <p className="break-all text-sm text-muted-foreground">Recipient: {emailDraft.recipient}</p>
            </div>
            <div className="flex gap-2">
              <Button className="min-w-0 flex-1 sm:flex-none" onClick={() => openMailtoLink(emailDraft.url)}>
                <Mail className="mr-2 h-4 w-4" /> Open Email App
              </Button>
              <Button variant="outline" onClick={() => setEmailDraft(null)}>Dismiss</Button>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border space-y-4">
            <h3 className="font-semibold">Create Invitation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Input
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    touched.touch("email");
                  }}
                  onBlur={() => touched.touch("email")}
                  aria-invalid={showEmailError}
                  className="h-12 rounded-xl"
                />
                {showEmailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={facilityId || "none"} onValueChange={(v) => setFacilityId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Facility (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No facility</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={createAndOpenEmail} disabled={createInvite.isPending || !isInviteFormValid} className="h-12">
                {createInvite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Create &amp; Email</>}
              </Button>
            </div>
          </div>
        )}

        {/* Active invitations (pending + sent) */}
        {actionable.length > 0 && (
          <section>
            <h2 className="font-display text-base font-semibold text-yellow-400 mb-3">Active ({actionable.length})</h2>
            <div className="space-y-3">
              {actionable.map((inv) => {
                const statusClassName = statusStyles[inv.status] || statusStyles.pending;

                return (
                <div key={inv.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center ${
                      inv.status === "sent" ? "bg-blue-500/10" : "bg-yellow-500/10"
                    }`}>
                      {inv.status === "sent"
                        ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                        : <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold leading-5 sm:text-base">{inv.email}</p>
                          <p className="mt-0.5 flex flex-wrap gap-x-1 text-xs text-muted-foreground sm:text-sm">
                            <span className="capitalize">{inv.role}</span>
                            <span>•</span>
                            <span>Expires {new Date(inv.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          </p>
                        </div>
                        <Badge variant="outline" className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs capitalize ${statusClassName}`}>{inv.status}</Badge>
                      </div>
                      {inv.status === "pending" && <p className="mt-1 text-xs font-medium text-yellow-500">Awaiting acceptance</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:mt-0 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:border-t-0 sm:pt-0">
                    <Button variant="ghost" size="sm" className={invitationActionButtonClass} onClick={() => copyInviteLink(inv.token)} title="Copy invite link">
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" className={invitationActionButtonClass} onClick={() => shareViaWhatsApp(inv)} title="Share invite link via WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={invitationActionButtonClass}
                      onClick={() => shareViaEmail(inv)}
                      title="Open invitation in your mail app"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </Button>
                    <Button variant="ghost" size="sm" className={`${invitationActionButtonClass} text-destructive hover:text-destructive`} onClick={() => revokeInvite.mutate(inv.id)}>
                      <XCircle className="w-4 h-4" /> Revoke
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="font-display text-base font-semibold text-muted-foreground mb-3">History ({history.length})</h2>
            <div className="space-y-3">
              {history.map((inv) => (
                <div key={inv.id} className="bg-card rounded-2xl border border-border p-4 opacity-75 sm:flex sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-muted flex items-center justify-center">
                      <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold leading-5 sm:text-base">{inv.email}</p>
                          <p className="text-sm text-muted-foreground capitalize">{inv.role}</p>
                        </div>
                        <Badge variant="outline" className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs capitalize ${statusStyles[inv.status] || ""}`}>{inv.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {invitations.length === 0 && !isLoading && (
          <EmptyStateCard
            icon={Mail}
            title="No invitations yet"
            description="Click New Invitation to invite professionals or admins."
            compact
          />
        )}
      </div>
    </div>
  );
}
