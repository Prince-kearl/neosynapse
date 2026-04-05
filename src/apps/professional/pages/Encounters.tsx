import { ClipboardList, Clock, Video, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProfessionalEncounters, useProfileNames } from "@/shared/hooks/useHealthcare";
import { EncounterFilterBanner } from "@/apps/professional/components/EncounterFilterBanner";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

const statusConfig: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ProfessionalEncounters() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: encounters = [], isLoading } = useProfessionalEncounters();
  const encounterFilterId = searchParams.get("encounterId")?.trim() || null;

  const filteredEncounters = encounterFilterId
    ? encounters.filter((e: any) => e.id === encounterFilterId)
    : encounters;

  const patientIds = filteredEncounters.map((e: any) => e.patient_id);
  const { data: nameMap = {} } = useProfileNames(patientIds);

  const activeEncounters = filteredEncounters.filter((e: any) => ["pending", "in_progress"].includes(e.status));
  const completedEncounters = filteredEncounters.filter((e: any) => ["completed", "cancelled"].includes(e.status));
  const defaultTab = encounterFilterId && completedEncounters.length > 0 && activeEncounters.length === 0 ? "completed" : "active";

  const EncounterCard = ({ enc, isActive }: { enc: any; isActive: boolean }) => (
    <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${isActive ? "bg-primary/10" : "bg-muted"} flex items-center justify-center ${isActive ? "text-primary" : "text-muted-foreground"} font-semibold`}>
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
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Badge className={`whitespace-nowrap ${statusConfig[enc.status] || statusConfig.pending}`}>
            {enc.status.replace("_", " ")}
          </Badge>
          {isActive && enc.encounter_type === "telemedicine" && (
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
          <TabsList className="bg-muted">
            <TabsTrigger value="active" className="gap-2">
              <Clock className="w-4 h-4" />
              Active ({activeEncounters.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <FileText className="w-4 h-4" />
              Completed ({completedEncounters.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeEncounters.length > 0 ? (
              activeEncounters.map((enc: any) => (
                <EncounterCard key={enc.id} enc={enc} isActive />
              ))
            ) : (
              <EmptyStateCard icon={ClipboardList} title="No active encounters" compact />
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : completedEncounters.length > 0 ? (
              completedEncounters.map((enc: any) => (
                <EncounterCard key={enc.id} enc={enc} isActive={false} />
              ))
            ) : (
              <EmptyStateCard icon={ClipboardList} title="No completed encounters" compact />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
