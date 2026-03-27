import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { usePatientProfile } from "@/shared/hooks/useHealthcare";
import { HeroCarousel } from "@/legacy/components/HeroCarousel";
import { MobileHeader } from "@/legacy/components/MobileHeader";
import { HealthProfileCard } from "@/legacy/components/HealthProfileCard";
import { LocationSelector } from "@/legacy/components/LocationSelector";
import { NearbyHospitalsSection } from "@/legacy/components/NearbyHospitalsSection";
import {
  Stethoscope, Bot, CalendarCheck, Hospital,
  Video, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  { title: "Symptom Checker", icon: Stethoscope, url: "/patient/symptom-checker" },
  { title: "AI Health Assistant", icon: Bot, url: "/patient/ai-assistant" },
  { title: "Telemedicine Consultation", icon: Video, url: "/patient/telemedicine" },
  { title: "Medical Reports", icon: FileText, url: "/patient/reports" },
];

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { data: patientProfile } = usePatientProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("Achimota");
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Helper: Reverse geocode lat/lon to area name using OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      const data = await resp.json();
      return (
        data.address?.suburb ||
        data.address?.neighbourhood ||
        data.address?.city_district ||
        data.address?.town ||
        data.address?.village ||
        data.address?.city ||
        data.display_name?.split(",")[0] ||
        "Current Location"
      );
    } catch (e) {
      return "Current Location";
    }
  };

  // Automatic location detection on mount
  useEffect(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setGpsCoords({ lat: latitude, lng: longitude });
          const area = await reverseGeocode(latitude, longitude);
          setSelectedLocation(area);
          setLocationError(null);
          setIsLocating(false);
        },
        (err) => {
          setLocationError("Location access denied. Please enable GPS or select a location manually.");
          setGpsCoords(null);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported by your browser.");
      setGpsCoords(null);
      setIsLocating(false);
    }
    // eslint-disable-next-line
  }, []);

  // Handler for 'Use Current Location' button
  const handleUseCurrentLocation = useCallback(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setGpsCoords({ lat: latitude, lng: longitude });
          const area = await reverseGeocode(latitude, longitude);
          setSelectedLocation(area);
          setLocationError(null);
          setIsLocating(false);
        },
        (err) => {
          setLocationError("Location access denied. Please enable GPS or select a location manually.");
          setGpsCoords(null);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported by your browser.");
      setGpsCoords(null);
      setIsLocating(false);
    }
  }, []);

  const displayName = profile?.full_name || profile?.display_name || user?.email?.split("@")[0] || "there";

  const calculateProfileCompletion = () => {
    if (!patientProfile) return 66;
    let score = 20;
    if (patientProfile.date_of_birth) score += 15;
    if (patientProfile.gender) score += 10;
    if (patientProfile.phone) score += 15;
    if (patientProfile.emergency_contact_name) score += 15;
    if (patientProfile.emergency_contact_phone) score += 10;
    if (patientProfile.insurance_info) score += 15;
    return Math.min(score, 100);
  };

  const profileCompletion = calculateProfileCompletion();

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Mobile Header: Location + Bell + Avatar + Search + Filter Pills */}
      <div className="lg:hidden">
        <MobileHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchAndFilters={true}
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
          location={selectedLocation}
          radius={deliveryRadius}
          onLocationChange={setSelectedLocation}
          onRadiusChange={setDeliveryRadius}
          onUseCurrentLocation={handleUseCurrentLocation}
          locationError={locationError}
          isLocating={isLocating}
        />
      </div>

      {/* Main Content */}
      <main className="px-2 sm:px-4 md:px-6 py-4 space-y-6 max-w-7xl mx-auto w-full">
        {/* Hero Carousel (includes greeting + slides + dots) */}
        <HeroCarousel />

        {/* Health Profile Completion */}
        <div className="w-full">
          <HealthProfileCard completionPercent={profileCompletion} />
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg lg:text-xl font-semibold mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.url)}
                className={cn(
                  "flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 px-4 py-3 rounded-xl bg-card border border-primary/30 transition-all duration-200 w-full min-h-[56px]",
                  "hover:border-primary/60 hover:shadow-md active:scale-[0.98]"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mb-2 sm:mb-0">
                  <action.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground text-center sm:text-left break-words w-full">
                  {action.title}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Nearest Hospital */}
        <NearbyHospitalsSection
          location={selectedLocation}
          radius={deliveryRadius}
          gpsCoords={gpsCoords}
          onLocationChange={setSelectedLocation}
          onRadiusChange={setDeliveryRadius}
          onUseCurrentLocation={handleUseCurrentLocation}
          locationError={locationError}
          isLocating={isLocating}
        />
      </main>
    </div>
  );
}
