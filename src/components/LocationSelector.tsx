import { useState } from "react";
import { MapPin, ChevronDown, Navigation, Loader2, Search, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "@/contexts/LocationContext";
import { GeoLocation } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";

const RADIUS_OPTIONS = [5, 10, 15, 20, 25];

export function LocationSelector() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { 
    location, 
    isLoading, 
    error, 
    permissionDenied, 
    detectLocation, 
    setManualLocation,
    ghanaAreas,
    deliveryRadius,
    setDeliveryRadius
  } = useLocation();

  const filteredLocations = ghanaAreas.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.short.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLocation = (area: typeof ghanaAreas[0]) => {
    const newLocation: GeoLocation = {
      latitude: area.lat,
      longitude: area.lng,
      address: area.name,
      isDetected: false,
    };
    setManualLocation(newLocation);
    setOpen(false);
    setSearchQuery("");
  };

  const handleDetectLocation = () => {
    detectLocation();
  };

  const displayLocation = location?.address || "Select location";
  const shortDisplayLocation = location?.address 
    ? (ghanaAreas.find(a => a.name === location.address)?.short || location.address.split(",")[0])
    : "Select location";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 gap-1.5"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <MapPin className="w-4 h-4 text-primary" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
            {isLoading ? "Detecting..." : shortDisplayLocation}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-72 p-0 bg-card border-border shadow-lg z-50"
      >
        {/* Search Input */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search delivery area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Error/Permission Message */}
        {(error || permissionDenied) && (
          <div className="px-3 py-2 bg-destructive/10 border-b border-border">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive">
                {permissionDenied 
                  ? "GPS access denied. Select location manually or enable GPS in settings."
                  : error
                }
              </p>
            </div>
          </div>
        )}

        {/* Detect Location Button */}
        <div className="p-2 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDetectLocation}
            disabled={isLoading}
            className="w-full justify-start gap-2 text-primary hover:text-primary hover:bg-primary/10"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span className="font-medium">
              {isLoading ? "Detecting location..." : "Use current location"}
            </span>
          </Button>
        </div>

        {/* Delivery Radius Slider */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Delivery radius</span>
            <span className="text-sm font-semibold text-primary">{deliveryRadius} km</span>
          </div>
          <Slider
            value={[deliveryRadius]}
            onValueChange={([value]) => setDeliveryRadius(value)}
            min={5}
            max={25}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">5 km</span>
            <span className="text-xs text-muted-foreground">25 km</span>
          </div>
        </div>

        {/* Location List */}
        <div className="max-h-[180px] overflow-y-auto py-1">
          {filteredLocations.length > 0 ? (
            filteredLocations.map((area) => {
              const isSelected = location?.address === area.name;
              return (
                <button
                  key={area.id}
                  onClick={() => handleSelectLocation(area)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-sm">{area.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No locations found
            </div>
          )}
        </div>

        {/* Current Location Indicator */}
        {location?.isDetected && (
          <div className="p-2 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              📍 Location auto-detected via GPS
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
