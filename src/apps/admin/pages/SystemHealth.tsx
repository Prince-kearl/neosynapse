import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Activity,
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  FileArchive,
  Gauge,
  Loader2,
  Radio,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Wifi,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  getDiagnosticErrorMessage,
  summarizeSystemHealth,
  type DiagnosticCheck,
  type DiagnosticStatus,
} from "@/shared/lib/systemDiagnostics";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<DiagnosticCheck["category"], string> = {
  core: "Core Platform",
  data: "Data & Storage",
  services: "Services & Delivery",
  device: "Client Runtime",
};

const CHECK_ICONS: Record<string, LucideIcon> = {
  auth: ShieldCheck,
  database: Database,
  settings: Settings,
  notifications: Bell,
  storage: FileArchive,
  realtime: Radio,
  functions: Cloud,
  network: Wifi,
  runtime: Smartphone,
};

const STATUS_META: Record<DiagnosticStatus, { label: string; icon: LucideIcon; className: string; dotClassName: string }> = {
  healthy: {
    label: "Operational",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  },
  degraded: {
    label: "Degraded",
    icon: TriangleAlert,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClassName: "bg-amber-500",
  },
  unavailable: {
    label: "Unavailable",
    icon: XCircle,
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    dotClassName: "bg-red-500",
  },
};

type CheckOutcome = Pick<DiagnosticCheck, "status" | "detail">;

async function measuredCheck(
  check: Omit<DiagnosticCheck, "status" | "detail" | "latencyMs">,
  operation: () => Promise<CheckOutcome>,
): Promise<DiagnosticCheck> {
  const startedAt = performance.now();
  try {
    const outcome = await operation();
    return { ...check, ...outcome, latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return {
      ...check,
      status: "unavailable",
      detail: getDiagnosticErrorMessage(error),
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

async function checkRealtime(): Promise<CheckOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const channel = supabase.channel(`admin-health-${crypto.randomUUID()}`);
    const finish = (outcome: CheckOutcome) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      void supabase.removeChannel(channel);
      resolve(outcome);
    };
    const timeoutId = window.setTimeout(
      () => finish({ status: "unavailable", detail: "Realtime subscription timed out after 6 seconds." }),
      6_000,
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        finish({ status: "healthy", detail: "Realtime WebSocket subscription established." });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        finish({ status: "unavailable", detail: `Realtime returned ${status.toLowerCase().replace("_", " ")}.` });
      } else if (status === "CLOSED" && !settled) {
        finish({ status: "degraded", detail: "Realtime channel closed before confirmation." });
      }
    });
  });
}

async function checkEdgeFunctions(): Promise<CheckOutcome> {
  const { data, error } = await supabase.functions.invoke("system-health", { body: {} });
  if (error) {
    return {
      status: "degraded",
      detail: "The server-side deployment probe is not available yet. Deploy the system-health Edge Function, then run diagnostics again.",
    };
  }

  const checks = Array.isArray(data?.checks)
    ? data.checks as Array<{ name: string; status: "active" | "protected" | "missing" | "error" }>
    : [];
  if (checks.length === 0) {
    return { status: "unavailable", detail: "The server-side probe returned no function results." };
  }

  const active = checks.filter((check) => check.status === "active");
  const protectedFunctions = checks.filter((check) => check.status === "protected");
  const missing = checks.filter((check) => check.status === "missing");
  const failed = checks.filter((check) => check.status === "error");
  const details = [
    `${active.length}/${checks.length} active`,
    protectedFunctions.length ? `${protectedFunctions.length} deployed but gateway-protected (${protectedFunctions.map((item) => item.name).join(", ")})` : "",
    missing.length ? `${missing.length} missing (${missing.map((item) => item.name).join(", ")})` : "",
    failed.length ? `${failed.length} failed (${failed.map((item) => item.name).join(", ")})` : "",
  ].filter(Boolean).join(". ");

  if (active.length === checks.length) {
    return { status: "healthy", detail: `${details}. Verified server-side without invoking paid providers.` };
  }
  if (active.length > 0 || protectedFunctions.length > 0) {
    return { status: "degraded", detail: `${details}. No paid provider was invoked.` };
  }
  return { status: "unavailable", detail: `${details}. Check function deployment and project access.` };
}

