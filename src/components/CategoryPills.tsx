import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  emoji: string;
}

const categories: Category[] = [
  { id: "waakye", name: "Waakye", emoji: "🫘" },
  { id: "rice", name: "Rice Meals", emoji: "🍚" },
  { id: "chop-bar", name: "Chop Bar", emoji: "🍗" },
  { id: "fast-food", name: "Fast Food", emoji: "🍔" },
  { id: "healthy", name: "Healthy", emoji: "🥗" },
  { id: "breakfast", name: "Breakfast", emoji: "☕" },
  { id: "seafood", name: "Seafood", emoji: "🐟" },
  { id: "snacks", name: "Snacks", emoji: "🍪" },
];

interface CategoryPillsProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryPills({ selectedCategory, onSelectCategory }: CategoryPillsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {categories.map((category) => {
        const isActive = selectedCategory === category.id;
        
        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(isActive ? null : category.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border transition-all duration-200",
              "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
              isActive
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <span className="text-2xl" role="img" aria-label={category.name}>
              {category.emoji}
            </span>
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
