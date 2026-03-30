import { useState, useMemo } from "react";
import { Hospital } from "lucide-react";
import { LocationSelector } from "@/legacy/components/LocationSelector";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";

const hospitals = [
  { id: "1", name: "Korle Bu Teaching Hospital", lat: 5.5600, lng: -0.1750, status: "Open" },
  { id: "2", name: "37 Military Hospital", lat: 5.5571, lng: -0.1688, status: "Open" },
  { id: "3", name: "Ridge Hospital", lat: 5.5554, lng: -0.2003, status: "Open" },
  { id: "4", name: "Achimota Hospital", lat: 5.6402, lng: -0.2505, status: "Open" },
  { id: "5", name: "La General Hospital", lat: 5.5795, lng: -0.1702, status: "Open" },
];

const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  Achimota: { lat: 5.6397, lng: -0.2443 },
  "East Legon": { lat: 5.6521, lng: -0.1736 },
  Osu: { lat: 5.5459, lng: -0.1890 },
  Labone: { lat: 5.5616, lng: -0.1834 },
  Cantonments: { lat: 5.5567, lng: -0.1847 },
  "Airport City": { lat: 5.6054, lng: -0.1663 },
  Madina: { lat: 5.6839, lng: 0.0449 },
  Tema: { lat: 5.6580, lng: 0.0159 },
  Spintex: { lat: 5.6102, lng: 0.0713 },
  Dansoman: { lat: 5.5840, lng: -0.2841 },
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


export function NearbyHospitalsSection({ location, radius, gpsCoords, onLocationChange, onRadiusChange, onUseCurrentLocation, locationError, isLocating }: NearbyHospitalsSectionProps) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const center = useMemo(() => {
    if (location === "Current Location" && typeof gpsCoords?.lat === "number" && typeof gpsCoords?.lng === "number") {
      return gpsCoords;
    } else {
      return locationCoordinates[location] || locationCoordinates.Achimota;
    }
  }, [location, gpsCoords]);

  const withDistance = useMemo(() => hospitals
    .map((hospital) => {
      const distance = haversineDistance(center.lat, center.lng, hospital.lat, hospital.lng);
      return { ...hospital, distance };
    })
    .sort((a, b) => a.distance - b.distance), [center]);

  const filtered = withDistance.filter((hospital) => hospital.distance <= radius);
  const chosen = filtered.length > 0 ? filtered : withDistance.slice(0, 3);
  const selectedHospital = chosen.find(h => h.id === selectedHospitalId) || chosen[0];

  // Google Maps
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "AIzaSyDrddv4x_Qvf_77eJE2HBAG2paNDW3swbs"
  });
  const mapCenter = selectedHospital ? { lat: selectedHospital.lat, lng: selectedHospital.lng } : center;
  const mapZoom = selectedHospital ? 16 : 13;

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-display text-lg lg:text-xl font-semibold">
          Nearby Hospitals ({location}, within {radius} km)
        </h2>
        <div className="w-full sm:w-auto">
          <LocationSelector
            selectedLocation={location}
            radius={radius}
            onLocationChange={onLocationChange}
            onRadiusChange={onRadiusChange}
            onUseCurrentLocation={onUseCurrentLocation}
            locationError={locationError}
            isLocating={isLocating}
          />
        </div>
      </div>

      {/* Hospital Cards */}
      <div className="space-y-3 mb-4">
        {chosen.map((hospital) => (
          <div
            key={hospital.id}
            className={`bg-card rounded-xl p-4 border flex items-center gap-4 transition-all duration-200 cursor-pointer ${selectedHospital && selectedHospital.id === hospital.id ? 'border-primary/70 ring-2 ring-primary/30' : 'border-border hover:border-primary/30'}`}
            onClick={() => setSelectedHospitalId(hospital.id)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedHospital && selectedHospital.id === hospital.id ? 'bg-primary/20' : 'bg-primary/10'}`}>
              <Hospital className={`w-5 h-5 ${selectedHospital && selectedHospital.id === hospital.id ? 'text-primary' : 'text-primary/60'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{hospital.name}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{hospital.distance.toFixed(1)} km</span>
                <span className="text-primary text-xs font-medium">● {hospital.status}</span>
              </div>
            </div>
            {selectedHospital && selectedHospital.id === hospital.id && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ', Accra, Ghana')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-blue-600 underline"
                onClick={e => e.stopPropagation()}
              >
                Open in Maps
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Google Map */}
      <div className="bg-card rounded-2xl overflow-hidden border border-border h-64 lg:h-96 relative">
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={mapZoom}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: "greedy",
              clickableIcons: false,
              mapTypeControl: false,
              streetViewControl: false,
            }}
          >
            {/* User Marker */}
            {location === "Current Location" && gpsCoords && (
              <Marker
                position={gpsCoords}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  scaledSize: { width: 40, height: 40 }
                }}
                title="Your Location"
              />
            )}
            {/* Hospital Markers */}
            {chosen.map(hospital => (
              <Marker
                key={hospital.id}
                position={{ lat: hospital.lat, lng: hospital.lng }}
                onClick={() => setSelectedHospitalId(hospital.id)}
                icon={selectedHospital && selectedHospital.id === hospital.id ? {
                  url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: { width: 44, height: 44 }
                } : {
                  url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                  scaledSize: { width: 36, height: 36 }
                }}
              >
                {selectedHospital && selectedHospital.id === hospital.id && (
                  <InfoWindow position={{ lat: hospital.lat, lng: hospital.lng }}>
                    <div>
                      <strong>{hospital.name}</strong><br />
                      {hospital.distance.toFixed(1)} km<br />
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>{hospital.status}</span>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
