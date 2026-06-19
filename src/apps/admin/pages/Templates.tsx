import { useMemo, useState } from "react";
import { FileCode, FileText, Loader2, Save, ScrollText, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { getReportSourceLabel, getReportTitle } from "@/shared/lib/reports";
import { MetricCard } from "@/components/common/MetricCard";
import { toast } from "@/hooks/use-toast";

type TemplateRow = {
  id: string;
  name: string;
  category: "document" | "report";
  template_type: string;
  description: string | null;
  content: string;
  is_active: boolean;
  is_default: boolean;
  version: number;
};

type TemplateDraft = {
  name: string;
  category: "document" | "report";
  template_type: string;
  description: string;
  content: string;
  is_active: boolean;
  is_default: boolean;
};

const templateTypeOptions = [
  { value: "clinical_note", label: "Clinical Note" },
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "referral_letter", label: "Referral Letter" },
  { value: "prescription", label: "Prescription" },
  { value: "consultation_report", label: "Consultation Report" },
  { value: "follow_up_report", label: "Follow-up Report" },
  { value: "lab_report", label: "Lab Report" },
  { value: "radiology_report", label: "Radiology Report" },
];

const toTitle = (value: string) => value.replace(/_/g, " ");

const templateActionButtonClass =
  "h-10 w-full justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-medium hover:bg-muted/70 sm:h-9 sm:w-auto sm:border-border sm:bg-transparent";

