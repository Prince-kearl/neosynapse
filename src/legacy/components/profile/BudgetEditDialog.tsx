import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Wallet } from "lucide-react";

const BUDGET_PRESETS = [20, 30, 50, 75, 100];

interface BudgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: number;
  onSave: (budget: number) => Promise<void>;
}

export function BudgetEditDialog({ open, onOpenChange, currentBudget, onSave }: BudgetEditDialogProps) {
  const [budget, setBudget] = useState(currentBudget);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(budget);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setBudget(currentBudget);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Edit Default Budget
          </DialogTitle>
          <DialogDescription>
            Set your maximum budget per meal. This helps filter meals within your price range.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Current Value Display */}
          <div className="text-center">
            <span className="text-4xl font-bold text-primary">GHS {budget}</span>
            <p className="text-sm text-muted-foreground mt-1">max per meal</p>
          </div>

          {/* Slider */}
          <div className="px-2">
            <Slider
              value={[budget]}
              onValueChange={([value]) => setBudget(value)}
              min={10}
              max={150}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted-foreground">GHS 10</span>
              <span className="text-xs text-muted-foreground">GHS 150</span>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {BUDGET_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={budget === preset ? "default" : "outline"}
                size="sm"
                onClick={() => setBudget(preset)}
                className="min-w-[70px]"
              >
                GHS {preset}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
