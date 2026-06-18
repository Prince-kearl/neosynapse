import { ScrollText, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useAdminSettings } from "@/shared/hooks/useAdminSettings";
import type { AuditLog } from "@/shared/types/healthcare";

const actionStyles: Record<string, string> = {
  create: "border-emerald-500/50 text-emerald-500",
  update: "border-blue-500/50 text-blue-500",
  delete: "border-destructive/50 text-destructive",
  login: "border-primary/50 text-primary",
};

export default function AdminAudit() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const { settings } = useAdminSettings();
  const retentionDays = Number(settings.dataRetentionDays) || 90;
  const auditCutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["admin-audit-logs", settings.dataRetentionDays],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .gte("created_at", auditCutoffIso)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AuditLog[];
    },
    enabled: settings.auditLoggingVisible,
  });

  const entityTypes = [...new Set(logs.map((log) => log.entity_type))];

  const filtered = logs.filter((log) => {
    const matchesSearch = !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = !entityFilter || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Audit Log</h1>
          <p className="text-muted-foreground">Track system activity, user actions, and compliance events</p>
        </div>

        {!settings.auditLoggingVisible ? (
          <EmptyStateCard
            icon={ScrollText}
            title="Audit log details are hidden"
            description="Enable Audit Logging in Admin Settings to view compliance activity."
            compact
          />
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Showing audit events retained for the last {settings.dataRetentionDays} days.
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by action or entity..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 rounded-xl" />
              </div>
              {entityTypes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {entityTypes.slice(0, 5).map((et: string) => (
                    <Button
                      key={et}
                      variant={entityFilter === et ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEntityFilter(entityFilter === et ? null : et)}
                    >
                      {et}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Log List */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-2">
                {filtered.map((log) => {
                  const actionWord = log.action.split("_")[0]?.toLowerCase() || "";
                  return (
                    <div key={log.id} className="bg-card rounded-xl p-4 border border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                          <ScrollText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-all text-sm font-medium">{log.action}</p>
                            <Badge variant="outline" className={actionStyles[actionWord] || ""}>{log.entity_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {log.actor_id ? `Actor: ${log.actor_id.slice(0, 8)}...` : "System"}
                            {log.entity_id && ` • Entity: ${log.entity_id.slice(0, 8)}...`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground sm:whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-GB", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyStateCard
                icon={ScrollText}
                title={search || entityFilter ? "No matching audit log entries" : "No audit log entries yet"}
                compact
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
