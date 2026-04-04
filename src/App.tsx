import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Auth pages
import SignIn from "@/auth/pages/SignIn";
import PatientSignUp from "@/auth/pages/PatientSignUp";
import InviteAccept from "@/auth/pages/InviteAccept";
import ForgotPassword from "@/auth/pages/ForgotPassword";
import RoleRedirect from "@/auth/pages/RoleRedirect";

// Guards
import { PatientGuard } from "@/auth/guards/PatientGuard";
import { ProfessionalGuard } from "@/auth/guards/ProfessionalGuard";
import { AdminGuard } from "@/auth/guards/AdminGuard";

// Layouts
import { PatientLayout } from "@/apps/patient/layouts/PatientLayout";
import { ProfessionalLayout } from "@/apps/professional/layouts/ProfessionalLayout";
import { AdminLayout } from "@/apps/admin/layouts/AdminLayout";

// Patient pages
import PatientDashboard from "@/apps/patient/pages/Dashboard";
import PatientAIAssistant from "@/apps/patient/pages/AIAssistant";
import PatientSymptomChecker from "@/apps/patient/pages/SymptomChecker";
import PatientAppointments from "@/apps/patient/pages/Appointments";
import PatientTelemedicine from "@/apps/patient/pages/Telemedicine";
import PatientReports from "@/apps/patient/pages/Reports";
import PatientProfile from "@/apps/patient/pages/Profile";
import PatientSettings from "@/apps/patient/pages/Settings";
import PatientMedicalHistorySetup from "@/apps/patient/pages/MedicalHistorySetup";

// Professional pages
import ProfessionalDashboard from "@/apps/professional/pages/Dashboard";
import ProfessionalPatients from "@/apps/professional/pages/Patients";
import ProfessionalPatientDetail from "@/apps/professional/pages/PatientDetail";
import ProfessionalEncounters from "@/apps/professional/pages/Encounters";
import ProfessionalTelemedicine from "@/apps/professional/pages/Telemedicine";
import ProfessionalTranscripts from "@/apps/professional/pages/Transcripts";
import ProfessionalNotes from "@/apps/professional/pages/Notes";
import ProfessionalReports from "@/apps/professional/pages/Reports";
import ProfessionalSettings from "@/apps/professional/pages/Settings";

// Admin pages
import AdminDashboard from "@/apps/admin/pages/Dashboard";
import AdminUsers from "@/apps/admin/pages/Users";
import AdminInvitations from "@/apps/admin/pages/Invitations";
import AdminFacilities from "@/apps/admin/pages/Facilities";
import AdminRoles from "@/apps/admin/pages/Roles";
import AdminTemplates from "@/apps/admin/pages/Templates";
import AdminAudit from "@/apps/admin/pages/Audit";
import AdminSettings from "@/apps/admin/pages/Settings";

// Not Found
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Root redirect */}
                <Route path="/" element={<RoleRedirect />} />

                {/* Auth routes */}
                <Route path="/auth/sign-in" element={<SignIn />} />
                <Route path="/auth/patient-sign-up" element={<PatientSignUp />} />
                <Route path="/auth/invite-accept" element={<InviteAccept />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                {/* Legacy auth route redirect */}
                <Route path="/auth" element={<Navigate to="/auth/sign-in" replace />} />

                {/* Patient routes */}
                <Route path="/patient" element={<PatientGuard><PatientLayout /></PatientGuard>}>
                  <Route path="onboarding/medical-history" element={<PatientMedicalHistorySetup />} />
                  <Route path="dashboard" element={<PatientDashboard />} />
                  <Route path="ai-assistant" element={<PatientAIAssistant />} />
                  <Route path="symptom-checker" element={<PatientSymptomChecker />} />
                  <Route path="appointments" element={<PatientAppointments />} />
                  <Route path="telemedicine" element={<PatientTelemedicine />} />
                  <Route path="reports" element={<PatientReports />} />
                  <Route path="reports/:reportId" element={<PatientReports />} />
                  <Route path="medical-history" element={<PatientMedicalHistorySetup />} />
                  <Route path="profile" element={<PatientProfile />} />
                  <Route path="settings" element={<PatientSettings />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Professional routes */}
                <Route path="/professional" element={<ProfessionalGuard><ProfessionalLayout /></ProfessionalGuard>}>
                  <Route path="dashboard" element={<ProfessionalDashboard />} />
                  <Route path="patients" element={<ProfessionalPatients />} />
                  <Route path="patient/:patientId" element={<ProfessionalPatientDetail />} />
                  <Route path="encounters" element={<ProfessionalEncounters />} />
                  <Route path="telemedicine" element={<ProfessionalTelemedicine />} />
                  <Route path="transcripts" element={<ProfessionalTranscripts />} />
                  <Route path="transcripts/:transcriptId" element={<ProfessionalTranscripts />} />
                  <Route path="notes" element={<ProfessionalNotes />} />
                  <Route path="notes/:noteId/edit" element={<ProfessionalNotes />} />
                  <Route path="reports" element={<ProfessionalReports />} />
                  <Route path="reports/:reportId" element={<ProfessionalReports />} />
                  <Route path="settings" element={<ProfessionalSettings />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Admin routes */}
                <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="invitations" element={<AdminInvitations />} />
                  <Route path="facilities" element={<AdminFacilities />} />
                  <Route path="roles" element={<AdminRoles />} />
                  <Route path="templates" element={<AdminTemplates />} />
                  <Route path="audit" element={<AdminAudit />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Legacy route redirects */}
                <Route path="/explore" element={<Navigate to="/patient/ai-assistant" replace />} />
                <Route path="/orders" element={<Navigate to="/patient/appointments" replace />} />
                <Route path="/saved" element={<Navigate to="/patient/reports" replace />} />
                <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
                <Route path="/settings" element={<Navigate to="/patient/settings" replace />} />
                <Route path="/symptom-checker" element={<Navigate to="/patient/symptom-checker" replace />} />
                <Route path="/telemedicine" element={<Navigate to="/patient/telemedicine" replace />} />
                <Route path="/reports" element={<Navigate to="/patient/reports" replace />} />
                <Route path="/ai-assistant" element={<Navigate to="/patient/ai-assistant" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
