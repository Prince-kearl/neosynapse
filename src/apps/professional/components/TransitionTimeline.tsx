import { Clock3 } from "lucide-react";

interface TransitionEvent {
  id: string;
  action: string;
  created_at: string;
  entity_type: string;
  metadata?: Record<string, unknown> | null;
}

interface TransitionTimelineProps {
  title?: string;
  events: TransitionEvent[];
  emptyLabel?: string;
}

const actionLabelMap: Record<string, string> = {
  transcript_to_note_draft_created: "Transcript converted to draft note",
  transcript_to_note_draft_updated: "Transcript refreshed draft note",
  clinical_note_saved_draft: "Note saved as draft",
  clinical_note_submitted_for_review: "Note submitted for review",
  clinical_note_finalized: "Note finalized",
  medical_report_created_from_note: "Report created from note",
  medical_report_updated_from_note: "Report updated from note",
  medical_report_saved_draft: "Report saved as draft",
  medical_report_submitted_for_review: "Report submitted for review",
  medical_report_finalized: "Report finalized",
};

export function TransitionTimeline({
  title = "Transition Timeline",
  events,
  emptyLabel = "No transition events yet.",
}: TransitionTimelineProps) {
  const ordered = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>

      {ordered.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {ordered.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">{actionLabelMap[event.action] || event.action}</p>
                <p className="text-xs text-muted-foreground">{event.entity_type}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Clock3 className="w-3 h-3" />
                {new Date(event.created_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}