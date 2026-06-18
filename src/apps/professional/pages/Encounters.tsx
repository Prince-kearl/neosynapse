import { ClipboardList, Clock, Video, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProfessionalEncounters, useProfessionalNotes, useProfileNames } from "@/shared/hooks/useHealthcare";
import { EncounterFilterBanner } from "@/apps/professional/components/EncounterFilterBanner";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import {
  SESSION_STATE_META,
  compareSessionState,
  getSessionStateMeta,
  isActiveSessionState,
  normalizeSessionState,
  type SessionState,
} from "@/shared/lib/sessionStates";
import { cn } from "@/lib/utils";

const stateTabs: Array<{ value: "all" | SessionState; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: SESSION_STATE_META.pending.label },
  { value: "in_progress", label: SESSION_STATE_META.in_progress.label },
  { value: "completed", label: SESSION_STATE_META.completed.label },
  { value: "cancelled", label: SESSION_STATE_META.cancelled.label },
];

export default function ProfessionalEncounters() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: encounters = [], isLoading } = useProfessionalEncounters();
  const { data: notes = [] } = useProfessionalNotes();
  const encounterFilterId = searchParams.get("encounterId")?.trim() || null;

  const filteredEncounters = encounterFilterId
    ? encounters.filter((e: any) => e.id === encounterFilterId)
    : encounters;

  const sortedEncounters = [...filteredEncounters].sort((a: any, b: any) => {
    const stateOrder = compareSessionState(a.status, b.status);
    if (stateOrder !== 0) return stateOrder;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const patientIds = sortedEncounters.map((e: any) => e.patient_id);
  const { data: nameMap = {} } = useProfileNames(patientIds);

  const stateCounts = sortedEncounters.reduce<Record<string, number>>(
    (acc, enc: any) => {
      const state = normalizeSessionState(enc.status);
      acc.all += 1;
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    },
    { all: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0, unknown: 0 },
  );

  const defaultTab =
    encounterFilterId && sortedEncounters.length === 1
      ? normalizeSessionState(sortedEncounters[0].status)
      : "all";

  const noteCountByEncounter = notes.reduce<Record<string, number>>((acc: Record<string, number>, note: any) => {
    acc[note.encounter_id] = (acc[note.encounter_id] || 0) + 1;
    return acc;
  }, {});

  const renderStateContent = (state: "all" | SessionState) => {
    const list = state === "all"
      ? sortedEncounters
      : sortedEncounters.filter((enc: any) => normalizeSessionState(enc.status) === state);

    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (list.length === 0) {
      const title = state === "all" ? "No encounters" : `No ${stateTabs.find((tab) => tab.value === state)?.label.toLowerCase()} sessions`;
      return <EmptyStateCard icon={ClipboardList} title={title} compact />;
    }

    return list.map((enc: any) => (
      <EncounterCard key={enc.id} enc={enc} />
    ));
  };

  const EncounterCard = ({ enc }: { enc: any }) => (
    <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-semibold", getSessionStateMeta(enc.status).avatarClassName)}>
            {(nameMap[enc.patient_id] || "P").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{nameMap[enc.patient_id] || "Patient"}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(enc.created_at).toLocaleString("en-GB", { 
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
              })}
              {" • "}{enc.encounter_type === "telemedicine" ? "Video" : "In-person"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
          <Badge variant="outline" className={cn("whitespace-nowrap", getSessionStateMeta(enc.status).badgeClassName)}>
            {getSessionStateMeta(enc.status).label}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => navigate(`/professional/notes?encounterId=${enc.id}`)}
          >
            <FileText className="w-4 h-4 mr-1" />
            Notes{noteCountByEncounter[enc.id] ? ` (${noteCountByEncounter[enc.id]})` : ""}
          </Button>
          {enc.encounter_type === "telemedicine" && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => navigate(`/professional/transcripts?encounterId=${enc.id}`)}
            >
              Transcript
            </Button>
          )}
          {isActiveSessionState(enc.status) && enc.encounter_type === "telemedicine" && (
            <Button size="sm" className="shrink-0" onClick={() => navigate(`/professional/telemedicine?encounterId=${enc.id}`)}>
              <Video className="w-4 h-4 mr-1" /> Join
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Encounters</h1>
          <p className="text-muted-foreground">Manage patient consultations and encounters</p>
        </div>

        {encounterFilterId && (
          <EncounterFilterBanner
            encounterId={encounterFilterId}
            onClear={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("encounterId");
              setSearchParams(next, { replace: true });
            }}
          />
        )}

        <Tabs defaultValue={defaultTab}>
          <TabsList className="h-auto flex-wrap justify-start bg-muted">
            {stateTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                {tab.value === "all" ? <ClipboardList className="w-4 h-4" /> : SESSION_STATE_META[tab.value].isTerminal ? <FileText className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {tab.label} ({stateCounts[tab.value] || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          {stateTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-4">
              {renderStateContent(tab.value)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
