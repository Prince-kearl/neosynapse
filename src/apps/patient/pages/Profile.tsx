import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Settings, ChevronRight, LogOut, HeartPulse, 
  Stethoscope, Shield, Bell, MapPin, CreditCard, Loader2, Save, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePatientProfile } from "@/shared/hooks/useHealthcare";
import { consentService, patientProfileService } from "@/shared/services/healthcare";
import {
  getInsuranceInfo,
  getNotificationSummary,
  getPatientProfileMeta,
  getPrivacySummary,
  mergePatientProfileMeta,
  type PatientProfileMeta,
} from "@/shared/lib/patientSettings";
import { toast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/auth/rolePriority";

export default function PatientProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { profile, role, roles } = useUserRole();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [medicalHistoryDialogOpen, setMedicalHistoryDialogOpen] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [savedLocationsDialogOpen, setSavedLocationsDialogOpen] = useState(false);
  const [paymentInsuranceDialogOpen, setPaymentInsuranceDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [privacySecurityDialogOpen, setPrivacySecurityDialogOpen] = useState(false);

  const displayName = profile?.full_name || profile?.display_name || user?.email?.split('@')[0] || "Patient";

  const { data: patientProfile, isLoading: profileLoading } = usePatientProfile();
  const { data: consentRecords = [] } = useQuery({
    queryKey: ["consents", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await consentService.getForPatient(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const [formData, setFormData] = useState({
    date_of_birth: "",
    gender: "",
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    preferred_language: "en",
  });
  const [medicalHistoryData, setMedicalHistoryData] = useState({
    conditions: "",
    allergies: "",
    medications: "",
  });
  const [consentData, setConsentData] = useState({
    dataSharing: false,
    recording: false,
  });
  const [savedLocationsData, setSavedLocationsData] = useState({
    homeAddress: "",
    preferredHospital: "",
    otherLocations: "",
  });
  const [paymentInsuranceData, setPaymentInsuranceData] = useState({
    insuranceProvider: "",
    policyNumber: "",
    memberId: "",
    insurancePlan: "",
    paymentMethod: "",
  });
  const [notificationData, setNotificationData] = useState({
    appointmentReminders: true,
    medicationAlerts: true,
    healthTips: false,
    emailNotifications: true,
  });
  const [privacySecurityData, setPrivacySecurityData] = useState({
    profileVisibility: "care_team",
    twoFactorEnabled: false,
    biometricLock: false,
    activityAlerts: true,
  });

  const getLatestConsentByType = (type: string) =>
    consentRecords.find((c) => c.consent_type === type);

  const latestDataSharingConsent = getLatestConsentByType("data_sharing");
  const latestRecordingConsent = getLatestConsentByType("recording");
  const insuranceInfo = getInsuranceInfo(patientProfile?.insurance_info);
  const profileMeta = getPatientProfileMeta(insuranceInfo);
  const savedLocationsMeta = profileMeta.saved_locations;
  const paymentInsuranceMeta = profileMeta.payment_insurance;
  const notificationSettingsMeta = profileMeta.notification_settings;
  const privacySecuritySettingsMeta = profileMeta.privacy_security_settings;

  const notificationSummary = getNotificationSummary(notificationSettingsMeta);
  const privacySummary = getPrivacySummary(privacySecuritySettingsMeta);

  const buildInsuranceInfoPatch = (patch: Partial<PatientProfileMeta>) =>
    mergePatientProfileMeta(patientProfile?.insurance_info, patch);

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

  const initializeMedicalHistoryForm = () => {
    const conditions = Array.isArray(insuranceInfo.conditions) ? insuranceInfo.conditions.join(", ") : "";
    const allergies = Array.isArray(insuranceInfo.allergies) ? insuranceInfo.allergies.join(", ") : "";
    const medications = Array.isArray(insuranceInfo.medications) ? insuranceInfo.medications.join(", ") : "";

    setMedicalHistoryData({ conditions, allergies, medications });
    setMedicalHistoryDialogOpen(true);
  };

  const initializeConsentForm = () => {
    setConsentData({
      dataSharing: !!latestDataSharingConsent?.granted,
      recording: !!latestRecordingConsent?.granted,
    });
    setConsentDialogOpen(true);
  };

  const initializeSavedLocationsForm = () => {
    setSavedLocationsData({
      homeAddress: savedLocationsMeta?.home_address || "",
      preferredHospital: savedLocationsMeta?.preferred_hospital || "",
      otherLocations: savedLocationsMeta?.other_locations || "",
    });
    setSavedLocationsDialogOpen(true);
  };

  const initializePaymentInsuranceForm = () => {
    setPaymentInsuranceData({
      insuranceProvider: paymentInsuranceMeta?.insurance_provider || "",
      policyNumber: paymentInsuranceMeta?.policy_number || "",
      memberId: paymentInsuranceMeta?.member_id || "",
      insurancePlan: paymentInsuranceMeta?.insurance_plan || "",
      paymentMethod: paymentInsuranceMeta?.payment_method || "",
    });
    setPaymentInsuranceDialogOpen(true);
  };

  const initializeNotificationForm = () => {
    setNotificationData({
      appointmentReminders: notificationSettingsMeta.appointment_reminders,
      medicationAlerts: notificationSettingsMeta.medication_alerts,
      healthTips: notificationSettingsMeta.health_tips,
      emailNotifications: notificationSettingsMeta.email_notifications,
    });
    setNotificationDialogOpen(true);
  };

  const initializePrivacySecurityForm = () => {
    setPrivacySecurityData({
      profileVisibility: privacySecuritySettingsMeta.profile_visibility,
      twoFactorEnabled: privacySecuritySettingsMeta.two_factor_enabled,
      biometricLock: privacySecuritySettingsMeta.biometric_lock,
      activityAlerts: privacySecuritySettingsMeta.activity_alerts,
    });
    setPrivacySecurityDialogOpen(true);
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

  const clearPersonalDetailsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await patientProfileService.upsert(user.id, {
        date_of_birth: null,
        gender: null,
        phone: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        preferred_language: "en",
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Details cleared", description: "Personal details removed successfully." });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveMedicalHistoryMutation = useMutation({
    mutationFn: async (data: typeof medicalHistoryData) => {
      if (!user) throw new Error("Not authenticated");
      const toList = (value: string) =>
        value
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);

      const insurance_info = {
        ...insuranceInfo,
        conditions: toList(data.conditions),
        allergies: toList(data.allergies),
        medications: toList(data.medications),
      };

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Medical history updated" });
      setMedicalHistoryDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearMedicalHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: {
          ...insuranceInfo,
          conditions: [],
          allergies: [],
          medications: [],
        },
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Medical history cleared" });
      setMedicalHistoryDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveConsentMutation = useMutation({
    mutationFn: async (data: typeof consentData) => {
      if (!user) throw new Error("Not authenticated");

      const syncConsent = async (
        type: "data_sharing" | "recording",
        desiredGranted: boolean,
        latest: { id: string; granted: boolean } | undefined
      ) => {
        if (desiredGranted) {
          if (!latest || !latest.granted) {
            const { error } = await consentService.create({
              patient_id: user.id,
              consent_type: type,
              granted: true,
            });
            if (error) throw error;
          }
          return;
        }

        if (latest?.granted) {
          const { error } = await consentService.revoke(latest.id);
          if (error) throw error;
          return;
        }

        if (!latest) {
          const { error } = await consentService.create({
            patient_id: user.id,
            consent_type: type,
            granted: false,
          });
          if (error) throw error;
        }
      };

      await syncConsent("data_sharing", data.dataSharing, latestDataSharingConsent as any);
      await syncConsent("recording", data.recording, latestRecordingConsent as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consents", user?.id] });
      toast({ title: "Consent settings updated" });
      setConsentDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveSavedLocationsMutation = useMutation({
    mutationFn: async (data: typeof savedLocationsData) => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({
        saved_locations: {
            home_address: data.homeAddress || null,
            preferred_hospital: data.preferredHospital || null,
            other_locations: data.otherLocations || null,
        },
      });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Saved locations updated" });
      setSavedLocationsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearSavedLocationsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({ saved_locations: null });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Saved locations cleared" });
      setSavedLocationsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const savePaymentInsuranceMutation = useMutation({
    mutationFn: async (data: typeof paymentInsuranceData) => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({
        payment_insurance: {
            insurance_provider: data.insuranceProvider || null,
            policy_number: data.policyNumber || null,
            member_id: data.memberId || null,
            insurance_plan: data.insurancePlan || null,
            payment_method: data.paymentMethod || null,
        },
      });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Payment & insurance updated" });
      setPaymentInsuranceDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearPaymentInsuranceMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({ payment_insurance: null });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Payment & insurance cleared" });
      setPaymentInsuranceDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveNotificationMutation = useMutation({
    mutationFn: async (data: typeof notificationData) => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({
        notification_settings: {
            ...notificationSettingsMeta,
            appointment_reminders: data.appointmentReminders,
            medication_alerts: data.medicationAlerts,
            health_tips: data.healthTips,
            email_notifications: data.emailNotifications,
        },
      });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Notification settings updated" });
      setNotificationDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({
        notification_settings: {
          appointment_reminders: true,
          medication_alerts: true,
          health_tips: false,
          email_notifications: true,
          browser_notifications: null,
          sms_notifications: false,
        },
      });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Notification settings cleared" });
      setNotificationDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const savePrivacySecurityMutation = useMutation({
    mutationFn: async (data: typeof privacySecurityData) => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({
        privacy_security_settings: {
            profile_visibility: data.profileVisibility,
            two_factor_enabled: data.twoFactorEnabled,
            biometric_lock: data.biometricLock,
            activity_alerts: data.activityAlerts,
        },
      });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Privacy & security settings updated" });
      setPrivacySecurityDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearPrivacySecurityMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const nextInsuranceInfo = buildInsuranceInfoPatch({
        privacy_security_settings: {
          profile_visibility: "care_team",
          two_factor_enabled: false,
          biometric_lock: false,
          activity_alerts: true,
        },
      });

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: nextInsuranceInfo,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast({ title: "Privacy & security settings cleared" });
      setPrivacySecurityDialogOpen(false);
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
              <p className="text-xs text-primary mt-1">
                {getRoleLabel(role)}
                {roles.includes("patient") && role !== "patient" ? " • Patient access enabled" : ""}
              </p>
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
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                            <SelectItem value="yo">Yoruba</SelectItem>
                            <SelectItem value="sw">Swahili</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => clearPersonalDetailsMutation.mutate()}
                          disabled={clearPersonalDetailsMutation.isPending || saveMutation.isPending}
                        >
                          {clearPersonalDetailsMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Clear
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => saveMutation.mutate(formData)}
                          disabled={saveMutation.isPending || clearPersonalDetailsMutation.isPending}
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
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
                    <p className="text-sm text-muted-foreground">
                      {(patientProfile?.insurance_info as Record<string, unknown> | null)
                        ? "Conditions, allergies & medications on file"
                        : "No medical history saved yet"}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/patient/medical-history")}>Manage</Button>
              </div>
              
              <Separator />
              
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">Consent Settings</p>
                    <p className="text-sm text-muted-foreground break-words">
                      Data sharing: {latestDataSharingConsent?.granted ? "On" : "Off"} • Recording: {latestRecordingConsent?.granted ? "On" : "Off"}
                    </p>
                  </div>
                </div>
                <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={initializeConsentForm}>Manage</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Consent Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                        <div className="min-w-0">
                          <p className="font-medium">Data Sharing</p>
                          <p className="text-xs text-muted-foreground">Share profile with healthcare providers.</p>
                        </div>
                        <Switch
                          className="shrink-0"
                          checked={consentData.dataSharing}
                          onCheckedChange={(checked) => setConsentData((prev) => ({ ...prev, dataSharing: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                        <div className="min-w-0">
                          <p className="font-medium">Recording Consent</p>
                          <p className="text-xs text-muted-foreground">Allow consultation recording and transcription.</p>
                        </div>
                        <Switch
                          className="shrink-0"
                          checked={consentData.recording}
                          onCheckedChange={(checked) => setConsentData((prev) => ({ ...prev, recording: checked }))}
                        />
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => saveConsentMutation.mutate(consentData)}
                        disabled={saveConsentMutation.isPending}
                      >
                        {saveConsentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Preferences
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </div>

        {/* Account Menu Items */}
        <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
          <Dialog open={savedLocationsDialogOpen} onOpenChange={setSavedLocationsDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left" onClick={initializeSavedLocationsForm}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Saved Locations</p>
                  <p className="text-sm text-muted-foreground">
                    {savedLocationsMeta?.home_address || "Home & hospital addresses"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Saved Locations</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="home_address">Home Address</Label>
                  <Input
                    id="home_address"
                    placeholder="e.g. East Legon, Accra"
                    value={savedLocationsData.homeAddress}
                    onChange={(e) => setSavedLocationsData({ ...savedLocationsData, homeAddress: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_hospital">Preferred Hospital</Label>
                  <Input
                    id="preferred_hospital"
                    placeholder="e.g. Korle-Bu Teaching Hospital"
                    value={savedLocationsData.preferredHospital}
                    onChange={(e) => setSavedLocationsData({ ...savedLocationsData, preferredHospital: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_locations">Other Notes</Label>
                  <Textarea
                    id="other_locations"
                    placeholder="Additional location details"
                    value={savedLocationsData.otherLocations}
                    onChange={(e) => setSavedLocationsData({ ...savedLocationsData, otherLocations: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => clearSavedLocationsMutation.mutate()}
                    disabled={clearSavedLocationsMutation.isPending || saveSavedLocationsMutation.isPending}
                  >
                    {clearSavedLocationsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Clear
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => saveSavedLocationsMutation.mutate(savedLocationsData)}
                    disabled={saveSavedLocationsMutation.isPending || clearSavedLocationsMutation.isPending}
                  >
                    {saveSavedLocationsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Separator />

          <Dialog open={paymentInsuranceDialogOpen} onOpenChange={setPaymentInsuranceDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left" onClick={initializePaymentInsuranceForm}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Payment & Insurance</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentInsuranceMeta?.insurance_provider || "Insurance cards & payment methods"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Payment & Insurance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="insurance_provider">Insurance Provider</Label>
                  <Input
                    id="insurance_provider"
                    placeholder="e.g. NHIS"
                    value={paymentInsuranceData.insuranceProvider}
                    onChange={(e) => setPaymentInsuranceData({ ...paymentInsuranceData, insuranceProvider: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    placeholder="Enter policy number"
                    value={paymentInsuranceData.policyNumber}
                    onChange={(e) => setPaymentInsuranceData({ ...paymentInsuranceData, policyNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member_id">Member ID</Label>
                  <Input
                    id="member_id"
                    placeholder="Enter member ID"
                    value={paymentInsuranceData.memberId}
                    onChange={(e) => setPaymentInsuranceData({ ...paymentInsuranceData, memberId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_plan">Insurance Plan</Label>
                  <Input
                    id="insurance_plan"
                    placeholder="e.g. Family Plan"
                    value={paymentInsuranceData.insurancePlan}
                    onChange={(e) => setPaymentInsuranceData({ ...paymentInsuranceData, insurancePlan: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Preferred Payment Method</Label>
                  <Input
                    id="payment_method"
                    placeholder="e.g. Mobile Money"
                    value={paymentInsuranceData.paymentMethod}
                    onChange={(e) => setPaymentInsuranceData({ ...paymentInsuranceData, paymentMethod: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => clearPaymentInsuranceMutation.mutate()}
                    disabled={clearPaymentInsuranceMutation.isPending || savePaymentInsuranceMutation.isPending}
                  >
                    {clearPaymentInsuranceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Clear
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => savePaymentInsuranceMutation.mutate(paymentInsuranceData)}
                    disabled={savePaymentInsuranceMutation.isPending || clearPaymentInsuranceMutation.isPending}
                  >
                    {savePaymentInsuranceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Separator />

          <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left" onClick={initializeNotificationForm}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Notifications</p>
                  <p className="text-sm text-muted-foreground">{notificationSummary}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Notifications</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Appointment Reminders</p>
                    <p className="text-xs text-muted-foreground">Receive reminders before scheduled consultations.</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={notificationData.appointmentReminders}
                    onCheckedChange={(checked) => setNotificationData((prev) => ({ ...prev, appointmentReminders: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Medication Alerts</p>
                    <p className="text-xs text-muted-foreground">Get reminders for medications and dosage windows.</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={notificationData.medicationAlerts}
                    onCheckedChange={(checked) => setNotificationData((prev) => ({ ...prev, medicationAlerts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Health Tips</p>
                    <p className="text-xs text-muted-foreground">Receive personalized wellness recommendations.</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={notificationData.healthTips}
                    onCheckedChange={(checked) => setNotificationData((prev) => ({ ...prev, healthTips: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Send notification summaries to your email.</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={notificationData.emailNotifications}
                    onCheckedChange={(checked) => setNotificationData((prev) => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => clearNotificationMutation.mutate()}
                    disabled={clearNotificationMutation.isPending || saveNotificationMutation.isPending}
                  >
                    {clearNotificationMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Clear
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => saveNotificationMutation.mutate(notificationData)}
                    disabled={saveNotificationMutation.isPending || clearNotificationMutation.isPending}
                  >
                    {saveNotificationMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Separator />

          <Dialog open={privacySecurityDialogOpen} onOpenChange={setPrivacySecurityDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left" onClick={initializePrivacySecurityForm}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Privacy & Security</p>
                  <p className="text-sm text-muted-foreground">{privacySummary}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Privacy & Security</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="profile_visibility">Profile Visibility</Label>
                  <Select
                    value={privacySecurityData.profileVisibility}
                    onValueChange={(value: "private" | "care_team") =>
                      setPrivacySecurityData((prev) => ({ ...prev, profileVisibility: value }))
                    }
                  >
                    <SelectTrigger id="profile_visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="care_team">Care Team Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Require an extra step when signing in.</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={privacySecurityData.twoFactorEnabled}
                    onCheckedChange={(checked) => setPrivacySecurityData((prev) => ({ ...prev, twoFactorEnabled: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Biometric Lock</p>
                    <p className="text-xs text-muted-foreground">Allow biometric verification where supported.</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={privacySecurityData.biometricLock}
                    onCheckedChange={(checked) => setPrivacySecurityData((prev) => ({ ...prev, biometricLock: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Security Activity Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notified of important account activity.</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={privacySecurityData.activityAlerts}
                    onCheckedChange={(checked) => setPrivacySecurityData((prev) => ({ ...prev, activityAlerts: checked }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => clearPrivacySecurityMutation.mutate()}
                    disabled={clearPrivacySecurityMutation.isPending || savePrivacySecurityMutation.isPending}
                  >
                    {clearPrivacySecurityMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Clear
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => savePrivacySecurityMutation.mutate(privacySecurityData)}
                    disabled={savePrivacySecurityMutation.isPending || clearPrivacySecurityMutation.isPending}
                  >
                    {savePrivacySecurityMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
          <Separator />
          <Link
            to="/privacy"
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Privacy Policy</p>
              <p className="text-sm text-muted-foreground">How Neo Synapse handles health data</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Separator />
          <Link
            to="/downloads"
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Download Mobile App</p>
              <p className="text-sm text-muted-foreground">Install Neo Synapse on Android</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
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
          Neo Synapse v1.0.0 • Patient Portal •{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
