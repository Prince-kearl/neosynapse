import { Button } from "@/components/ui/button";

interface EncounterFilterBannerProps {
  encounterId: string;
  onClear: () => void;
}

export function EncounterFilterBanner({ encounterId, onClear }: EncounterFilterBannerProps) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="break-all text-sm text-muted-foreground sm:break-normal">
        Filtered by encounter: <span className="font-mono text-foreground">{encounterId}</span>
      </p>
      <Button variant="outline" size="sm" onClick={onClear} className="w-full sm:w-auto">
        Clear Filter
      </Button>
    </div>
  );
}
