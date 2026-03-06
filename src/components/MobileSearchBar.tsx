import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MobileSearchBar({ 
  value, 
  onChange, 
  placeholder = "Search meals, restaurants & cuisines..." 
}: MobileSearchBarProps) {
  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 pl-4 pr-12 rounded-2xl bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary text-base"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
        <Search className="w-4 h-4 text-primary" />
      </div>
    </div>
  );
}