export default function AdminTemplates() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Partial<TemplateDraft>>>({});
  const [newTemplate, setNewTemplate] = useState<TemplateDraft>({
    name: "",
    category: "document",
    template_type: "clinical_note",
    description: "",
    content: "",
    is_active: true,
    is_default: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-template-overview"],
    queryFn: async () => {
      const [
        notesCountResult,
        reportsCountResult,
        transcriptsCountResult,
        recentReportsResult,
        recentNotesResult,
      ] = await Promise.all([
        supabase.from("clinical_notes").select("id", { count: "exact", head: true }),
        supabase.from("medical_reports").select("id", { count: "exact", head: true }),
        supabase.from("transcripts").select("id", { count: "exact", head: true }),
        supabase
          .from("medical_reports")
          .select("id, report_type, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("clinical_notes")
          .select("id, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (notesCountResult.error) throw notesCountResult.error;
      if (reportsCountResult.error) throw reportsCountResult.error;
      if (transcriptsCountResult.error) throw transcriptsCountResult.error;
      if (recentReportsResult.error) throw recentReportsResult.error;
      if (recentNotesResult.error) throw recentNotesResult.error;

      return {
        clinicalNotesCount: notesCountResult.count || 0,
        reportsCount: reportsCountResult.count || 0,
        transcriptsCount: transcriptsCountResult.count || 0,
        recentReports: recentReportsResult.data || [],
        recentNotes: recentNotesResult.data || [],
      };
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["admin-document-templates"],
    queryFn: async (): Promise<TemplateRow[]> => {
      const db = supabase as any;
      const { data, error } = await db
        .from("admin_document_templates")
        .select("id, name, category, template_type, description, content, is_active, is_default, version")
        .order("category", { ascending: true })
        .order("template_type", { ascending: true })
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const invalidateTemplates = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-document-templates"] });
  };

  const createTemplate = useMutation({
    mutationFn: async () => {
      const name = newTemplate.name.trim();
      const content = newTemplate.content.trim();
      if (!name || !content) {
        throw new Error("Template name and content are required");
      }

      const db = supabase as any;
      const { error } = await db.from("admin_document_templates").insert({
        name,
        category: newTemplate.category,
        template_type: newTemplate.template_type,
        description: newTemplate.description.trim() || null,
        content,
        is_active: newTemplate.is_active,
        is_default: newTemplate.is_default,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTemplate({
        name: "",
        category: "document",
        template_type: "clinical_note",
        description: "",
        content: "",
        is_active: true,
        is_default: false,
      });
      invalidateTemplates();
      toast({ title: "Template created" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TemplateDraft> }) => {
      const db = supabase as any;
      const payload = {
        ...patch,
        name: patch.name?.trim(),
        description: patch.description?.trim(),
        content: patch.content?.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from("admin_document_templates").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: "Template updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("admin_document_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: "Template deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" });
    },
  });

  const groupedTemplates = useMemo(() => {
    return {
      document: templates.filter((t) => t.category === "document"),
      report: templates.filter((t) => t.category === "report"),
    };
  }, [templates]);

  const stats = [
    { label: "Clinical Notes", value: data?.clinicalNotesCount || 0, icon: FileText },
    { label: "Medical Reports", value: data?.reportsCount || 0, icon: FileCode },
    { label: "Transcripts", value: data?.transcriptsCount || 0, icon: ScrollText },
  ];

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Templates</h1>
          <p className="text-muted-foreground">Live document and report generation overview</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <MetricCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-card rounded-2xl p-5 border border-border">
                <h2 className="font-display text-lg font-semibold mb-3">Recent Medical Reports</h2>
                {(data?.recentReports?.length || 0) > 0 ? (
                  <div className="space-y-2">
                    {data?.recentReports?.map((report: any) => (
                      <div key={report.id} className="rounded-xl border border-border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-sm capitalize">{getReportTitle(report)}</p>
                          <p className="text-xs text-muted-foreground">{getReportSourceLabel(report)} • {report.id.slice(0, 8)}...</p>
                        </div>
                        <span className="text-xs text-muted-foreground sm:whitespace-nowrap">
                          {new Date(report.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard icon={FileCode} title="No medical reports yet" compact />
                )}
              </section>

              <section className="bg-card rounded-2xl p-5 border border-border">
                <h2 className="font-display text-lg font-semibold mb-3">Recent Clinical Notes</h2>
                {(data?.recentNotes?.length || 0) > 0 ? (
                  <div className="space-y-2">
                    {data?.recentNotes?.map((note: any) => (
                      <div key={note.id} className="rounded-xl border border-border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-sm capitalize">{note.status || "draft"}</p>
                          <p className="text-xs text-muted-foreground">{note.id.slice(0, 8)}...</p>
                        </div>
                        <span className="text-xs text-muted-foreground sm:whitespace-nowrap">
                          {new Date(note.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard icon={FileText} title="No clinical notes yet" compact />
                )}
              </section>
            </div>

            <section className="bg-card rounded-2xl p-5 border border-border space-y-4">
              <h2 className="font-display text-lg font-semibold">Create New Template</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Template name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value: "document" | "report") =>
                      setNewTemplate((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={newTemplate.template_type}
                    onValueChange={(value) => setNewTemplate((prev) => ({ ...prev, template_type: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {templateTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short purpose"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Active</Label>
                  <div className="h-10 flex items-center">
                    <Switch
                      checked={newTemplate.is_active}
                      onCheckedChange={(checked) => {
                        if (!checked && newTemplate.is_default) {
                          toast({
                            title: "Default template deactivated",
                            description: "Another active template of this type will automatically become default.",
                          });
                        }
                        setNewTemplate((prev) => ({ ...prev, is_active: checked }));
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Default</Label>
                  <div className="h-10 flex items-center">
                    <Switch
                      checked={newTemplate.is_default}
                      onCheckedChange={(checked) => setNewTemplate((prev) => ({ ...prev, is_default: checked, is_active: checked ? true : prev.is_active }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Template Content</Label>
                <Textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write template body here..."
                  className="min-h-40"
                />
              </div>

              <Button onClick={() => createTemplate.mutate()} disabled={createTemplate.isPending}>
                {createTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Template
              </Button>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Template Library</h2>

              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <EmptyStateCard icon={FileCode} title="No templates configured yet" compact />
              ) : (
                <div className="space-y-6">
                  {(["document", "report"] as const).map((category) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-semibold capitalize">{category} Templates</h3>
                      {(groupedTemplates[category] || []).map((template) => {
                        const draft = drafts[template.id] || {};
                        const merged = {
                          name: draft.name ?? template.name,
                          category: draft.category ?? template.category,
                          template_type: draft.template_type ?? template.template_type,
                          description: draft.description ?? (template.description || ""),
                          content: draft.content ?? template.content,
                          is_active: draft.is_active ?? template.is_active,
                          is_default: draft.is_default ?? template.is_default,
                        };

                        return (
                          <div key={template.id} className="bg-card rounded-2xl p-4 border border-border space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                              <div className="space-y-1.5">
                                <Label>Name</Label>
                                <Input
                                  value={merged.name}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({ ...prev, [template.id]: { ...prev[template.id], name: e.target.value } }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select
                                  value={merged.category}
                                  onValueChange={(value: "document" | "report") =>
                                    setDrafts((prev) => ({ ...prev, [template.id]: { ...prev[template.id], category: value } }))
                                  }
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="document">Document</SelectItem>
                                    <SelectItem value="report">Report</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label>Type</Label>
                                <Select
                                  value={merged.template_type}
                                  onValueChange={(value) =>
                                    setDrafts((prev) => ({ ...prev, [template.id]: { ...prev[template.id], template_type: value } }))
                                  }
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {templateTypeOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label>Description</Label>
                                <Input
                                  value={merged.description}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({ ...prev, [template.id]: { ...prev[template.id], description: e.target.value } }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Active</Label>
                                <div className="h-10 flex items-center gap-2">
                                  <Switch
                                    checked={merged.is_active}
                                    onCheckedChange={(checked) => {
                                      if (!checked && merged.is_default) {
                                        toast({
                                          title: "Default template deactivated",
                                          description: "Another active template of this type will automatically become default.",
                                        });
                                      }
                                      setDrafts((prev) => ({ ...prev, [template.id]: { ...prev[template.id], is_active: checked } }));
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    v{template.version}{template.is_default ? " • default" : ""}
                                  </span>
                                </div>
                                {!merged.is_active && merged.is_default ? (
                                  <p className="text-[11px] text-amber-600">
                                    This default will be replaced by another active template of the same type.
                                  </p>
                                ) : null}
                              </div>
                              <div className="space-y-1.5">
                                <Label>Default</Label>
                                <div className="h-10 flex items-center">
                                  <Switch
                                    checked={merged.is_default}
                                    onCheckedChange={(checked) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [template.id]: {
                                          ...prev[template.id],
                                          is_default: checked,
                                          is_active: checked ? true : merged.is_active,
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label>Content</Label>
                              <Textarea
                                value={merged.content}
                                onChange={(e) =>
                                  setDrafts((prev) => ({ ...prev, [template.id]: { ...prev[template.id], content: e.target.value } }))
                                }
                                className="min-h-36"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:flex-wrap sm:justify-end sm:border-t-0 sm:pt-0">
                              <Button
                                variant="outline"
                                className={`${templateActionButtonClass} text-destructive hover:text-destructive`}
                                onClick={() => deleteTemplate.mutate(template.id)}
                                disabled={deleteTemplate.isPending}
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </Button>
                              <Button
                                className={templateActionButtonClass}
                                onClick={() => updateTemplate.mutate({ id: template.id, patch: drafts[template.id] || {} })}
                                disabled={updateTemplate.isPending || !drafts[template.id]}
                              >
                                <Save className="w-4 h-4" /> Save
                              </Button>
                            </div>

                            <p className="text-xs text-muted-foreground capitalize">
                              Type: {toTitle(template.template_type)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
