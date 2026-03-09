import { Bot, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick?: () => void;
}

export function SearchBar({ value, onChange, onFilterClick }: SearchBarProps) {
  return (
    <div className="flex gap-3 w-full max-w-2xl">
      <div className="relative flex-1">
        <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Ask Neo Synapse about your health..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-12 h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
        />
      </div>
      <Button
        onClick={onFilterClick}
        className="h-12 px-5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="hidden sm:inline">Filter</span>
      </Button>
    </div>
  );
}
