import { useNavigate } from "react-router-dom";
import { 
  User, Settings, ChevronRight, LogOut, HeartPulse, 
  Stethoscope, Shield, Bell, MapPin, CreditCard, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";

const accountMenuItems = [
  { icon: MapPin, label: "Saved Locations", description: "Home & hospital addresses" },
  { icon: CreditCard, label: "Payment & Insurance", description: "Insurance cards & payment methods" },
  { icon: Bell, label: "Notifications", description: "Appointment & health alerts" },
  { icon: Shield, label: "Privacy & Security", description: "Medical data protection settings" },
];

export default function PatientProfile() {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { profile } = useUserRole();

  const displayName = profile?.full_name || profile?.display_name || user?.email?.split('@')[0] || "Patient";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Sign in to view profile</h1>
        <p className="text-muted-foreground mb-6">Access your health profile and settings</p>
        <Button onClick={() => navigate("/auth/sign-in")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-card rounded-2xl p-6 shadow-food-card">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <p className="text-xs text-primary mt-1">Patient Account</p>
            </div>
          </div>
        </div>

        {/* Health Profile Section */}
        <div className="bg-card rounded-2xl p-5 shadow-food-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Health Profile</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Personal Details</p>
                  <p className="text-sm text-muted-foreground">Date of birth, gender, contact</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Medical History</p>
                  <p className="text-sm text-muted-foreground">Conditions, allergies & medications</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Consent Settings</p>
                  <p className="text-sm text-muted-foreground">Data sharing & recording preferences</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
          </div>
        </div>

        {/* Account Menu Items */}
        <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
          {accountMenuItems.map((item, index) => (
            <div key={item.label}>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
              {index < accountMenuItems.length - 1 && <Separator />}
            </div>
          ))}
        </div>

        {/* Settings & Help */}
        <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
          <button 
            onClick={() => navigate("/patient/settings")}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-secondary-foreground" />
            </div>
            <p className="font-medium text-foreground flex-1">Settings</p>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Healthcare Professional Notice */}
        <div className="bg-muted/50 rounded-2xl p-5">
          <p className="font-medium text-sm text-foreground mb-1">Are you a healthcare provider?</p>
          <p className="text-xs text-muted-foreground">
            Healthcare professional access is by invitation only. Contact your organization's 
            administrator or email support@neosynapse.health for more information.
          </p>
        </div>

        {/* Log Out Button */}
        <Button 
          variant="outline" 
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
          onClick={handleSignOut}
          disabled={authLoading}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Neo Synapse v1.0.0 • Patient Portal
        </p>
      </div>
    </div>
  );
}
