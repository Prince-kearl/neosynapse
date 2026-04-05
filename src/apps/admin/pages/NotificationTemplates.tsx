import { useState } from "react";
import { BellDot, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

type TemplateRow = {
  id: string;
  name: string;
  title_template: string;
  body_template: string;
  category: "system" | "appointment" | "clinical" | "general";
  target_role: "patient" | "professional" | "admin" | null;
  action_url: string | null;
  description: string | null;
  is_active: boolean;
};

type TemplateDraft = Omit<TemplateRow, "id">;

const BLANK_DRAFT: TemplateDraft = {
  name: "",
  title_template: "",
  body_template: "",
  category: "general",
  target_role: null,
  action_url: "",
  description: "",
  is_active: true,
};

const CATEGORY_LABELS: Record<string, string> = {
  system: "System",
  appointment: "Appointment",
  clinical: "Clinical",
  general: "General",
};

const ROLE_LABELS: Record<string, string> = {
  patient: "Patients",
  professional: "Professionals",
  admin: "Admins",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminNotificationTemplates() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<TemplateDraft>>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newDraft, setNewDraft] = useState<TemplateDraft>(BLANK_DRAFT);

  // ── Query ────────────────────────────────────────────────────────────────
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin-notification-templates"],
    queryFn: async (): Promise<TemplateRow[]> => {
      const db = supabase as any;
      const { data, error } = await db
        .from("admin_notification_templates")
        .select("id, name, title_template, body_template, category, target_role, action_url, description, is_active")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-notification-templates"] });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createTemplate = useMutation({
    mutationFn: async () => {
      const name = newDraft.name.trim();
      const title = newDraft.title_template.trim();
      const body = newDraft.body_template.trim();
      if (!name || !title || !body) throw new Error("Name, title, and body are required.");
      const db = supabase as any;
      const { error } = await db.from("admin_notification_templates").insert({
        name,
        title_template: title,
        body_template: body,
        category: newDraft.category,
        target_role: newDraft.target_role || null,
        action_url: newDraft.action_url?.trim() || null,
        description: newDraft.description?.trim() || null,
        is_active: newDraft.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewDraft(BLANK_DRAFT);
      setShowCreate(false);
      invalidate();
      toast({ title: "Template created" });
    },
    onError: (error: any) =>
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" }),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TemplateDraft> }) => {
      const db = supabase as any;
      const { error } = await db.from("admin_notification_templates").update({
        ...patch,
        name: patch.name?.trim(),
        title_template: patch.title_template?.trim(),
        body_template: patch.body_template?.trim(),
        action_url: patch.action_url?.trim() || null,
        description: patch.description?.trim() || null,
        target_role: patch.target_role || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      setEditingId(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      invalidate();
      toast({ title: "Template updated" });
    },
    onError: (error: any) =>
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("admin_notification_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Template deleted" });
    },
    onError: (error: any) =>
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" }),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getDraft = (t: TemplateRow): TemplateDraft => ({
    name: drafts[t.id]?.name ?? t.name,
    title_template: drafts[t.id]?.title_template ?? t.title_template,
    body_template: drafts[t.id]?.body_template ?? t.body_template,
    category: (drafts[t.id]?.category ?? t.category) as TemplateDraft["category"],
    target_role: (drafts[t.id]?.target_role !== undefined ? drafts[t.id].target_role : t.target_role) as TemplateDraft["target_role"],
    action_url: drafts[t.id]?.action_url ?? t.action_url ?? "",
    description: drafts[t.id]?.description ?? t.description ?? "",
    is_active: drafts[t.id]?.is_active ?? t.is_active,
  });

  const patchDraft = (id: string, changes: Partial<TemplateDraft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...changes } }));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <BellDot className="h-5 w-5 text-primary" />
            Notification Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable message scaffolds for the broadcast composer. Supports{" "}
            <code className="rounded bg-muted px-1 text-xs">{"{{variable}}"}</code> placeholders.
          </p>
        </div>
        {!showCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      {/* ── Create Form ─────────────────────────────────────────────────── */}
      {showCreate && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">New Template</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowCreate(false); setNewDraft(BLANK_DRAFT); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <TemplateForm
            draft={newDraft}
            onChange={(changes) => setNewDraft((prev) => ({ ...prev, ...changes }))}
            onSave={() => createTemplate.mutate()}
            onCancel={() => { setShowCreate(false); setNewDraft(BLANK_DRAFT); }}
            saving={createTemplate.isPending}
            saveLabel="Create Template"
          />
        </section>
      )}

      {/* ── Template List ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No templates yet.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const isEditing = editingId === t.id;
            const draft = getDraft(t);
            return (
              <section key={t.id} className="rounded-2xl border border-border bg-card p-4">
                {isEditing ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-medium">Edit Template</h2>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(null); setDrafts((p) => { const n = { ...p }; delete n[t.id]; return n; }); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <TemplateForm
                      draft={draft}
                      onChange={(changes) => patchDraft(t.id, changes)}
                      onSave={() => updateTemplate.mutate({ id: t.id, patch: drafts[t.id] ?? {} })}
                      onCancel={() => { setEditingId(null); setDrafts((p) => { const n = { ...p }; delete n[t.id]; return n; }); }}
                      saving={updateTemplate.isPending}
                      saveLabel="Save Changes"
                    />
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px] uppercase">
                          {t.is_active ? "active" : "inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[t.category]}</Badge>
                        {t.target_role ? (
                          <Badge variant="outline" className="text-[10px]">→ {ROLE_LABELS[t.target_role]}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">→ All roles</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-foreground">{t.title_template}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t.body_template}</p>
                      {t.description && (
                        <p className="mt-1 text-xs italic text-muted-foreground">{t.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(t.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteTemplate.mutate(t.id)}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Shared form subcomponent ────────────────────────────────────────────────

type FormProps = {
  draft: TemplateDraft;
  onChange: (changes: Partial<TemplateDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
};

function TemplateForm({ draft, onChange, onSave, onCancel, saving, saveLabel }: FormProps) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Template Name</Label>
          <Input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Scheduled Maintenance"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={draft.category}
            onValueChange={(v) => onChange({ category: v as TemplateDraft["category"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="appointment">Appointment</SelectItem>
              <SelectItem value="clinical">Clinical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Target Role <span className="text-muted-foreground">(optional)</span></Label>
          <Select
            value={draft.target_role ?? "any"}
            onValueChange={(v) => onChange({ target_role: v === "any" ? null : (v as TemplateDraft["target_role"]) })}
          >
            <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All roles</SelectItem>
              <SelectItem value="patient">Patients</SelectItem>
              <SelectItem value="professional">Professionals</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Action URL <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            value={draft.action_url ?? ""}
            onChange={(e) => onChange({ action_url: e.target.value })}
            placeholder="/professional/encounters"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notification Title</Label>
        <Input
          value={draft.title_template}
          onChange={(e) => onChange({ title_template: e.target.value })}
          placeholder="System maintenance on {{date}}"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Message Body</Label>
        <Textarea
          value={draft.body_template}
          onChange={(e) => onChange({ body_template: e.target.value })}
          placeholder="Platform will be offline from {{start_time}} to {{end_time}} UTC."
          className="min-h-24"
        />
        <p className="text-[11px] text-muted-foreground">
          Use <code className="rounded bg-muted px-1">{"{{placeholder}}"}</code> for values you'll fill in before sending.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Internal Description <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          value={draft.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Use when announcing a maintenance window"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={draft.is_active}
          onCheckedChange={(checked) => onChange({ is_active: checked })}
          id="tpl-active"
        />
        <Label htmlFor="tpl-active" className="cursor-pointer">Active (available in broadcast composer)</Label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={onSave} disabled={saving} className="flex-1 sm:flex-none">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : saveLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
