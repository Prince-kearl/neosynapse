import { Mail, Plus, Send, RotateCw, XCircle, Loader2, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusStyles: Record<string, string> = {
  pending: "border-yellow-500/50 text-yellow-500",
  sent: "border-blue-500/50 text-blue-500",
  accepted: "border-emerald-500/50 text-emerald-500",
  revoked: "border-destructive/50 text-destructive",
  expired: "border-muted-foreground/50 text-muted-foreground",
};

export default function AdminInvitations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("professional");
  const [facilityId, setFacilityId] = useState<string>("");

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["admin-facilities-list"],
    queryFn: async () => {
      const { data } = await supabase.from("facilities").select("id, name").order("name");
      return data || [];
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email,
          role,
          invited_by: user!.id,
          facility_id: facilityId || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as { success: boolean; email_sent: boolean; email_error: string | null; invite_link: string };
    },
    onSuccess: (data) => {
      if (data.email_sent) {
        toast({ title: "Invitation sent", description: `Invite email delivered to ${email}` });
      } else {
        toast({
          title: "Invitation created (email not sent)",
          description: data.email_error || "Email delivery is not configured. Copy the invite link manually.",
          variant: "destructive",
        });
        // Copy invite link to clipboard for manual sharing
        if (data.invite_link) {
          navigator.clipboard.writeText(data.invite_link).catch(() => {});
        }
      }
      setEmail("");
      setFacilityId("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
    onError: (e: any) => {
      toast({ title: "Error creating invitation", description: e.message, variant: "destructive" });
    },
  });

  const resendInvite = useMutation({
    mutationFn: async (inv: { id: string; email: string; role: string; facility_id: string | null }) => {
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: inv.email,
          role: inv.role,
          invited_by: user!.id,
          facility_id: inv.facility_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Update the original invitation status if email was sent
      if (data?.email_sent) {
        await supabase.from("invitations").update({ status: "sent" }).eq("id", inv.id);
      }
      return data as { email_sent: boolean; email_error: string | null };
    },
    onSuccess: (data, inv) => {
      if (data.email_sent) {
        toast({ title: "Invitation resent", description: `Email delivered to ${inv.email}` });
      } else {
        toast({ title: "Resend failed", description: data.email_error || "Email delivery failed", variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
    onError: (e: any) => {
      toast({ title: "Error resending", description: e.message, variant: "destructive" });
    },
  });

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
    const link = `${window.location.origin}/auth/invite-accept?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Link copied", description: "Invite link copied to clipboard" });
    });
  };

  const actionable = invitations.filter((i: any) => i.status === "pending" || i.status === "sent");
  const history = invitations.filter((i: any) => i.status !== "pending" && i.status !== "sent");

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Invitations</h1>
            <p className="text-muted-foreground">Manage professional and admin invitations</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" /> New Invitation
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
            <h3 className="font-semibold">Create Invitation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
              />
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
                  {facilities.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => createInvite.mutate()} disabled={createInvite.isPending || !email} className="h-12">
                {createInvite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Invite</>}
              </Button>
            </div>
          </div>
        )}

        {/* Active invitations (pending + sent) */}
        {actionable.length > 0 && (
          <section>
            <h2 className="font-display text-base font-semibold text-yellow-400 mb-3">Active ({actionable.length})</h2>
            <div className="space-y-3">
              {actionable.map((inv: any) => (
                <div key={inv.id} className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      inv.status === "sent" ? "bg-blue-500/10" : "bg-yellow-500/10"
                    }`}>
                      {inv.status === "sent" 
                        ? <CheckCircle2 className="w-6 h-6 text-blue-500" />
                        : <AlertTriangle className="w-6 h-6 text-yellow-500" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="capitalize">{inv.role}</span> • Expires {new Date(inv.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {inv.status === "pending" && <span className="text-yellow-500 ml-2">• Email not delivered</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusStyles[inv.status] || statusStyles.pending}>{inv.status}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)} title="Copy invite link">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => revokeInvite.mutate(inv.id)}>
                      <XCircle className="w-4 h-4 mr-1" /> Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="font-display text-base font-semibold text-muted-foreground mb-3">History ({history.length})</h2>
            <div className="space-y-3">
              {history.map((inv: any) => (
                <div key={inv.id} className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between opacity-70">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Mail className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-sm text-muted-foreground capitalize">{inv.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusStyles[inv.status] || ""}>{inv.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {invitations.length === 0 && !isLoading && (
          <div className="bg-card rounded-2xl p-8 text-center border border-border">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invitations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "New Invitation" to invite professionals or admins.</p>
          </div>
        )}
      </div>
    </div>
  );
}
