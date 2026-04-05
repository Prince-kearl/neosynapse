import { ShieldCheck, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const rolePriority = ["admin", "professional", "patient"];

export default function AdminRoles() {
  const { data: roleStats = [], isLoading } = useQuery({
    queryKey: ["admin-role-stats"],
    queryFn: async () => {
      const [{ data: roleRows, error: roleError }, { data: profiles, error: profileError }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("user_id, full_name, display_name"),
      ]);

      if (roleError) throw roleError;
      if (profileError) throw profileError;

      const profileMap = new Map<string, { full_name: string | null; display_name: string | null }>();
      (profiles || []).forEach((p) => {
        profileMap.set(p.user_id, { full_name: p.full_name, display_name: p.display_name });
      });

      const byRole = new Map<string, { role: string; count: number; recentUsers: string[] }>();
      (roleRows || []).forEach((row) => {
        const entry = byRole.get(row.role) || { role: row.role, count: 0, recentUsers: [] };
        entry.count += 1;

        const p = profileMap.get(row.user_id);
        const name = p?.full_name || p?.display_name || row.user_id.slice(0, 8);
        if (!entry.recentUsers.includes(name) && entry.recentUsers.length < 5) {
          entry.recentUsers.push(name);
        }

        byRole.set(row.role, entry);
      });

      return Array.from(byRole.values()).sort((a, b) => {
        const aIdx = rolePriority.indexOf(a.role);
        const bIdx = rolePriority.indexOf(b.role);
        if (aIdx === -1 && bIdx === -1) return a.role.localeCompare(b.role);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    },
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Roles</h1>
          <p className="text-muted-foreground">Role definitions, access metadata, and user distribution</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {roleStats.map((entry: any) => (
              <div key={entry.role} className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-lg capitalize">{entry.role}</p>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {entry.count} users
                      </Badge>
                      {entry.role !== "patient" && (
                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Invite Only</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Recent Members</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.recentUsers.length > 0 ? (
                          entry.recentUsers.map((name: string) => (
                            <span key={name} className="text-xs bg-muted px-2 py-1 rounded-md">{name}</span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No users assigned yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
