import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { usePatientProfile, useMedicalHistory, useMedicalHistoryFiles } from "@/shared/hooks/useHealthcare";
import { HeroCarousel } from "@/legacy/components/HeroCarousel";
import { MobileHeader } from "@/legacy/components/MobileHeader";
import { HealthProfileCard } from "@/legacy/components/HealthProfileCard";
import { LocationSelector } from "@/legacy/components/LocationSelector";
import { NearbyHospitalsSection } from "@/legacy/components/NearbyHospitalsSection";
import {
  Stethoscope, Bot,
  Video, FileText, ChevronRight, HeartPulse,
} from "lucide-react";

const quickActions = [
  {
    title: "Symptom Checker",
    subtitle: "Fast triage for urgency and next-step care",
    icon: Stethoscope,
    url: "/patient/symptom-checker",
  },
  {
    title: "AI Health Assistant",
    subtitle: "General health questions, explanations, and guidance",
    icon: Bot,
    url: "/patient/ai-assistant",
  },
  {
    title: "Telemedicine Consultation",
    subtitle: "Start a real-time video consultation",
    icon: Video,
    url: "/patient/telemedicine",
  },
  {
    title: "Medical Reports",
    subtitle: "View generated reports and summaries",
    icon: FileText,
    url: "/patient/reports",
  },
];

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { data: patientProfile } = usePatientProfile();
  const { data: medicalHistory } = useMedicalHistory();
  const { data: medicalHistoryFiles = [] } = useMedicalHistoryFiles();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("Current Location");
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      navigate(`/patient/ai-assistant?query=${encodeURIComponent(query)}`);
    }
  }, [navigate]);

  // Automatic location detection on mount
  useEffect(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { accuracy, latitude, longitude } = pos.coords;
          setGpsCoords({ lat: latitude, lng: longitude });
          setLocationAccuracy(accuracy);
          setSelectedLocation("Current Location");
          setLocationError(null);
          setIsLocating(false);
        },
        (err) => {
          setLocationError("Location access denied. Please enable GPS or select a location manually.");
          setGpsCoords(null);
          setLocationAccuracy(null);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported by your browser.");
      setGpsCoords(null);
      setLocationAccuracy(null);
      setIsLocating(false);
    }
    // eslint-disable-next-line
  }, []);

  // Handler for 'Use Current Location' button
  const handleUseCurrentLocation = useCallback(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { accuracy, latitude, longitude } = pos.coords;
          setGpsCoords({ lat: latitude, lng: longitude });
          setLocationAccuracy(accuracy);
          setSelectedLocation("Current Location");
          setLocationError(null);
          setIsLocating(false);
        },
        (err) => {
          setLocationError("Location access denied. Please enable GPS or select a location manually.");
          setGpsCoords(null);
          setLocationAccuracy(null);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported by your browser.");
      setGpsCoords(null);
      setLocationAccuracy(null);
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
  const conditions = medicalHistory?.existing_conditions || [];
  const allergies = medicalHistory?.allergies || [];
  const medications = medicalHistory?.current_medications || [];
  const conditionPreview = conditions.slice(0, 3);
  const allergyPreview = allergies.slice(0, 3);
  const medicationPreview = medications.slice(0, 3);

  return (
    <div className="flex-1 min-h-screen bg-background max-[380px]:text-[0.92rem]">
      {/* Mobile Header: Location + Bell + Avatar + Search + Filter Pills */}
      <div className="lg:hidden">
        <MobileHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
          showSearchAndFilters={true}
          showLocationRow={false}
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
          location={selectedLocation}
          radius={deliveryRadius}
          onLocationChange={setSelectedLocation}
          onRadiusChange={setDeliveryRadius}
          onUseCurrentLocation={handleUseCurrentLocation}
          locationError={locationError}
          isLocating={isLocating}
          locationAccuracy={locationAccuracy}
        />
      </div>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-4 sm:px-4 md:px-6 max-[380px]:space-y-4 max-[380px]:px-3 max-[380px]:py-3">
        {/* Hero Carousel (includes greeting + slides + dots) */}
        <HeroCarousel displayName={displayName} />

        {/* Health Profile Completion */}
        <div className="w-full">
          <HealthProfileCard completionPercent={profileCompletion} />
        </div>

        {/* Medical History Reminder Card */}
        {!medicalHistory?.onboarding_completed && (
          <div className="rounded-2xl border border-border/20 bg-gradient-to-b from-card to-card/95 p-6 shadow-lg shadow-black/5 dark:shadow-black/20 max-[380px]:rounded-[20px] max-[380px]:p-4">
            <div className="flex items-start gap-6 max-[480px]:gap-3 max-[380px]:gap-2.5">
              {/* Readiness bars chart */}
              <div className="w-[140px] shrink-0 rounded-xl border border-border/40 bg-background/40 p-3 max-[480px]:-mt-1 max-[480px]:w-[104px] max-[380px]:w-[92px] max-[380px]:p-2">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground max-[380px]:mb-1 max-[380px]:text-[9px]">
                  Setup Progress
                </div>
                <div className="space-y-2 max-[380px]:space-y-1.5">
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-muted/60">
                      <div className="h-full w-0 rounded-full bg-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground max-[380px]:text-[9px]">Current health</p>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-muted/60">
                      <div className="h-full w-0 rounded-full bg-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground max-[380px]:text-[9px]">History details</p>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-muted/60">
                      <div className="h-full w-0 rounded-full bg-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground max-[380px]:text-[9px]">Documents</p>
                  </div>
                </div>
              </div>

              {/* Text & Button */}
              <div className="flex flex-1 flex-col items-start gap-2 text-left max-[380px]:gap-1.5">
                <div className="break-words text-base font-semibold text-foreground sm:text-lg max-[380px]:text-sm max-[380px]:leading-tight">
                  Medical History Setup
                </div>
                <div className="mb-2 break-words text-sm text-muted-foreground max-[380px]:mb-1 max-[380px]:text-xs max-[380px]:leading-tight">
                  Help Neo Synapse personalize AI guidance, improve symptom analysis, and keep your records accurate over time.
                </div>
                <button
                  onClick={() => navigate("/patient/medical-history")}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98] w-full sm:w-fit whitespace-nowrap max-[480px]:px-2.5 max-[480px]:text-xs max-[380px]:h-9 max-[380px]:px-2 max-[380px]:text-[11px]"
                >
                  Complete Medical History
                  <ChevronRight className="ml-1 h-4 w-4 max-[380px]:h-3.5 max-[380px]:w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current Health Status Preview */}
        <div className="rounded-2xl border border-border/20 bg-gradient-to-b from-card to-card/95 p-6 shadow-lg shadow-black/5 dark:shadow-black/20 max-[380px]:rounded-[20px] max-[380px]:p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg max-[380px]:text-sm">
                <HeartPulse className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                Current Health Status Preview
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-[380px]:text-xs">
                Quick summary from your saved medical history.
              </p>
            </div>
            <button
              onClick={() => navigate("/patient/medical-history")}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-primary/30 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Update
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/30 bg-background/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Conditions</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{conditions.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {conditionPreview.length > 0 ? conditionPreview.join(", ") : "No conditions listed"}
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-background/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allergies</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{allergies.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {allergyPreview.length > 0 ? allergyPreview.join(", ") : "No allergies listed"}
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-background/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Medications</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{medications.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {medicationPreview.length > 0 ? medicationPreview.join(", ") : "No medications listed"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <section className="relative isolate">
          <h2 className="mb-3 font-display text-lg font-semibold leading-tight lg:text-xl max-[380px]:mb-2 max-[380px]:text-base">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 max-[380px]:gap-2.5">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.url)}
                className="relative grid min-h-[84px] w-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-card/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 max-[380px]:min-h-[76px] max-[380px]:grid-cols-[2.5rem_minmax(0,1fr)] max-[380px]:gap-2.5 max-[380px]:rounded-xl max-[380px]:px-3 max-[380px]:py-2.5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 max-[380px]:h-10 max-[380px]:w-10">
                  <action.icon className="h-5 w-5 text-primary max-[380px]:h-4 max-[380px]:w-4" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate text-base font-semibold leading-snug text-foreground max-[380px]:text-sm">
                    {action.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground max-[380px]:text-xs">
                    {action.subtitle}
                  </p>
                </div>
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
          locationAccuracy={locationAccuracy}
        />
      </main>
    </div>
  );
}
