import { ScrollText, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function AdminAudit() {
  const [search, setSearch] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Audit Log</h1>
          <p className="text-muted-foreground">Track system activity and actions</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search audit logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 rounded-xl" />
        </div>

        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <div key={log.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-sm text-muted-foreground">{log.entity_type}{log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-8 shadow-food-card text-center border border-border">
            <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No audit log entries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
