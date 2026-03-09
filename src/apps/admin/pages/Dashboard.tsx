import { Users, Mail, Building2, ShieldCheck, ScrollText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-7xl space-y-6 lg:space-y-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Admin Console</h1>
          <p className="text-muted-foreground mt-1">System overview and management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: "24", icon: Users, color: "bg-primary/10 text-primary" },
            { label: "Pending Invites", value: "3", icon: Mail, color: "bg-yellow-500/10 text-yellow-500" },
            { label: "Active Facilities", value: "5", icon: Building2, color: "bg-accent/10 text-accent" },
            { label: "Clinicians", value: "8", icon: ShieldCheck, color: "bg-green-500/10 text-green-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Invite Professional", url: "/admin/invitations", icon: Mail },
              { label: "Manage Users", url: "/admin/users", icon: Users },
              { label: "Add Facility", url: "/admin/facilities", icon: Building2 },
              { label: "View Audit Log", url: "/admin/audit", icon: ScrollText },
            ].map((action) => (
              <button key={action.label} onClick={() => navigate(action.url)} className="bg-card rounded-2xl p-4 shadow-food-card border border-border text-left hover:border-primary/50 transition-colors">
                <action.icon className="w-8 h-8 text-primary mb-2" />
                <p className="font-medium text-sm">{action.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
          <h2 className="font-display text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: "Professional invitation sent to dr.ama@hospital.gh", time: "2 hours ago", type: "info" },
              { action: "New patient registration: kofi.asante@email.com", time: "5 hours ago", type: "success" },
              { action: "Facility 'Korle-Bu Teaching Hospital' updated", time: "1 day ago", type: "info" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === "success" ? "bg-green-500/10" : "bg-primary/10"}`}>
                  {item.type === "success" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <p className="text-sm">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
