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
  onUseCurrentLocation?: () => void;
  locationError?: string | null;
  isLocating?: boolean;
  variant?: "default" | "mobile-header";
}

export function LocationSelector({
  selectedLocation = "Achimota",
  radius = 10,
  onLocationChange,
  onRadiusChange,
  onUseCurrentLocation,
  locationError,
  isLocating,
  variant = "default",
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
          className={cn(
            "gap-1.5 px-3 py-2 rounded-lg border border-muted/20 bg-card hover:border-primary/50",
            variant === "mobile-header" &&
              "h-10 gap-2 rounded-full border-emerald-400/25 bg-[#262628] px-2.5 text-white hover:bg-[#2f2f31] hover:border-emerald-300/35"
          )}
        >
          {variant === "mobile-header" ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            </span>
          ) : (
            <MapPin className="w-4 h-4 text-primary" />
          )}
          <span className={cn("font-medium text-sm truncate", variant === "mobile-header" && "text-white")}>{selected}</span>
          <ChevronDown className={cn("w-3 h-3 text-muted-foreground", variant === "mobile-header" && "text-zinc-400")} />
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

          {locationError && (
            <div className="rounded-lg bg-rose-100/90 p-2 text-xs text-rose-700 border border-rose-200">
              <span className="font-medium">{locationError}</span>
            </div>
          )}

          <button
            onClick={() => {
              if (onUseCurrentLocation) onUseCurrentLocation();
              setOpen(false);
            }}
            className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
            disabled={isLocating}
          >
            <span className="inline-flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {isLocating ? "Detecting location..." : "Use current location"}
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
