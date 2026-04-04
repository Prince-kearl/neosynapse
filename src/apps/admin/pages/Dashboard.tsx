import { Users, Mail, Building2, ShieldCheck, ScrollText, Activity, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { MetricCard } from "@/components/common/MetricCard";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();

  const displayName = profile?.display_name || profile?.full_name || "Admin";

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
  const { data: recentLogs = [] } = useQuery({
    queryKey: ["admin-recent-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5);
      if (error) return [];
      return data || [];
    },
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

  const stats = [
    { label: "Total Users", value: userCount, icon: Users, color: "text-primary" },
    { label: "Pending Invites", value: pendingInvites, icon: Mail, color: "text-yellow-400" },
    { label: "Active Facilities", value: facilityCount, icon: Building2, color: "text-accent" },
    { label: "Clinicians", value: proCount, icon: ShieldCheck, color: "text-emerald-400" },
  ];

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
        {(pendingVerifications > 0 || pendingInvites > 0) && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">Action Required</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {pendingVerifications > 0 && (
                <p>{pendingVerifications} professional(s) awaiting verification.</p>
              )}
              {pendingInvites > 0 && (
                <p>{pendingInvites} invitation(s) still pending acceptance.</p>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Invite Professional", path: "/admin/invitations", icon: Mail, desc: "Send invite link" },
              { label: "Manage Users", path: "/admin/users", icon: Users, desc: "View all accounts" },
              { label: "Add Facility", path: "/admin/facilities", icon: Building2, desc: "Register location" },
              { label: "View Audit Log", path: "/admin/audit", icon: ScrollText, desc: "Review activity" },
            ].map((action) => (
              <button
                key={action.label}
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
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.entity_type}{log.entity_id ? ` • ${log.entity_id.slice(0, 8)}...` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyStateCard icon={ScrollText} title="No recent activity recorded." compact />
          )}
        </section>
      </div>
    </div>
  );
}
