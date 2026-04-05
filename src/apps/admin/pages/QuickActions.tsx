import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Plus, Save, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useTouchedFields, useTouchedFieldsById } from "@/shared/hooks/useTouchedFields";

type QuickActionRow = {
  id: string;
  label: string;
  path: string;
  description: string;
  icon: string;
  is_active: boolean;
  display_order: number;
};

type QuickActionValues = {
  label: string;
  path: string;
  description: string;
  icon: string;
};

type FieldName = "label" | "path" | "description" | "icon";
type FieldErrors = Partial<Record<FieldName, string>>;

const iconOptions = ["Mail", "Users", "Building2", "ScrollText", "ShieldCheck", "Activity", "Settings"];
const iconOptionSet = new Set(iconOptions);

const editorQueryKey = ["admin-quick-actions-editor"] as const;
const dashboardQueryKey = ["admin-quick-actions"] as const;

const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, " ");
const normalizePath = (value: string) => value.trim();

const isAdminPath = (value: string) => /^\/admin(\/|$)/.test(value);

const validateQuickAction = (
  values: QuickActionValues,
  existing: QuickActionRow[],
  currentId?: string
) => {
  const errors: FieldErrors = {};
  const label = normalizeLabel(values.label);
  const path = normalizePath(values.path);
  const description = values.description.trim();
  const icon = values.icon;

  if (!label) errors.label = "Label is required";
  if (!path) errors.path = "Path is required";
  if (!description) errors.description = "Description is required";

  if (path && !isAdminPath(path)) {
    errors.path = "Path must start with /admin";
  }

  if (!iconOptionSet.has(icon)) {
    errors.icon = "Selected icon is not allowed";
  }

  const duplicateLabel = existing.find(
    (item) => item.id !== currentId && normalizeLabel(item.label).toLowerCase() === label.toLowerCase()
  );
  if (duplicateLabel) {
    errors.label = "Another quick action already uses this label";
  }

  const duplicatePath = existing.find(
    (item) => item.id !== currentId && normalizePath(item.path).toLowerCase() === path.toLowerCase()
  );
  if (duplicatePath) {
    errors.path = "Another quick action already uses this path";
  }

  return errors;
};

const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;
const firstErrorMessage = (errors: FieldErrors) => Object.values(errors)[0] || "Invalid quick action";

