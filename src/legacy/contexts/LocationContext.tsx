import { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { useGeolocation, GeoLocation, ghanaAreas } from "@/hooks/useGeolocation";

const RADIUS_STORAGE_KEY = "chowpoint_delivery_radius";
const DEFAULT_RADIUS = 10; // km

interface LocationContextType {
  location: GeoLocation | null;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  detectLocation: () => void;
  setManualLocation: (location: GeoLocation) => void;
  ghanaAreas: typeof ghanaAreas;
  deliveryRadius: number;
  setDeliveryRadius: (radius: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const geolocation = useGeolocation();
  
  const [deliveryRadius, setDeliveryRadiusState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(RADIUS_STORAGE_KEY);
      if (saved) {
        return parseInt(saved, 10);
      }
    } catch {
      // Ignore parsing errors
    }
    return DEFAULT_RADIUS;
  });

  const setDeliveryRadius = useCallback((radius: number) => {
    setDeliveryRadiusState(radius);
    try {
      localStorage.setItem(RADIUS_STORAGE_KEY, radius.toString());
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <LocationContext.Provider value={{ 
      ...geolocation, 
      ghanaAreas, 
      deliveryRadius, 
      setDeliveryRadius 
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
