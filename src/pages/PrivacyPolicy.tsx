import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Bell, Brain, Database, FileText, Lock, Shield, Stethoscope, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const updatedAt = "18 June 2026";

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    body: [
      "Account and profile details such as name, email, date of birth, gender, phone number, emergency contact, preferred language, and role.",
      "Health information you choose to save, including medical history, conditions, allergies, medications, surgeries, family history, notes, appointments, reports, uploaded medical documents, and telemedicine encounter records.",
      "Consent choices, notification preferences, privacy settings, audit events, and technical information needed to keep the service secure and reliable.",
    ],
  },
  {
    icon: Stethoscope,
    title: "How We Use Information",
    body: [
      "To provide patient portal features, appointment booking, telemedicine, professional review workflows, medical record exports, and notifications.",
      "To personalize AI medical guidance, symptom triage, and health summaries using your saved medical history and documents where you have provided the required consent.",
      "To support security monitoring, audit trails, troubleshooting, service reliability, and account support.",
    ],
  },
  {
    icon: UserCheck,
    title: "Who Can Access Health Data",
    body: [
      "Patients can access their own records and manage profile, medical history, consent, notification, and privacy preferences.",
      "Healthcare professionals can access patient information only where it is connected to assigned appointments, encounters, reports, or care workflows permitted by the system.",
      "Administrators may access operational records where required for platform management, compliance, support, and security.",
    ],
  },
  {
    icon: Brain,
    title: "AI and Medical Guidance",
    body: [
      "AI outputs are decision-support information and are not a replacement for a licensed clinician, emergency service, or formal diagnosis.",
      "Saved medical history can improve AI context, symptom analysis, and appointment review, but you can update your records and consent settings over time.",
      "AI medical assistant use requires explicit consent before medical advice features are enabled.",
    ],
  },
  {
    icon: Bell,
    title: "Notifications and Mobile Use",
    body: [
      "Neo Synapse may send in-app, web, SMS, email, or mobile notifications depending on your preferences and the available platform configuration.",
      "Without Apple APNs or Android FCM provider setup, mobile notifications may be limited to in-app alerts while the app is open.",
      "Notification content may include appointment reminders, telemedicine call alerts, security alerts, and health-related updates.",
    ],
  },
  {
    icon: Lock,
    title: "Security and Retention",
    body: [
      "We use access controls, row-level permissions, audit logs, and secure storage patterns to protect health data.",
      "Medical records are retained while your account is active or as needed for care, legal, security, and operational purposes.",
      "You can export your medical records from Settings and request account deletion from the app.",
    ],
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 p-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="truncate font-display text-lg font-bold">Neo Synapse</span>
          </Link>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 p-4 py-8 lg:p-6 lg:py-10">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            <Shield className="h-3.5 w-3.5" />
            Privacy Policy
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">How Neo Synapse handles your health data</h1>
            <p className="max-w-3xl text-muted-foreground">
              This policy explains what information Neo Synapse collects, how it is used, who can access it, and the controls available to you.
            </p>
            <p className="text-sm text-muted-foreground">Last updated: {updatedAt}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-2">
              <h2 className="font-display text-lg font-semibold">Important medical notice</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Neo Synapse supports care coordination, records management, telemedicine, and AI-assisted guidance. It does not replace emergency care or professional medical judgment. If you have urgent symptoms, contact local emergency services or a qualified healthcare professional.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <article key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-food-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-lg font-semibold">{section.title}</h2>
                </div>
                <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-food-card">
          <h2 className="mb-3 font-display text-lg font-semibold">Your Choices</h2>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>You can update your medical history, profile visibility, notification settings, AI consent, recording consent, and analytics preferences from your account settings.</p>
            <p>You can export your medical records from Settings. You can also request account deletion from the profile or settings area.</p>
            <p>For privacy or support questions, contact support@neosynapse.health.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
