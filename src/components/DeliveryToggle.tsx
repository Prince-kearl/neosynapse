import { cn } from "@/lib/utils";
import { useDeliveryMode } from "@/contexts/DeliveryModeContext";

export function DeliveryToggle() {
  const { mode, setMode } = useDeliveryMode();

  return (
    <div className="relative flex items-center bg-muted rounded-full p-1 h-10">
      {/* Sliding background indicator */}
      <div
        className={cn(
          "absolute h-8 rounded-full bg-primary transition-all duration-300 ease-out",
          mode === "delivery" ? "left-1 w-[calc(50%-2px)]" : "left-[50%] w-[calc(50%-2px)]"
        )}
      />
      
      {/* Delivery button */}
      <button
        onClick={() => setMode("delivery")}
        className={cn(
          "relative z-10 flex-1 h-8 px-4 rounded-full text-sm font-medium transition-colors duration-200",
          mode === "delivery"
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Delivery
      </button>
      
      {/* Pickup button */}
      <button
        onClick={() => setMode("pickup")}
        className={cn(
          "relative z-10 flex-1 h-8 px-4 rounded-full text-sm font-medium transition-colors duration-200",
          mode === "pickup"
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Pickup
      </button>
    </div>
  );
}
