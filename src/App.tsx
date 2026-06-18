import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppThemeSync } from "@/components/AppThemeSync";
import { NotificationRuntime } from "@/components/NotificationRuntime";

// Auth pages
const SignIn = lazy(() => import("@/auth/pages/SignIn"));
const PatientSignUp = lazy(() => import("@/auth/pages/PatientSignUp"));
const InviteAccept = lazy(() => import("@/auth/pages/InviteAccept"));
const ForgotPassword = lazy(() => import("@/auth/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/auth/pages/ResetPassword"));
const RoleRedirect = lazy(() => import("@/auth/pages/RoleRedirect"));

// Guards
import { PatientGuard } from "@/auth/guards/PatientGuard";
import { ProfessionalGuard } from "@/auth/guards/ProfessionalGuard";
import { AdminGuard } from "@/auth/guards/AdminGuard";

// Layouts
const PatientLayout = lazy(() => import("@/apps/patient/layouts/PatientLayout").then((module) => ({ default: module.PatientLayout })));
const ProfessionalLayout = lazy(() => import("@/apps/professional/layouts/ProfessionalLayout").then((module) => ({ default: module.ProfessionalLayout })));
const AdminLayout = lazy(() => import("@/apps/admin/layouts/AdminLayout").then((module) => ({ default: module.AdminLayout })));

// Patient pages
const PatientDashboard = lazy(() => import("@/apps/patient/pages/Dashboard"));
const PatientAIAssistant = lazy(() => import("@/apps/patient/pages/AIAssistant"));
const PatientSymptomChecker = lazy(() => import("@/apps/patient/pages/SymptomChecker"));
const PatientAppointments = lazy(() => import("@/apps/patient/pages/Appointments"));
const PatientAppointmentBooking = lazy(() => import("@/apps/patient/pages/AppointmentBooking"));
const PatientTelemedicine = lazy(() => import("@/apps/patient/pages/Telemedicine"));
const PatientReports = lazy(() => import("@/apps/patient/pages/Reports"));
const PatientProfile = lazy(() => import("@/apps/patient/pages/Profile"));
const PatientSettings = lazy(() => import("@/apps/patient/pages/Settings"));
const PatientNotifications = lazy(() => import("@/apps/patient/pages/Notifications"));
const PatientMedicalHistorySetup = lazy(() => import("@/apps/patient/pages/MedicalHistorySetup"));

// Professional pages
const ProfessionalDashboard = lazy(() => import("@/apps/professional/pages/Dashboard"));
const ProfessionalPatients = lazy(() => import("@/apps/professional/pages/Patients"));
const ProfessionalPatientDetail = lazy(() => import("@/apps/professional/pages/PatientDetail"));
const ProfessionalEncounters = lazy(() => import("@/apps/professional/pages/Encounters"));
const ProfessionalTelemedicine = lazy(() => import("@/apps/professional/pages/Telemedicine"));
const ProfessionalAppointments = lazy(() => import("@/apps/professional/pages/Appointments"));
const ProfessionalTranscripts = lazy(() => import("@/apps/professional/pages/Transcripts"));
const ProfessionalNotes = lazy(() => import("@/apps/professional/pages/Notes"));
const ProfessionalReports = lazy(() => import("@/apps/professional/pages/Reports"));
const ProfessionalSettings = lazy(() => import("@/apps/professional/pages/Settings"));
const ProfessionalNotifications = lazy(() => import("@/apps/professional/pages/Notifications"));

// Admin pages
const AdminDashboard = lazy(() => import("@/apps/admin/pages/Dashboard"));
const AdminUsers = lazy(() => import("@/apps/admin/pages/Users"));
const AdminInvitations = lazy(() => import("@/apps/admin/pages/Invitations"));
const AdminFacilities = lazy(() => import("@/apps/admin/pages/Facilities"));
const AdminRoles = lazy(() => import("@/apps/admin/pages/Roles"));
const AdminTemplates = lazy(() => import("@/apps/admin/pages/Templates"));
const AdminAudit = lazy(() => import("@/apps/admin/pages/Audit"));
const AdminSettings = lazy(() => import("@/apps/admin/pages/Settings"));
const AdminQuickActions = lazy(() => import("@/apps/admin/pages/QuickActions"));
const AdminNotifications = lazy(() => import("@/apps/admin/pages/Notifications"));
const AdminNotificationTemplates = lazy(() => import("@/apps/admin/pages/NotificationTemplates"));

// Not Found
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <AppThemeSync />
        <LanguageProvider>
          <NotificationRuntime />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Root redirect */}
                <Route path="/" element={<RoleRedirect />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/downloads" element={<DownloadApp />} />
                <Route path="/download" element={<Navigate to="/downloads" replace />} />

                {/* Auth routes */}
                <Route path="/auth/sign-in" element={<SignIn />} />
                <Route path="/auth/patient-sign-up" element={<PatientSignUp />} />
                <Route path="/auth/invite-accept" element={<InviteAccept />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                {/* Legacy auth route redirect */}
                <Route path="/auth" element={<Navigate to="/auth/sign-in" replace />} />

                {/* Patient routes */}
                <Route path="/patient" element={<PatientGuard><PatientLayout /></PatientGuard>}>
                  <Route path="onboarding/medical-history" element={<PatientMedicalHistorySetup />} />
                  <Route path="dashboard" element={<PatientDashboard />} />
                  <Route path="ai-assistant" element={<PatientAIAssistant />} />
                  <Route path="symptom-checker" element={<PatientSymptomChecker />} />
                  <Route path="appointments" element={<PatientAppointments />} />
                  <Route path="appointments/book" element={<PatientAppointmentBooking />} />
                  <Route path="telemedicine" element={<PatientTelemedicine />} />
                  <Route path="reports" element={<PatientReports />} />
                  <Route path="reports/:reportId" element={<PatientReports />} />
                  <Route path="medical-history" element={<PatientMedicalHistorySetup />} />
                  <Route path="profile" element={<PatientProfile />} />
                  <Route path="notifications" element={<PatientNotifications />} />
                  <Route path="settings" element={<PatientSettings />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Professional routes */}
                <Route path="/professional" element={<ProfessionalGuard><ProfessionalLayout /></ProfessionalGuard>}>
                  <Route path="dashboard" element={<ProfessionalDashboard />} />
                  <Route path="patients" element={<ProfessionalPatients />} />
                  <Route path="patient/:patientId" element={<ProfessionalPatientDetail />} />
                  <Route path="encounters" element={<ProfessionalEncounters />} />
                  <Route path="appointments" element={<ProfessionalAppointments />} />
                  <Route path="telemedicine" element={<ProfessionalTelemedicine />} />
                  <Route path="transcripts" element={<ProfessionalTranscripts />} />
                  <Route path="transcripts/:transcriptId" element={<ProfessionalTranscripts />} />
                  <Route path="notes" element={<ProfessionalNotes />} />
                  <Route path="notes/:noteId/edit" element={<ProfessionalNotes />} />
                  <Route path="reports" element={<ProfessionalReports />} />
                  <Route path="reports/:reportId" element={<ProfessionalReports />} />
                  <Route path="notifications" element={<ProfessionalNotifications />} />
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
                  <Route path="quick-actions" element={<AdminQuickActions />} />
                  <Route path="templates" element={<AdminTemplates />} />
                  <Route path="audit" element={<AdminAudit />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="notification-templates" element={<AdminNotificationTemplates />} />
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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
