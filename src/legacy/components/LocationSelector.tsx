import { useState } from "react";
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

export function LocationSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("Achimota");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{selected}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => { setSelected(loc); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                selected === loc
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {loc}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
