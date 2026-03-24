import { useEffect, useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const locations = [
  "Achimota", "East Legon", "Osu", "Labone", "Cantonments",
  "Airport City", "Madina", "Tema", "Spintex", "Dansoman",
];

interface LocationSelectorProps {
  selectedLocation?: string;
  radius?: number;
  onLocationChange?: (location: string) => void;
  onRadiusChange?: (radius: number) => void;
}

export function LocationSelector({
  selectedLocation = "Achimota",
  radius = 10,
  onLocationChange,
  onRadiusChange,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(selectedLocation);
  const [filter, setFilter] = useState("");

  const visibleLocations = locations.filter((loc) =>
    loc.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    setSelected(selectedLocation);
  }, [selectedLocation]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-3 py-2 rounded-lg border border-muted/20 bg-card hover:border-primary/50"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm truncate">{selected}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] p-3 bg-card/95 backdrop-blur-sm border border-border/20 shadow-lg"
        align="start"
      >
        <div className="space-y-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search delivery area..."
            className="w-full rounded-xl border border-primary/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <div className="rounded-lg bg-rose-100/90 p-2 text-xs text-rose-700 border border-rose-200">
            <span className="font-medium">GPS access denied.</span> Select location manually or enable GPS in settings.
          </div>

          <button
            onClick={() => {
              const value = "Use current location";
              setSelected(value);
              onLocationChange?.(value);
              setOpen(false);
            }}
            className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <span className="inline-flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Use current location
            </span>
          </button>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm font-medium text-foreground">
              <span>Delivery radius</span>
              <span className="text-primary">{radius} km</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              value={radius}
              onChange={(e) => {
                const value = Number(e.target.value);
                onRadiusChange?.(value);
              }}
              className="w-full h-2 rounded-lg bg-muted/40 accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 km</span>
              <span>25 km</span>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-xl border border-border/30 bg-white/80 p-1 dark:bg-slate-900/70">
            {(visibleLocations.length > 0 ? visibleLocations : ["No matches found"]).map((loc) => (
              <button
                key={loc}
                onClick={() => {
              setSelected(loc);
              onLocationChange?.(loc);
              setOpen(false);
            }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  selected === loc
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
