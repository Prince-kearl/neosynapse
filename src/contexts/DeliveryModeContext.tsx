import { createContext, useContext, ReactNode, useState, useCallback } from "react";

export type DeliveryMode = "delivery" | "pickup";

const STORAGE_KEY = "chowpoint_delivery_mode";

interface DeliveryModeContextType {
  mode: DeliveryMode;
  setMode: (mode: DeliveryMode) => void;
  isDelivery: boolean;
  isPickup: boolean;
}

const DeliveryModeContext = createContext<DeliveryModeContextType | undefined>(undefined);

export function DeliveryModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DeliveryMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "delivery" || saved === "pickup") {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return "delivery";
  });

  const setMode = useCallback((newMode: DeliveryMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <DeliveryModeContext.Provider
      value={{
        mode,
        setMode,
        isDelivery: mode === "delivery",
        isPickup: mode === "pickup",
      }}
    >
      {children}
    </DeliveryModeContext.Provider>
  );
}

export function useDeliveryMode() {
  const context = useContext(DeliveryModeContext);
  if (context === undefined) {
    throw new Error("useDeliveryMode must be used within a DeliveryModeProvider");
  }
  return context;
}
