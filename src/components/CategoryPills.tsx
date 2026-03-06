import { cn } from "@/lib/utils";
import {
  Stethoscope,
  Bot,
  CalendarCheck,
  Video,
  FileText,
  Hospital,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
}

const categories: Category[] = [
  { id: "symptom-checker", name: "Symptom Checker", icon: Stethoscope },
  { id: "ai-assistant", name: "AI Health Assistant", icon: Bot },
  { id: "consultation", name: "Book Consultation", icon: CalendarCheck },
  { id: "telemedicine", name: "Telemedicine", icon: Video },
  { id: "reports", name: "Medical Reports", icon: FileText },
  { id: "hospitals", name: "Nearby Hospitals", icon: Hospital },
];

interface CategoryPillsProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryPills({ selectedCategory, onSelectCategory }: CategoryPillsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
      {categories.map((category) => {
        const isActive = selectedCategory === category.id;
        const Icon = category.icon;

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(isActive ? null : category.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border transition-all duration-200",
              "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
              isActive
                ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20 glow-green"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              isActive ? "bg-primary/20" : "bg-muted"
            )}>
              <Icon className={cn(
                "w-4 h-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <span className={cn(
              "text-sm font-medium truncate",
              isActive ? "text-primary" : "text-foreground"
            )}>
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
