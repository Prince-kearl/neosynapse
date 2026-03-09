import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, RotateCcw } from "lucide-react";

const quickBudgets = [
  { label: "Under GHS 20", value: 20 },
  { label: "Under GHS 30", value: 30 },
  { label: "Under GHS 50", value: 50 },
  { label: "GHS 80+", value: 80 },
];

interface BudgetSelectorProps {
  budget: number;
  onBudgetChange: (budget: number) => void;
  savedBudget?: number;
}

export function BudgetSelector({ budget, onBudgetChange, savedBudget }: BudgetSelectorProps) {
  const [sliderValue, setSliderValue] = useState([budget]);

  const isUsingSavedPreference = savedBudget !== undefined && budget === savedBudget;
  const hasManuallyAdjusted = savedBudget !== undefined && budget !== savedBudget;

  useEffect(() => {
    setSliderValue([budget]);
  }, [budget]);

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    onBudgetChange(value[0]);
  };

  const handleQuickSelect = (value: number) => {
    setSliderValue([value]);
    onBudgetChange(value);
  };

  const handleResetToSaved = () => {
    if (savedBudget !== undefined) {
      setSliderValue([savedBudget]);
      onBudgetChange(savedBudget);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-food-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-foreground">Your Budget</h3>
            {isUsingSavedPreference && (
              <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-0">
                <Sparkles className="w-3 h-3" />
                Your default
              </Badge>
            )}
            {hasManuallyAdjusted && (
              <button
                onClick={handleResetToSaved}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Find meals within your range</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-price">GHS {sliderValue[0]}</span>
          {sliderValue[0] >= 80 && <span className="text-price">+</span>}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-6">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          min={10}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>GHS 10</span>
          <span>GHS 100+</span>
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="flex flex-wrap gap-2">
        {quickBudgets.map((item) => (
          <button
            key={item.value}
            onClick={() => handleQuickSelect(item.value)}
            className={cn(
              "budget-btn",
              sliderValue[0] === item.value && "active"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
