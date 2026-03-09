import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Utensils } from "lucide-react";

const DIET_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian", description: "No meat or fish" },
  { id: "vegan", label: "Vegan", description: "No animal products" },
  { id: "halal", label: "Halal", description: "Halal certified foods" },
  { id: "gluten-free", label: "Gluten Free", description: "No wheat, barley, or rye" },
  { id: "dairy-free", label: "Dairy Free", description: "No milk products" },
  { id: "nut-free", label: "Nut Free", description: "No nuts or nut products" },
  { id: "spicy", label: "Loves Spicy", description: "Prefer spicy dishes" },
  { id: "low-carb", label: "Low Carb", description: "Reduced carbohydrates" },
];

interface DietPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreferences: string[];
  onSave: (preferences: string[]) => Promise<void>;
}

export function DietPreferencesDialog({ open, onOpenChange, currentPreferences, onSave }: DietPreferencesDialogProps) {
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(currentPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (id: string) => {
    setSelectedPreferences(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedPreferences);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedPreferences(currentPreferences);
    }
    onOpenChange(open);
  };

  const handleClearAll = () => {
    setSelectedPreferences([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Diet Preferences
          </DialogTitle>
          <DialogDescription>
            Select your dietary restrictions and preferences to get personalized meal recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-3 overflow-y-auto flex-1">
          {DIET_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Checkbox
                checked={selectedPreferences.includes(option.id)}
                onCheckedChange={() => handleToggle(option.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleClearAll} disabled={isSaving || selectedPreferences.length === 0}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
