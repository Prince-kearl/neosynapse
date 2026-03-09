import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Settings, ChevronRight, LogOut, HeartPulse, 
  Stethoscope, Shield, Bell, MapPin, CreditCard, Loader2, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePatientProfile } from "@/shared/hooks/useHealthcare";
import { patientProfileService } from "@/shared/services/healthcare";
import { toast } from "@/hooks/use-toast";

const accountMenuItems = [
  { icon: MapPin, label: "Saved Locations", description: "Home & hospital addresses" },
  { icon: CreditCard, label: "Payment & Insurance", description: "Insurance cards & payment methods" },
  { icon: Bell, label: "Notifications", description: "Appointment & health alerts" },
  { icon: Shield, label: "Privacy & Security", description: "Medical data protection settings" },
];

export default function PatientProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { profile } = useUserRole();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const displayName = profile?.full_name || profile?.display_name || user?.email?.split('@')[0] || "Patient";

  const { data: patientProfile, isLoading: profileLoading } = usePatientProfile();

  const [formData, setFormData] = useState({
    date_of_birth: "",
    gender: "",
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    preferred_language: "en",
  });

  const initializeForm = () => {
    if (patientProfile) {
      setFormData({
        date_of_birth: patientProfile.date_of_birth || "",
        gender: patientProfile.gender || "",
        phone: patientProfile.phone || "",
        emergency_contact_name: patientProfile.emergency_contact_name || "",
        emergency_contact_phone: patientProfile.emergency_contact_phone || "",
        preferred_language: patientProfile.preferred_language || "en",
      });
    }
    setEditDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await patientProfileService.upsert(user.id, {
        ...data,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Profile updated", description: "Your health profile has been saved." });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
          
          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HeartPulse className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Personal Details</p>
                    <p className="text-sm text-muted-foreground">
                      {patientProfile?.date_of_birth 
                        ? `DOB: ${new Date(patientProfile.date_of_birth).toLocaleDateString()}`
                        : "Date of birth, gender, contact"
                      }
                      {patientProfile?.gender && ` • ${patientProfile.gender}`}
                    </p>
                  </div>
                </div>
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={initializeForm}>Edit</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Personal Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+233 XX XXX XXXX"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <Separator />
                      <p className="text-sm font-medium">Emergency Contact</p>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_name">Contact Name</Label>
                        <Input
                          id="emergency_name"
                          placeholder="Emergency contact name"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_phone">Contact Phone</Label>
                        <Input
                          id="emergency_phone"
                          type="tel"
                          placeholder="+233 XX XXX XXXX"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">Preferred Language</Label>
                        <Select value={formData.preferred_language} onValueChange={(v) => setFormData({ ...formData, preferred_language: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="tw">Twi</SelectItem>
                            <SelectItem value="ga">Ga</SelectItem>
                            <SelectItem value="ee">Ewe</SelectItem>
                            <SelectItem value="ha">Hausa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => saveMutation.mutate(formData)}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
          )}
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

        <div className="bg-muted/50 rounded-2xl p-5">
          <p className="font-medium text-sm text-foreground mb-1">Are you a healthcare provider?</p>
          <p className="text-xs text-muted-foreground">
            Healthcare professional access is by invitation only. Contact your organization's 
            administrator or email support@neosynapse.health for more information.
          </p>
        </div>

        <Button 
          variant="outline" 
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
          onClick={handleSignOut}
          disabled={authLoading}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Neo Synapse v1.0.0 • Patient Portal
        </p>
      </div>
    </div>
  );
}