export default function AdminQuickActions() {
  const queryClient = useQueryClient();
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [dragOverActionId, setDragOverActionId] = useState<string | null>(null);
  const [newAction, setNewAction] = useState({
    label: "",
    path: "/admin/",
    description: "",
    icon: "Settings",
    is_active: true,
  });
  const newActionTouched = useTouchedFields<FieldName>();
  const [drafts, setDrafts] = useState<Record<string, Partial<QuickActionRow>>>({});
  const draftTouched = useTouchedFieldsById<string, FieldName>();

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["admin-quick-actions-editor"],
    queryFn: async (): Promise<QuickActionRow[]> => {
      const db = supabase as any;
      const { data, error } = await db
        .from("admin_quick_actions")
        .select("id, label, path, description, icon, is_active, display_order")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const sortedActions = useMemo(
    () => [...actions].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    [actions]
  );

  const newActionErrors = useMemo(
    () => validateQuickAction(newAction, sortedActions),
    [newAction, sortedActions]
  );
  const isNewActionValid = !hasErrors(newActionErrors);

  const normalizeOrder = (items: QuickActionRow[]) =>
    items.map((action, index) => ({
      ...action,
      display_order: index + 1,
    }));

  const invalidateQuickActionQueries = () => {
    queryClient.invalidateQueries({ queryKey: editorQueryKey });
    queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
  };

  const createAction = useMutation({
    mutationFn: async () => {
      const validationErrors = validateQuickAction(newAction, sortedActions);
      if (hasErrors(validationErrors)) {
        throw new Error(firstErrorMessage(validationErrors));
      }

      const label = normalizeLabel(newAction.label);
      const path = normalizePath(newAction.path);
      const description = newAction.description.trim();

      const maxOrder = sortedActions.reduce((max, action) => Math.max(max, action.display_order || 0), 0);
      const db = supabase as any;
      const { error } = await db.from("admin_quick_actions").insert({
        label,
        path,
        description,
        icon: newAction.icon,
        is_active: newAction.is_active,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewAction({ label: "", path: "/admin/", description: "", icon: "Settings", is_active: true });
      newActionTouched.reset();
      invalidateQuickActionQueries();
      toast({ title: "Quick action created" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create quick action", description: error.message, variant: "destructive" });
    },
  });

  const updateAction = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<QuickActionRow> }) => {
      const db = supabase as any;
      const { error } = await db
        .from("admin_quick_actions")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQuickActionQueries();
      toast({ title: "Quick action updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update quick action", description: error.message, variant: "destructive" });
    },
  });

  const deleteAction = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("admin_quick_actions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQuickActionQueries();
      toast({ title: "Quick action deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete quick action", description: error.message, variant: "destructive" });
    },
  });

  const reorderActions = useMutation({
    mutationFn: async (nextActions: QuickActionRow[]) => {
      const db = supabase as any;
      const orderedActions = normalizeOrder(nextActions);
      const updates = orderedActions.map((action) =>
        db
          .from("admin_quick_actions")
          .update({ display_order: action.display_order, updated_at: new Date().toISOString() })
          .eq("id", action.id)
      );

      const results = await Promise.all(updates);
      const failed = results.find((result: any) => result.error);
      if (failed?.error) throw failed.error;
      return orderedActions;
    },
    onMutate: async (nextActions: QuickActionRow[]) => {
      const orderedActions = normalizeOrder(nextActions);

      await queryClient.cancelQueries({ queryKey: editorQueryKey });
      await queryClient.cancelQueries({ queryKey: dashboardQueryKey });

      const previousEditorActions = queryClient.getQueryData<QuickActionRow[]>(editorQueryKey);
      const previousDashboardActions = queryClient.getQueryData(dashboardQueryKey);

      queryClient.setQueryData<QuickActionRow[]>(editorQueryKey, orderedActions);

      return { previousEditorActions, previousDashboardActions };
    },
    onSuccess: () => {
      setDraggedActionId(null);
      setDragOverActionId(null);
      invalidateQuickActionQueries();
      toast({ title: "Quick actions reordered" });
    },
    onError: (error: any, _nextActions, context) => {
      setDraggedActionId(null);
      setDragOverActionId(null);

       if (context?.previousEditorActions) {
        queryClient.setQueryData(editorQueryKey, context.previousEditorActions);
      }

      if (context?.previousDashboardActions) {
        queryClient.setQueryData(dashboardQueryKey, context.previousDashboardActions);
      }

      toast({ title: "Failed to reorder quick actions", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      invalidateQuickActionQueries();
    },
  });

  const reorderList = (fromId: string, toId: string) => {
    if (fromId === toId) return null;

    const currentIndex = sortedActions.findIndex((action) => action.id === fromId);
    const targetIndex = sortedActions.findIndex((action) => action.id === toId);
    if (currentIndex < 0 || targetIndex < 0) return null;

    const nextActions = [...sortedActions];
    const [moved] = nextActions.splice(currentIndex, 1);
    nextActions.splice(targetIndex, 0, moved);
    return nextActions;
  };

  const moveAction = async (id: string, direction: "up" | "down") => {
    const idx = sortedActions.findIndex((action) => action.id === id);
    if (idx < 0) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedActions.length) return;

    const current = sortedActions[idx];
    const target = sortedActions[targetIdx];

    const nextActions = [...sortedActions];
    nextActions[idx] = target;
    nextActions[targetIdx] = current;
    await reorderActions.mutateAsync(nextActions);
  };

  const saveAction = (action: QuickActionRow) => {
    const draft = drafts[action.id] || {};
    const merged = {
      label: draft.label ?? action.label,
      path: draft.path ?? action.path,
      description: draft.description ?? action.description,
      icon: draft.icon ?? action.icon,
      is_active: draft.is_active ?? action.is_active,
    };

    const validationErrors = validateQuickAction(merged, sortedActions, action.id);
    if (hasErrors(validationErrors)) {
      toast({ title: "Invalid quick action", description: firstErrorMessage(validationErrors), variant: "destructive" });
      return;
    }

    updateAction.mutate({
      id: action.id,
      patch: {
        ...draft,
        label: normalizeLabel(merged.label),
        path: normalizePath(merged.path),
        description: merged.description.trim(),
      },
    });
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Quick Actions</h1>
          <p className="text-muted-foreground">Configure the Admin Dashboard action tiles from inside the app.</p>
        </div>

        <section className="bg-card rounded-2xl p-5 border border-border space-y-4">
          <h2 className="font-display text-lg font-semibold">Add Quick Action</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={newAction.label}
                onChange={(e) => {
                  setNewAction((prev) => ({ ...prev, label: e.target.value }));
                  newActionTouched.touch("label");
                }}
                onBlur={() => newActionTouched.touch("label")}
                placeholder="Manage Users"
                aria-invalid={newActionTouched.isTouched("label") && !!newActionErrors.label}
              />
              {newActionTouched.isTouched("label") && newActionErrors.label && <p className="text-xs text-destructive">{newActionErrors.label}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Path</Label>
              <Input
                value={newAction.path}
                onChange={(e) => {
                  setNewAction((prev) => ({ ...prev, path: e.target.value }));
                  newActionTouched.touch("path");
                }}
                onBlur={() => newActionTouched.touch("path")}
                placeholder="/admin/users"
                aria-invalid={newActionTouched.isTouched("path") && !!newActionErrors.path}
              />
              {newActionTouched.isTouched("path") && newActionErrors.path && <p className="text-xs text-destructive">{newActionErrors.path}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={newAction.description}
                onChange={(e) => {
                  setNewAction((prev) => ({ ...prev, description: e.target.value }));
                  newActionTouched.touch("description");
                }}
                onBlur={() => newActionTouched.touch("description")}
                placeholder="View all accounts"
                aria-invalid={newActionTouched.isTouched("description") && !!newActionErrors.description}
              />
              {newActionTouched.isTouched("description") && newActionErrors.description && <p className="text-xs text-destructive">{newActionErrors.description}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select
                value={newAction.icon}
                onValueChange={(value) => {
                  setNewAction((prev) => ({ ...prev, icon: value }));
                  newActionTouched.touch("icon");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newActionTouched.isTouched("icon") && newActionErrors.icon && <p className="text-xs text-destructive">{newActionErrors.icon}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Active</Label>
              <div className="h-10 flex items-center">
                <Switch
                  checked={newAction.is_active}
                  onCheckedChange={(checked) => setNewAction((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
          </div>

          <Button onClick={() => createAction.mutate()} disabled={createAction.isPending || !isNewActionValid}>
            {createAction.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Quick Action
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Existing Quick Actions</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedActions.length > 0 ? (
            <div className="space-y-3">
              {sortedActions.map((action, idx) => {
                const draft = drafts[action.id] || {};
                const merged = {
                  label: draft.label ?? action.label,
                  path: draft.path ?? action.path,
                  description: draft.description ?? action.description,
                  icon: draft.icon ?? action.icon,
                  is_active: draft.is_active ?? action.is_active,
                };
                const rowErrors = validateQuickAction(merged, sortedActions, action.id);
                const hasDraft = !!drafts[action.id];
                const touched = draftTouched.getTouched(action.id);

                return (
                  <div
                    key={action.id}
                    onDragOver={(e) => {
                      if (!draggedActionId || draggedActionId === action.id) return;
                      e.preventDefault();
                    }}
                    onDragEnter={() => {
                      if (draggedActionId && draggedActionId !== action.id) {
                        setDragOverActionId(action.id);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedActionId) return;

                      const nextActions = reorderList(draggedActionId, action.id);
                      if (!nextActions) {
                        setDraggedActionId(null);
                        setDragOverActionId(null);
                        return;
                      }

                      reorderActions.mutate(nextActions);
                    }}
                    onDragEnd={() => {
                      setDraggedActionId(null);
                      setDragOverActionId(null);
                    }}
                    className={[
                      "bg-card rounded-2xl p-4 border space-y-3 transition-colors",
                      dragOverActionId === action.id ? "border-primary bg-primary/5" : "border-border",
                      draggedActionId === action.id ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                          type="button"
                          draggable={!reorderActions.isPending}
                          onDragStart={(e) => {
                            setDraggedActionId(action.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", action.id);
                          }}
                          className="cursor-grab rounded-md border border-border p-1 hover:bg-muted active:cursor-grabbing"
                          aria-label={`Drag to reorder ${action.label}`}
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <Settings className="w-4 h-4" />
                        <span>Order #{action.display_order}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveAction(action.id, "up")}
                          disabled={idx === 0 || updateAction.isPending || reorderActions.isPending}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveAction(action.id, "down")}
                          disabled={idx === sortedActions.length - 1 || updateAction.isPending || reorderActions.isPending}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAction.mutate(action.id)}
                          disabled={deleteAction.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="space-y-1.5">
                        <Label>Label</Label>
                        <Input
                          value={merged.label}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [action.id]: { ...prev[action.id], label: e.target.value } }))
                          }
                          onBlur={() => draftTouched.touch(action.id, "label")}
                          aria-invalid={!!touched.label && !!rowErrors.label}
                        />
                        {touched.label && rowErrors.label && <p className="text-xs text-destructive">{rowErrors.label}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Path</Label>
                        <Input
                          value={merged.path}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [action.id]: { ...prev[action.id], path: e.target.value } }))
                          }
                          onBlur={() => draftTouched.touch(action.id, "path")}
                          aria-invalid={!!touched.path && !!rowErrors.path}
                        />
                        {touched.path && rowErrors.path && <p className="text-xs text-destructive">{rowErrors.path}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Input
                          value={merged.description}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [action.id]: { ...prev[action.id], description: e.target.value } }))
                          }
                          onBlur={() => draftTouched.touch(action.id, "description")}
                          aria-invalid={!!touched.description && !!rowErrors.description}
                        />
                        {touched.description && rowErrors.description && <p className="text-xs text-destructive">{rowErrors.description}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Icon</Label>
                        <Select
                          value={merged.icon}
                          onValueChange={(value) => {
                            setDrafts((prev) => ({ ...prev, [action.id]: { ...prev[action.id], icon: value } }));
                            draftTouched.touch(action.id, "icon");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map((icon) => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {touched.icon && rowErrors.icon && <p className="text-xs text-destructive">{rowErrors.icon}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Active</Label>
                        <div className="h-10 flex items-center">
                          <Switch
                            checked={merged.is_active}
                            onCheckedChange={(checked) =>
                              setDrafts((prev) => ({ ...prev, [action.id]: { ...prev[action.id], is_active: checked } }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => saveAction(action)}
                        disabled={updateAction.isPending || !hasDraft || hasErrors(rowErrors)}
                      >
                        {updateAction.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyStateCard icon={Settings} title="No quick actions configured" compact />
          )}
        </section>
      </div>
    </div>
  );
}