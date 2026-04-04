import { Button } from "@/components/ui/button";

interface EncounterFilterBannerProps {
  encounterId: string;
  onClear: () => void;
}

export function EncounterFilterBanner({ encounterId, onClear }: EncounterFilterBannerProps) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Filtered by encounter: <span className="font-mono text-foreground">{encounterId}</span>
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear Filter
      </Button>
    </div>
  );
}