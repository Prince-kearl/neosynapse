import { useState } from "react";
import { Bot, SlidersHorizontal, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FilterChips } from "@/components/FilterChips";

const services = [
  { id: "general", name: "General Medicine", icon: "🏥" },
  { id: "cardiology", name: "Cardiology", icon: "❤️" },
  { id: "dermatology", name: "Dermatology", icon: "🧴" },
  { id: "orthopedics", name: "Orthopedics", icon: "🦴" },
  { id: "neurology", name: "Neurology", icon: "🧠" },
  { id: "pediatrics", name: "Pediatrics", icon: "👶" },
  { id: "ophthalmology", name: "Ophthalmology", icon: "👁️" },
  { id: "dental", name: "Dental", icon: "🦷" },
  { id: "mental-health", name: "Mental Health", icon: "🧘" },
  { id: "nutrition", name: "Nutrition", icon: "🥗" },
];

const Explore = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
            AI Health Assistant
          </h1>
          <p className="text-muted-foreground">
            Ask questions, find specialists, or explore health services
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Describe your symptoms or ask a health question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-card border-border"
            />
          </div>
          <Button className="h-12 px-5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="mb-6">
          <FilterChips 
            selectedFilters={selectedFilters}
            onFilterChange={setSelectedFilters}
          />
        </div>

        {/* Specialties */}
        <div className="sticky top-0 z-20 bg-background py-4 -mx-4 px-4 lg:-mx-6 lg:px-6 border-b border-border/50 mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Medical Specialties
          </h2>
          <div className="overflow-x-auto -mx-4 px-4 lg:-mx-6 lg:px-6 pb-2 scrollbar-thin">
            <div className="flex gap-2 min-w-max">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedCategory(
                    selectedCategory === service.id ? null : service.id
                  )}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 whitespace-nowrap",
                    "hover:shadow-sm active:scale-[0.98]",
                    selectedCategory === service.id
                      ? "border-primary bg-primary/10 text-primary glow-green"
                      : "border-border bg-card text-foreground hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-lg">{service.icon}</span>
                  <span className="text-sm font-medium">{service.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="bg-card rounded-2xl p-8 lg:p-12 shadow-food-card text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            AI Health Assistant
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Describe your symptoms or ask a health question to get AI-powered guidance and specialist recommendations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Explore;
