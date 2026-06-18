import { Users, Search, Loader2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { getPrimaryRoleFromRoles, ROLE_PRIORITY } from "@/auth/rolePriority";

const roleStyles: Record<string, string> = {
  patient: "border-blue-500/50 text-blue-500",
  professional: "border-emerald-500/50 text-emerald-500",
  admin: "border-destructive/50 text-destructive",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: profilesError }, { data: userRoles, error: rolesError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, full_name, display_name, role, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("user_roles")
          .select("user_id, role"),
      ]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      const roleMap = new Map<string, string[]>();
      for (const row of userRoles || []) {
        const list = roleMap.get(row.user_id) || [];
        if (!list.includes(row.role)) list.push(row.role);
        roleMap.set(row.user_id, list);
      }

      return (profiles || []).map((profile) => {
        const roles = roleMap.get(profile.user_id) || [];
        const primaryRole = getPrimaryRoleFromRoles(roles, profile.role);

        return {
          ...profile,
          roles: roles.length > 0 ? roles : (primaryRole ? [primaryRole] : []),
          primaryRole,
        };
      });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User updated" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const filtered = users.filter((u: any) => {
    const name = u.full_name || u.display_name || "";
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      (u.user_id || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.roles.includes(roleFilter) || u.primaryRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const availableRoles = Array.from(
    new Set(
      users.flatMap((u: any) => (u.roles?.length ? u.roles : u.primaryRole ? [u.primaryRole] : []))
    )
  ).sort((a, b) => {
    const aIdx = ROLE_PRIORITY.indexOf(a as any);
    const bIdx = ROLE_PRIORITY.indexOf(b as any);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Users</h1>
          <p className="text-muted-foreground">Manage platform users and access — {users.length} total</p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {availableRoles.map((role) => (
              <Button
                key={role}
                variant={roleFilter === role ? "default" : "outline"}
                size="sm"
                onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                className="capitalize"
              >
                {role}
              </Button>
            ))}
          </div>
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((u: any) => (
              <div key={u.id} className="bg-card rounded-2xl p-4 border border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(u.full_name || u.display_name || "?").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.full_name || u.display_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(u.roles || []).map((role: string) => (
                      <Badge key={role} variant="outline" className={roleStyles[role] || ""}>{role}</Badge>
                    ))}
                  </div>
                  <Badge variant="outline" className={
                    u.status === "active" ? "border-emerald-500/50 text-emerald-500" : "border-destructive/50 text-destructive"
                  }>
                    {u.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => toggleStatus.mutate({
                      userId: u.user_id,
                      newStatus: u.status === "active" ? "suspended" : "active",
                    })}
                  >
                    {u.status === "active" ? (
                      <><UserX className="w-4 h-4 mr-1" /> Suspend</>
                    ) : (
                      <><UserCheck className="w-4 h-4 mr-1" /> Activate</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard icon={Users} title="No users found" compact />
        )}
      </div>
    </div>
  );
}
