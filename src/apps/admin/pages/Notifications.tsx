import { NotificationCenterPage } from "@/components/common/NotificationCenterPage";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function AdminNotifications() {
  const [targetRole, setTargetRole] = useState<"patient" | "professional" | "admin">("professional");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionUrl, setActionUrl] = useState("");

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

  return (
    <div className="space-y-4">
      <section className="mx-auto mt-4 w-full max-w-2xl rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Send Role Broadcast</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a system notification to all users with a selected role.
        </p>
        <div className="mt-4 grid gap-3">
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

      <NotificationCenterPage
        heading="Notifications"
        subheading="System alerts and admin updates"
        settingsPath="/admin/settings#notifications"
      />
    </div>
  );
}
