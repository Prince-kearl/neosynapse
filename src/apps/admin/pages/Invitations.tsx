import { Mail, Plus, Send, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminInvitations() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("professional");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invitations = [], refetch } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleCreateInvitation = async () => {
    if (!email || !user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("invitations").insert({
        email,
        role: role as any,
        invited_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Invitation sent", description: `Invite sent to ${email}` });
      setEmail("");
      setShowForm(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500",
    accepted: "bg-green-500/10 text-green-500",
    revoked: "bg-destructive/10 text-destructive",
  };

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

        {showForm && (
          <div className="bg-card rounded-2xl p-5 shadow-food-card border border-border space-y-4">
            <h3 className="font-semibold">Create Invitation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreateInvitation} disabled={isSubmitting || !email} className="h-12">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Invite</>}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {invitations.map((inv: any) => (
            <div key={inv.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Mail className="w-6 h-6 text-primary" /></div>
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Role: <span className="capitalize">{inv.role}</span> • Expires: {new Date(inv.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
              <Badge className={statusColors[inv.status] || statusColors.pending}>{inv.status}</Badge>
            </div>
          ))}
          {invitations.length === 0 && (
            <div className="bg-card rounded-2xl p-8 shadow-food-card text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No invitations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
