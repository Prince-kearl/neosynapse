import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Hospital, MapPin, ShieldCheck } from "lucide-react";
import { LocationSelector } from "@/legacy/components/LocationSelector";
import { GoogleMap, OverlayView, InfoWindow, useLoadScript } from "@react-google-maps/api";
import {
  formatDistanceKm,
  getLocationCoordinates,
  haversineDistanceKm,
  isValidCoordinates,
  type HospitalFacility,
  rankHospitalsByDistance,
  shouldRequestCurrentLocationVerification,
  type Coordinates,
} from "@/shared/lib/hospitalProximity";

interface NearbyHospitalsSectionProps {
  location: string;
  radius: number;
  gpsCoords?: Coordinates | null;
  customCenter?: Coordinates | null;
  onLocationChange?: (location: string) => void;
  onRadiusChange?: (radius: number) => void;
  onUseCurrentLocation?: () => void;
  onSearchQuery?: (query: string) => Promise<string | null>;
  searchSuggestions?: string[];
  locationError?: string | null;
  isLocating?: boolean;
  locationAccuracy?: number | null;
}

export function NearbyHospitalsSection({ location, radius, gpsCoords, customCenter, onLocationChange, onRadiusChange, onUseCurrentLocation, onSearchQuery, searchSuggestions, locationError, isLocating, locationAccuracy }: NearbyHospitalsSectionProps) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [liveHospitals, setLiveHospitals] = useState<HospitalFacility[] | null>(null);
  const [isLiveLookupBusy, setIsLiveLookupBusy] = useState(false);
  const isCurrentLocation = location === "Current Location";
  const hasVerifiedCurrentLocation = isCurrentLocation && isValidCoordinates(gpsCoords);
  const center = useMemo(() => {
    if (isValidCoordinates(customCenter)) {
      return customCenter;
    }
    return getLocationCoordinates(location, gpsCoords);
  }, [customCenter, location, gpsCoords]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "AIzaSyDrddv4x_Qvf_77eJE2HBAG2paNDW3swbs",
    libraries: ["places"],
  });

  useEffect(() => {
    if (!isLoaded) return;

    const googleMaps = (window as { google?: any }).google?.maps;
    if (!googleMaps?.places) return;

    setIsLiveLookupBusy(true);
    const service = new googleMaps.places.PlacesService(document.createElement("div"));
    const request = {
      location: new googleMaps.LatLng(center.lat, center.lng),
      radius: Math.max(5000, Math.min(radius * 1000, 50000)),
      keyword: "hospital",
      type: "hospital",
    };

    service.nearbySearch(request, (results, status) => {
      if (status !== googleMaps.places.PlacesServiceStatus.OK || !results || results.length === 0) {
        setLiveHospitals(null);
        setIsLiveLookupBusy(false);
        return;
      }

      const transformed: HospitalFacility[] = results
        .map((place) => {
          const lat = place.geometry?.location?.lat?.();
          const lng = place.geometry?.location?.lng?.();
          if (typeof lat !== "number" || typeof lng !== "number") return null;

          return {
            id: place.place_id || `${place.name || "hospital"}-${lat}-${lng}`,
            name: place.name || "Hospital",
            lat,
            lng,
            status: place.opening_hours?.open_now === false ? "Unknown" : "Open",
            address: place.vicinity || place.formatted_address || "Address unavailable",
          };
        })
        .filter((item): item is HospitalFacility => !!item);

      setLiveHospitals(transformed.length > 0 ? transformed : null);
      setIsLiveLookupBusy(false);
    });
  }, [center, isLoaded, radius]);

  const withDistance = useMemo(() => {
    if (!liveHospitals || liveHospitals.length === 0) {
      return rankHospitalsByDistance(center);
    }

    return liveHospitals
      .map((hospital) => ({
        ...hospital,
        distance: haversineDistanceKm(center, hospital),
      }))
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
  }, [center, liveHospitals]);

  const filtered = withDistance.filter((hospital) => hospital.distance <= radius);
  const chosen = filtered.length > 0 ? filtered : withDistance.slice(0, 3);
  const selectedHospital = chosen.find(h => h.id === selectedHospitalId) || chosen[0];

  const mapCenter = selectedHospital ? { lat: selectedHospital.lat, lng: selectedHospital.lng } : center;
  const mapZoom = selectedHospital ? 16 : 13;
  const sectionLabel = hasVerifiedCurrentLocation ? "Verified current location" : location || "Current Location";
  const sourceLabel = liveHospitals && liveHospitals.length > 0 ? "live nearby hospitals" : "local hospital index";
  const sectionMeta = `${sectionLabel} • within ${radius} km • ${sourceLabel}`;

  if (shouldRequestCurrentLocationVerification(location, gpsCoords)) {
    return (
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 max-[380px]:mb-3">
          <h2 className="font-display text-lg font-semibold lg:text-xl max-[380px]:text-base max-[380px]:leading-tight">
            Nearby Hospitals
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

        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm max-[380px]:rounded-xl max-[380px]:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">Verify your current location</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  We need your GPS location before showing hospitals near you. This prevents the app from using an approximate default area.
                </p>
                {locationError && (
                  <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {locationError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <MapPin className="h-4 w-4" />
              {isLocating ? "Verifying..." : "Verify location"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 grid gap-3 sm:flex sm:items-end sm:justify-between max-[380px]:mb-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight lg:text-xl max-[380px]:text-base">
            Nearby Hospitals
          </h2>
          <p className="mt-1 break-words text-sm leading-snug text-muted-foreground max-[380px]:text-xs">
            {sectionMeta}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <LocationSelector
            selectedLocation={location}
            radius={radius}
            onLocationChange={onLocationChange}
            onRadiusChange={onRadiusChange}
            onUseCurrentLocation={onUseCurrentLocation}
            onSearchQuery={onSearchQuery}
            searchSuggestions={searchSuggestions}
            locationError={locationError}
            isLocating={isLocating}
          />
        </div>
      </div>

      {hasVerifiedCurrentLocation && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-medium">Location verified</span>
          {typeof locationAccuracy === "number" && Number.isFinite(locationAccuracy) && (
            <span className="text-primary/80">Accuracy about {Math.round(locationAccuracy)} m</span>
          )}
        </div>
      )}

      {isLiveLookupBusy && (
        <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          Finding nearby hospitals around {location}...
        </div>
      )}

      {/* Hospital Cards */}
      <div className="mb-4 space-y-3 max-[380px]:mb-3 max-[380px]:space-y-2.5">
        {chosen.map((hospital) => (
          <div
            key={hospital.id}
            className={`flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 transition-all duration-200 min-[520px]:flex-row min-[520px]:items-center max-[380px]:gap-3 max-[380px]:p-3 ${selectedHospital && selectedHospital.id === hospital.id ? 'border-primary/70 ring-2 ring-primary/30' : 'border-border hover:border-primary/30'}`}
            onClick={() => setSelectedHospitalId(hospital.id)}
          >
            <div className="flex w-full min-w-0 items-start gap-3 min-[520px]:items-center">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl max-[380px]:h-8 max-[380px]:w-8 ${selectedHospital && selectedHospital.id === hospital.id ? 'bg-primary/20' : 'bg-primary/10'}`}>
                <Hospital className={`h-5 w-5 max-[380px]:h-4 max-[380px]:w-4 ${selectedHospital && selectedHospital.id === hospital.id ? 'text-primary' : 'text-primary/60'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="break-words font-medium text-foreground max-[380px]:text-sm">{hospital.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground max-[380px]:gap-x-2 max-[380px]:text-xs">
                  <span className="font-medium text-foreground">{formatDistanceKm(hospital.distance)}</span>
                  <span className="text-primary text-xs font-medium">● {hospital.status}</span>
                  <span className="min-w-0 break-words">{hospital.address}</span>
                </div>
              </div>
            </div>
            {selectedHospital && selectedHospital.id === hospital.id && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ', Accra, Ghana')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/30 px-3 text-xs font-medium text-primary hover:bg-primary/10 min-[520px]:ml-2 min-[520px]:w-auto"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Maps
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Google Map */}
      <div className="relative h-64 overflow-hidden rounded-2xl border border-border bg-card lg:h-96 max-[380px]:h-56 max-[380px]:rounded-[20px]">
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
              <OverlayView
                position={gpsCoords}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  title="Your Location"
                  className="h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow"
                />
              </OverlayView>
            )}
            {/* Hospital Markers */}
            {chosen.map(hospital => (
              <OverlayView
                key={hospital.id}
                position={{ lat: hospital.lat, lng: hospital.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <button
                  type="button"
                  onClick={() => setSelectedHospitalId(hospital.id)}
                  aria-label={`Select ${hospital.name}`}
                  className={`-translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow focus:outline-none focus:ring-2 focus:ring-primary/60 ${
                    selectedHospital && selectedHospital.id === hospital.id
                      ? "h-5 w-5 bg-red-500"
                      : "h-4 w-4 bg-green-500"
                  }`}
                />
              </OverlayView>
            ))}

            {/* Selected hospital info */}
            {selectedHospital && (
              <InfoWindow
                position={{ lat: selectedHospital.lat, lng: selectedHospital.lng }}
                onCloseClick={() => setSelectedHospitalId(null)}
              >
                <div>
                  <strong>{selectedHospital.name}</strong><br />
                  {formatDistanceKm(selectedHospital.distance)}<br />
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>{selectedHospital.status}</span>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
