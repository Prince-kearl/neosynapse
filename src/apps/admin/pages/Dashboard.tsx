import { Users, Mail, Building2, ShieldCheck, ScrollText, Activity, ChevronRight, Loader2, Settings } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { MetricCard } from "@/components/common/MetricCard";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useAdminSettings } from "@/shared/hooks/useAdminSettings";
import type { AuditLog } from "@/shared/types/healthcare";
import type { LucideIcon } from "lucide-react";

type QuickAction = {
  id: string;
  label: string;
  path: string;
  desc: string;
  icon: LucideIcon;
  displayOrder: number;
};

type QuickActionRow = {
  id: string;
  label: string;
  path: string;
  description: string;
  icon: string;
  is_active: boolean;
  display_order: number;
};

const quickActionsQueryKey = ["admin-quick-actions"] as const;

const defaultQuickActions: QuickAction[] = [
  { id: "default-invite", label: "Invite Professional", path: "/admin/invitations", icon: Mail, desc: "Send invite link", displayOrder: 1 },
  { id: "default-users", label: "Manage Users", path: "/admin/users", icon: Users, desc: "View all accounts", displayOrder: 2 },
  { id: "default-facilities", label: "Add Facility", path: "/admin/facilities", icon: Building2, desc: "Register location", displayOrder: 3 },
  { id: "default-audit", label: "View Audit Log", path: "/admin/audit", icon: ScrollText, desc: "Review activity", displayOrder: 4 },
];

const quickActionIcons: Record<string, LucideIcon> = {
  Mail,
  Users,
  Building2,
  ScrollText,
  ShieldCheck,
  Activity,
  Settings,
};

const mapRowToQuickAction = (row: QuickActionRow): QuickAction => ({
  id: row.id,
  label: row.label,
  path: row.path,
  desc: row.description,
  icon: quickActionIcons[row.icon] || ShieldCheck,
  displayOrder: row.display_order,
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { settings } = useAdminSettings();

  const displayName = profile?.display_name || profile?.full_name || "Admin";
  const retentionDays = Number(settings.dataRetentionDays) || 90;
  const auditCutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  // Fetch counts
  const { data: userCount = 0 } = useQuery({
    queryKey: ["admin-user-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: pendingInvites = 0 } = useQuery({
    queryKey: ["admin-pending-invites"],
    queryFn: async () => {
      const { count, error } = await supabase.from("invitations").select("*", { count: "exact", head: true }).eq("status", "pending");
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: facilityCount = 0 } = useQuery({
    queryKey: ["admin-facility-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("facilities").select("*", { count: "exact", head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: proCount = 0 } = useQuery({
    queryKey: ["admin-pro-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("professional_profiles").select("*", { count: "exact", head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  // Recent audit logs
  const { data: recentLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["admin-recent-logs", settings.dataRetentionDays],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .gte("created_at", auditCutoffIso)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return (data || []) as AuditLog[];
    },
    enabled: settings.auditLoggingVisible,
  });

  // Pending verifications
  const { data: pendingVerifications = 0 } = useQuery({
    queryKey: ["admin-pending-verifications"],
    queryFn: async () => {
      const { count, error } = await supabase.from("professional_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending");
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: quickActions = defaultQuickActions } = useQuery({
    queryKey: quickActionsQueryKey,
    queryFn: async (): Promise<QuickAction[]> => {
      // Keep this query loosely typed until generated DB types include admin_quick_actions.
      const db = supabase as any;
      const { data, error } = await db
        .from("admin_quick_actions")
        .select("id, label, path, description, icon, is_active, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching admin quick actions:", error);
        return defaultQuickActions;
      }

      if (!data || data.length === 0) return defaultQuickActions;

      return (data as QuickActionRow[]).map(mapRowToQuickAction);
    },
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("admin-quick-actions-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_quick_actions" },
        (payload) => {
          queryClient.setQueryData<QuickAction[]>(quickActionsQueryKey, (current = defaultQuickActions) => {
            const eventType = payload.eventType;

            if (eventType === "DELETE") {
              const oldRow = payload.old as Partial<QuickActionRow>;
              const next = current.filter((item) => item.id !== oldRow.id);
              return next.length > 0 ? next : defaultQuickActions;
            }

            const row = payload.new as Partial<QuickActionRow>;
            if (!row.id) return current;

            const mapped = mapRowToQuickAction({
              id: row.id,
              label: row.label || "Untitled",
              path: row.path || "/admin/dashboard",
              description: row.description || "Quick action",
              icon: row.icon || "Settings",
              is_active: row.is_active ?? true,
              display_order: row.display_order ?? 999,
            });

            const withoutCurrent = current.filter((item) => item.id !== row.id);
            if (row.is_active === false) {
              return withoutCurrent.length > 0 ? withoutCurrent : defaultQuickActions;
            }

            return [...withoutCurrent, mapped].sort((a, b) => a.displayOrder - b.displayOrder);
          });

          // Refetch in background to ensure exact parity after optimistic cache patch.
          queryClient.invalidateQueries({ queryKey: quickActionsQueryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const stats = [
    { label: "Total Users", value: userCount, icon: Users, color: "text-primary" },
    { label: "Pending Invites", value: pendingInvites, icon: Mail, color: "text-yellow-400" },
    { label: "Active Facilities", value: facilityCount, icon: Building2, color: "text-accent" },
    { label: "Clinicians", value: proCount, icon: ShieldCheck, color: "text-emerald-400" },
  ];
  const shouldShowActionAlert =
    settings.systemAlerts &&
    (pendingVerifications > 0 || (settings.newRegistrations && pendingInvites > 0));

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Admin Console</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {displayName}. System overview and management.</p>
        </div>

        {/* Role Switcher for Admins */}
        <RoleSwitcher currentPath={window.location.pathname} />

        {/* Alerts */}
        {shouldShowActionAlert && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">Action Required</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {pendingVerifications > 0 && (
                <p>{pendingVerifications} professional(s) awaiting verification.</p>
              )}
              {settings.newRegistrations && pendingInvites > 0 && (
                <p>{pendingInvites} invitation(s) still pending acceptance.</p>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <MetricCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              iconClassName={stat.color}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 transition-colors group"
              >
                <action.icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        {settings.auditLoggingVisible && (
        <section className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/audit")}>
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {recentLogs.length > 0 ? (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-xl sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{log.action}</p>
                    <p className="text-xs text-muted-foreground break-words">
                      {log.entity_type}{log.entity_id ? ` • ${log.entity_id.slice(0, 8)}...` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground sm:text-right sm:shrink-0">
                    {new Date(log.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyStateCard icon={ScrollText} title="No recent activity recorded." compact />
          )}
        </section>
        )}
      </div>
    </div>
  );
}
