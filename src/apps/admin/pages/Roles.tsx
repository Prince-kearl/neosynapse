import { ShieldCheck, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const roleDescriptions: Record<string, string> = {
  patient: "Self-signup. Access to own health data, appointments, AI assistant, and telemedicine.",
  professional: "Invite-only. Access to assigned patients, encounters, notes, transcripts, and reports.",
  admin: "Invite-only. Full system management including users, facilities, invitations, and audit logs.",
};

const roleAccess: Record<string, string[]> = {
  patient: ["Dashboard", "AI Assistant", "Symptom Checker", "Appointments", "Telemedicine", "Reports", "Profile", "Settings"],
  professional: ["Dashboard", "Patients", "Encounters", "Telemedicine", "Transcripts", "Clinical Notes", "Reports", "Settings"],
  admin: ["Dashboard", "Users", "Invitations", "Facilities", "Roles", "Templates", "Audit Log", "Settings"],
};

export default function AdminRoles() {
  // Fetch role counts from profiles
  const { data: roleCounts = { patient: 0, professional: 0, admin: 0 }, isLoading } = useQuery({
    queryKey: ["admin-role-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("role");
      if (error) return { patient: 0, professional: 0, admin: 0 };
      const counts: Record<string, number> = { patient: 0, professional: 0, admin: 0 };
      (data || []).forEach((p: any) => { counts[p.role] = (counts[p.role] || 0) + 1; });
      return counts;
    },
  });

  const roles = ["patient", "professional", "admin"];

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
            {roles.map((role) => (
              <div key={role} className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-lg capitalize">{role}</p>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {(roleCounts as any)[role]} users
                      </Badge>
                      {role !== "patient" && (
                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Invite Only</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{roleDescriptions[role]}</p>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Access</p>
                      <div className="flex flex-wrap gap-1.5">
                        {roleAccess[role].map((page) => (
                          <span key={page} className="text-xs bg-muted px-2 py-1 rounded-md">{page}</span>
                        ))}
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
