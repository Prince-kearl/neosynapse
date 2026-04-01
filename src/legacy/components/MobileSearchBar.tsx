import { Bot } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MobileSearchBar({ 
  value, 
  onChange, 
  placeholder = "Ask Neo Synapse or enter symptoms..." 
}: MobileSearchBarProps) {
  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border-border bg-card pl-4 pr-12 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary max-[380px]:h-10 max-[380px]:rounded-xl max-[380px]:pl-3.5 max-[380px]:pr-10 max-[380px]:text-sm"
      />
      <div className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-primary/10 max-[380px]:right-2.5 max-[380px]:h-7 max-[380px]:w-7 max-[380px]:rounded-lg">
        <Bot className="h-4 w-4 text-primary max-[380px]:h-3.5 max-[380px]:w-3.5" />
      </div>
    </div>
  );
}
