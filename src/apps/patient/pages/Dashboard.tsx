import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { usePatientProfile } from "@/shared/hooks/useHealthcare";
import { HeroCarousel } from "@/legacy/components/HeroCarousel";
import { MobileHeader } from "@/legacy/components/MobileHeader";
import { HealthProfileCard } from "@/legacy/components/HealthProfileCard";
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
        />
      </div>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6 max-w-7xl">
        {/* Hero Carousel (includes greeting + slides + dots) */}
        <HeroCarousel />

        {/* Health Profile Completion */}
        <HealthProfileCard completionPercent={profileCompletion} />

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg lg:text-xl font-semibold mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.url)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-primary/30 transition-all duration-200",
                  "hover:border-primary/60 hover:shadow-md active:scale-[0.98]"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <action.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {action.title}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Nearest Hospital */}
        <NearbyHospitalsSection />
      </main>
    </div>
  );
}
