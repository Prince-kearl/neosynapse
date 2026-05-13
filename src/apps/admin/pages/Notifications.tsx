import { NotificationCenterPage } from "@/components/common/NotificationCenterPage";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { pushNotificationService, type SendPushResponse } from "@/shared/services/pushNotificationService";

type NotificationTemplate = {
  id: string;
  name: string;
  title_template: string;
  body_template: string;
  target_role: "patient" | "professional" | "admin" | null;
  action_url: string | null;
  category: string;
};

export default function AdminNotifications() {
  const [targetRole, setTargetRole] = useState<"patient" | "professional" | "admin">("professional");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [testTargetUserId, setTestTargetUserId] = useState("");
  const [testTitle, setTestTitle] = useState("Neo Synapse test notification");
  const [testBody, setTestBody] = useState("This is a test push from Admin Notifications.");
  const [testUrgency, setTestUrgency] = useState<"normal" | "high">("normal");
  const [testDryRun, setTestDryRun] = useState(true);
  const [testResult, setTestResult] = useState<SendPushResponse | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["admin-notification-templates-active"],
    queryFn: async (): Promise<NotificationTemplate[]> => {
      const db = supabase as any;
      const { data, error } = await db
        .from("admin_notification_templates")
        .select("id, name, title_template, body_template, target_role, action_url, category")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pushTargets = [] } = useQuery({
    queryKey: ["admin-push-test-targets"],
    queryFn: async (): Promise<Array<{ user_id: string; full_name: string | null; display_name: string | null; role: string | null }>> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, display_name, role")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data ?? [];
    },
  });

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setTitle(tpl.title_template);
    setBody(tpl.body_template);
    setActionUrl(tpl.action_url ?? "");
    if (tpl.target_role) setTargetRole(tpl.target_role);
  };

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const cleanTitle = title.trim();
      const cleanBody = body.trim();

      if (!cleanTitle || !cleanBody) {
        throw new Error("Title and message are required");
      }

      const db = supabase as any;
      const { data, error } = await db.rpc("create_role_notification", {
        p_target_role: targetRole,
        p_title: cleanTitle,
        p_body: cleanBody,
        p_category: "system",
        p_action_url: actionUrl.trim() || null,
        p_metadata: {
          source: "admin_notifications_page",
          sent_at: new Date().toISOString(),
        },
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (recipientCount) => {
      toast({
        title: "Broadcast sent",
        description: `Delivered to ${recipientCount || 0} ${targetRole} account(s).`,
      });
      setTitle("");
      setBody("");
      setActionUrl("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to send broadcast", description: error.message, variant: "destructive" });
    },
  });

  const testPushMutation = useMutation({
    mutationFn: async () => {
      const target = testTargetUserId.trim();
      const titleValue = testTitle.trim();
      const bodyValue = testBody.trim();

      if (!target) throw new Error("Target user is required");
      if (!titleValue || !bodyValue) throw new Error("Title and body are required");

      return pushNotificationService.sendTestPush({
        targetUserId: target,
        title: titleValue,
        body: bodyValue,
        urgency: testUrgency,
        dryRun: testDryRun,
        data: {
          source: "admin_notifications_page",
          sent_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: (result) => {
      setTestResult(result);
      const mode = result.dry_run ? "Dry run" : "Push send";
      toast({
        title: `${mode} completed`,
        description: `sent: ${result.totals.sent}, failed: ${result.totals.failed}, skipped: ${result.totals.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test push failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <section className="mx-auto mt-4 w-full max-w-2xl rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Send Role Broadcast</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a system notification to all users with a selected role.
        </p>
        <div className="mt-4 grid gap-3">
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Load from Template <span className="text-muted-foreground">(optional)</span></Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a saved template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Selecting a template prefills the fields below. You can edit before sending.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Target Role</Label>
            <Select value={targetRole} onValueChange={(value: "patient" | "professional" | "admin") => setTargetRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select target role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">Patients</SelectItem>
                <SelectItem value="professional">Professionals</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="System maintenance window" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The platform will have a scheduled update at 22:00 UTC."
              className="min-h-24"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Action URL (optional)</Label>
            <Input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="/professional/encounters" />
          </div>
          <Button onClick={() => broadcastMutation.mutate()} disabled={broadcastMutation.isPending}>
            {broadcastMutation.isPending ? "Sending..." : "Send Broadcast"}
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Mobile Push Test</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a dry-run or real push to one selected user using stored <span className="font-mono">mobile_push_tokens</span>.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="space-y-1.5">
            <Label>Target User</Label>
            <Select value={testTargetUserId} onValueChange={setTestTargetUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {pushTargets.map((user) => {
                  const label = user.full_name || user.display_name || user.user_id;
                  return (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {label} {user.role ? `(${user.role})` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} placeholder="Neo Synapse test notification" />
          </div>

          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              placeholder="This is a test push from Admin Notifications."
              className="min-h-20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <Select value={testUrgency} onValueChange={(value: "normal" | "high") => setTestUrgency(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Dry run</p>
                <p className="text-xs text-muted-foreground">No provider send; validates token routing and payload.</p>
              </div>
              <Switch checked={testDryRun} onCheckedChange={setTestDryRun} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => testPushMutation.mutate()} disabled={testPushMutation.isPending}>
              {testPushMutation.isPending ? "Running..." : testDryRun ? "Run Dry Test" : "Send Real Test"}
            </Button>
            <Button variant="outline" onClick={() => setTestResult(null)} disabled={testPushMutation.isPending || !testResult}>
              Clear Result
            </Button>
          </div>

          {testResult && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium">Latest response</p>
              <p className="mt-1 text-muted-foreground">
                sent: {testResult.totals.sent}, failed: {testResult.totals.failed}, skipped: {testResult.totals.skipped}
              </p>
              <pre className="mt-2 overflow-x-auto rounded border border-border bg-background p-2 text-xs">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>

      <NotificationCenterPage
        heading="Notifications"
        subheading="System alerts and admin updates"
        settingsPath="/admin/settings#notifications"
      />
    </div>
  );
}
