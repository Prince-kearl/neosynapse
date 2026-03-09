import { useState, useEffect, useCallback } from "react";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  isDetected: boolean;
}

interface UseGeolocationReturn {
  location: GeoLocation | null;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  detectLocation: () => void;
  setManualLocation: (location: GeoLocation) => void;
}

// Ghana areas with approximate coordinates for reverse geocoding simulation
const ghanaAreas = [
  { id: "1", name: "Osu, Accra", short: "Osu, Accra", lat: 5.5560, lng: -0.1869 },
  { id: "2", name: "Cantonments, Accra", short: "Cantonments", lat: 5.5700, lng: -0.1750 },
  { id: "3", name: "East Legon, Accra", short: "East Legon", lat: 5.6350, lng: -0.1580 },
  { id: "4", name: "Labone, Accra", short: "Labone", lat: 5.5620, lng: -0.1720 },
  { id: "5", name: "Airport Residential", short: "Airport Res.", lat: 5.6050, lng: -0.1720 },
  { id: "6", name: "Tema, Greater Accra", short: "Tema", lat: 5.6698, lng: -0.0166 },
  { id: "7", name: "Madina, Accra", short: "Madina", lat: 5.6700, lng: -0.1660 },
  { id: "8", name: "Dansoman, Accra", short: "Dansoman", lat: 5.5280, lng: -0.2560 },
  { id: "9", name: "Achimota, Accra", short: "Achimota", lat: 5.6150, lng: -0.2280 },
  { id: "10", name: "Spintex, Accra", short: "Spintex", lat: 5.6350, lng: -0.0780 },
];

// Calculate distance between two coordinates in kilometers (Haversine formula)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the nearest known area based on coordinates
function findNearestArea(lat: number, lng: number): string {
  let minDistance = Infinity;
  let nearestArea = ghanaAreas[0];

  for (const area of ghanaAreas) {
    const distance = Math.sqrt(
      Math.pow(lat - area.lat, 2) + Math.pow(lng - area.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestArea = area;
    }
  }

  return nearestArea.name;
}

const STORAGE_KEY = "chowpoint_saved_location";

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeoLocation | null>(() => {
    // Try to restore saved location from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const address = findNearestArea(latitude, longitude);
        
        const newLocation: GeoLocation = {
          latitude,
          longitude,
          address,
          isDetected: true,
        };

        setLocation(newLocation);
        setIsLoading(false);
        
        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation));
        } catch {
          // Ignore storage errors
        }
      },
      (error) => {
        setIsLoading(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setPermissionDenied(true);
            setError("Location permission denied. Please enable GPS or select location manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("An unknown error occurred while detecting location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  const setManualLocation = useCallback((newLocation: GeoLocation) => {
    setLocation(newLocation);
    setError(null);
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Auto-detect location on first load if no saved location
  useEffect(() => {
    if (!location) {
      detectLocation();
    }
  }, []);

  return {
    location,
    isLoading,
    error,
    permissionDenied,
    detectLocation,
    setManualLocation,
  };
}

export { ghanaAreas };
