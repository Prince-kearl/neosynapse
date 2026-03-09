import { ShieldCheck } from "lucide-react";

export default function AdminRoles() {
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Roles</h1>
          <p className="text-muted-foreground">Manage role definitions and access metadata</p>
        </div>
        <div className="space-y-4">
          {[
            { role: "Patient", description: "Self-signup. Access to own health data, appointments, AI assistant, and telemedicine.", count: 15 },
            { role: "Professional", description: "Invite-only. Access to assigned patients, encounters, notes, transcripts, and reports.", count: 8 },
            { role: "Admin", description: "Invite-only. Full system management including users, facilities, invitations, and audit logs.", count: 1 },
          ].map((r) => (
            <div key={r.role} className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-lg">{r.role}</p>
                    <span className="text-sm text-muted-foreground">({r.count} users)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
