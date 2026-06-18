import { describe, expect, it } from "vitest";
import {
  getNotificationSummary,
  getPatientProfileMeta,
  getPrivacySummary,
  mergePatientProfileMeta,
} from "@/shared/lib/patientSettings";

describe("patient settings helpers", () => {
  it("normalizes missing settings to app defaults", () => {
    const meta = getPatientProfileMeta(null);

    expect(meta.notification_settings.appointment_reminders).toBe(true);
    expect(meta.notification_settings.browser_notifications).toBeNull();
    expect(meta.notification_settings.sms_notifications).toBe(false);
    expect(meta.privacy_security_settings.profile_visibility).toBe("care_team");
    expect(meta.settings.anonymous_analytics).toBe(true);
  });

  it("merges settings without deleting medical history mirrors", () => {
    const next = mergePatientProfileMeta(
      {
        conditions: ["Asthma"],
        allergies: ["Penicillin"],
        profile_meta: {
          notification_settings: {
            appointment_reminders: true,
          },
        },
      },
      {
        payment_insurance: {
          insurance_provider: "NHIS",
          policy_number: "123",
          member_id: "456",
          insurance_plan: "Family",
          payment_method: "Mobile Money",
        },
      }
    );

    expect(next.conditions).toEqual(["Asthma"]);
    expect(next.allergies).toEqual(["Penicillin"]);
    const profileMeta = next.profile_meta as Record<string, Record<string, unknown>>;
    expect(profileMeta.payment_insurance.insurance_provider).toBe("NHIS");
    expect(profileMeta.notification_settings.appointment_reminders).toBe(true);
  });

  it("builds stable summaries for profile rows", () => {
    const meta = getPatientProfileMeta({
      profile_meta: {
        notification_settings: {
          appointment_reminders: true,
          medication_alerts: false,
          health_tips: true,
          email_notifications: true,
          browser_notifications: true,
          sms_notifications: false,
        },
        privacy_security_settings: {
          profile_visibility: "private",
          two_factor_enabled: true,
          biometric_lock: false,
          activity_alerts: true,
        },
      },
    });

    expect(getNotificationSummary(meta.notification_settings)).toBe("Enabled: Appointments, Health tips, Email, Browser");
    expect(getPrivacySummary(meta.privacy_security_settings)).toBe("Visibility: Private • 2FA, Alerts");
  });
});