async function runSystemDiagnostics(): Promise<DiagnosticCheck[]> {
  const db = supabase as any;

  return Promise.all([
    measuredCheck(
      { id: "auth", name: "Admin authentication", description: "Current Supabase session and identity", category: "core" },
      async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session?.user) return { status: "unavailable", detail: "No authenticated admin session was found." };
        return { status: "healthy", detail: `Authenticated session active for ${data.session.user.email || data.session.user.id}.` };
      },
    ),
    measuredCheck(
      { id: "database", name: "Database access", description: "Postgres API and admin profile visibility", category: "core" },
      async () => {
        const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        if (error) throw error;
        return { status: "healthy", detail: `Database responded; ${count ?? 0} profile records are visible to this admin.` };
      },
    ),
    measuredCheck(
      { id: "settings", name: "Tenant settings", description: "Shared branding and runtime configuration", category: "data" },
      async () => {
        const { data, error } = await db.from("app_settings").select("id, updated_at").limit(1).maybeSingle();
        if (error) throw error;
        return data
          ? { status: "healthy", detail: `Tenant settings are readable; last updated ${new Date(data.updated_at).toLocaleString("en-GB")}.` }
          : { status: "degraded", detail: "No tenant settings record exists; application defaults are being used." };
      },
    ),
    measuredCheck(
      { id: "notifications", name: "Notification records", description: "In-app alert persistence and admin visibility", category: "services" },
      async () => {
        const { count, error } = await db.from("user_notifications").select("*", { count: "exact", head: true });
        if (error) throw error;
        return { status: "healthy", detail: `Notification table is accessible; ${count ?? 0} records are currently visible.` };
      },
    ),
    measuredCheck(
      { id: "storage", name: "Medical document storage", description: "Private medical-history document bucket access", category: "data" },
      async () => {
        const { data, error } = await supabase.storage.from("medical-history-documents").list("", { limit: 1 });
        if (error) return { status: "degraded", detail: `Bucket responded but admin listing is restricted: ${error.message}` };
        return { status: "healthy", detail: `Medical document bucket is reachable; ${data.length} root item sampled.` };
      },
    ),
    measuredCheck(
      { id: "realtime", name: "Realtime channel", description: "WebSocket availability for calls and live alerts", category: "services" },
      checkRealtime,
    ),
    measuredCheck(
      { id: "functions", name: "Edge Functions", description: "Deployment reachability without consuming AI credits", category: "services" },
      checkEdgeFunctions,
    ),
    measuredCheck(
      { id: "network", name: "Network connectivity", description: "Current client connectivity state", category: "device" },
      async () => navigator.onLine
        ? { status: "healthy", detail: "The device reports an active network connection." }
        : { status: "unavailable", detail: "The device is offline." },
    ),
    measuredCheck(
      { id: "runtime", name: "Application runtime", description: "Web or Capacitor mobile shell information", category: "device" },
      async () => ({
        status: "healthy",
        detail: Capacitor.isNativePlatform()
          ? `Running in the Capacitor ${Capacitor.getPlatform()} shell.`
          : `Running as a web application at ${window.innerWidth} x ${window.innerHeight}.`,
      }),
    ),
  ]);
}

function StatusBadge({ status }: { status: DiagnosticStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", meta.className)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export default function AdminSystemHealth() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setIsChecking(true);
    const nextChecks = await runSystemDiagnostics();
    setChecks(nextChecks);
    setLastCheckedAt(new Date());
    setIsChecking(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => summarizeSystemHealth(checks), [checks]);
  const groupedChecks = useMemo(
    () => (Object.keys(CATEGORY_LABELS) as DiagnosticCheck["category"][])
      .map((category) => ({ category, checks: checks.filter((check) => check.category === category) }))
      .filter((group) => group.checks.length > 0),
    [checks],
  );

  const overallMeta = STATUS_META[summary.status];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 lg:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold lg:text-3xl">System Health</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Read-only diagnostics for platform services and mobile delivery infrastructure.
            </p>
          </div>
          <Button onClick={() => void refresh()} disabled={isChecking} className="w-full sm:w-auto">
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isChecking ? "Checking..." : "Run diagnostics"}
          </Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Overall status</p>
                <p className="mt-1 text-xl font-bold">{isChecking && checks.length === 0 ? "Checking" : overallMeta.label}</p>
              </div>
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", overallMeta.className)}>
                <Gauge className="h-5 w-5" />
              </div>
            </div>
            <Progress value={isChecking && checks.length === 0 ? 0 : summary.score} className="mt-4 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">Health score: {summary.score}%</p>
          </div>
          {[
            { label: "Operational", value: summary.healthy, icon: CheckCircle2, className: "text-emerald-600" },
            { label: "Degraded", value: summary.degraded, icon: TriangleAlert, className: "text-amber-600" },
            { label: "Unavailable", value: summary.unavailable, icon: XCircle, className: "text-red-600" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-card p-4">
              <item.icon className={cn("h-5 w-5", item.className)} />
              <p className="mt-3 text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </section>

        {isChecking && checks.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-border bg-card">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Checking platform services...</p>
            </div>
          </div>
        ) : (
          groupedChecks.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 font-display text-lg font-semibold">{CATEGORY_LABELS[group.category]}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.checks.map((check) => {
                  const Icon = CHECK_ICONS[check.id] || Server;
                  return (
                    <article key={check.id} className="min-w-0 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-foreground">{check.name}</h3>
                              <p className="text-xs text-muted-foreground">{check.description}</p>
                            </div>
                            <StatusBadge status={check.status} />
                          </div>
                          <p className="mt-3 break-words text-sm text-foreground/85">{check.detail}</p>
                          {typeof check.latencyMs === "number" && (
                            <p className="mt-2 text-xs text-muted-foreground">Completed in {check.latencyMs} ms</p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}

        <footer className="flex flex-col gap-1 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Diagnostics are read-only and do not invoke paid AI providers.
          </span>
          <span>{lastCheckedAt ? `Last checked ${lastCheckedAt.toLocaleString("en-GB")}` : "Not checked yet"}</span>
        </footer>
      </div>
    </div>
  );
}
