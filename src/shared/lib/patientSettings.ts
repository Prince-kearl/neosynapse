export type JsonObject = Record<string, unknown>;

export type SavedLocationsSettings = {
  home_address: string | null;
  preferred_hospital: string | null;
  other_locations: string | null;
};

export type PaymentInsuranceSettings = {
  insurance_provider: string | null;
  policy_number: string | null;
  member_id: string | null;
  insurance_plan: string | null;
  payment_method: string | null;
};

export type NotificationSettings = {
  appointment_reminders: boolean;
  medication_alerts: boolean;
  health_tips: boolean;
  email_notifications: boolean;
  browser_notifications: boolean | null;
  sms_notifications: boolean;
};

export type PrivacySecuritySettings = {
  profile_visibility: "care_team" | "private";
  two_factor_enabled: boolean;
  biometric_lock: boolean;
  activity_alerts: boolean;
};

export type AppPreferenceSettings = {
  health_data_sync: boolean;
  anonymous_analytics: boolean;
};

export type PatientProfileMeta = {
  saved_locations: SavedLocationsSettings | null;
  payment_insurance: PaymentInsuranceSettings | null;
  notification_settings: NotificationSettings;
  privacy_security_settings: PrivacySecuritySettings;
  settings: AppPreferenceSettings;
};

const asObject = (value: unknown): JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonObject) : {};

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asNullableBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

export function getInsuranceInfo(value: unknown): JsonObject {
  return asObject(value);
}

export function getPatientProfileMeta(insuranceInfo: unknown): PatientProfileMeta {
  const info = getInsuranceInfo(insuranceInfo);
  const meta = asObject(info.profile_meta);
  const savedLocations = asObject(meta.saved_locations);
  const paymentInsurance = asObject(meta.payment_insurance);
  const notificationSettings = asObject(meta.notification_settings);
  const privacySecuritySettings = asObject(meta.privacy_security_settings);
  const settings = asObject(meta.settings);

  const saved_locations =
    meta.saved_locations === null
      ? null
      : {
          home_address: asStringOrNull(savedLocations.home_address),
          preferred_hospital: asStringOrNull(savedLocations.preferred_hospital),
          other_locations: asStringOrNull(savedLocations.other_locations),
        };

  const payment_insurance =
    meta.payment_insurance === null
      ? null
      : {
          insurance_provider: asStringOrNull(paymentInsurance.insurance_provider),
          policy_number: asStringOrNull(paymentInsurance.policy_number),
          member_id: asStringOrNull(paymentInsurance.member_id),
          insurance_plan: asStringOrNull(paymentInsurance.insurance_plan),
          payment_method: asStringOrNull(paymentInsurance.payment_method),
        };

  return {
    saved_locations,
    payment_insurance,
    notification_settings: {
      appointment_reminders: asBoolean(notificationSettings.appointment_reminders, true),
      medication_alerts: asBoolean(notificationSettings.medication_alerts, true),
      health_tips: asBoolean(notificationSettings.health_tips, false),
      email_notifications: asBoolean(notificationSettings.email_notifications, true),
      browser_notifications: asNullableBoolean(notificationSettings.browser_notifications),
      sms_notifications: asBoolean(notificationSettings.sms_notifications, false),
    },
    privacy_security_settings: {
      profile_visibility:
        privacySecuritySettings.profile_visibility === "private" ? "private" : "care_team",
      two_factor_enabled: asBoolean(privacySecuritySettings.two_factor_enabled, false),
      biometric_lock: asBoolean(privacySecuritySettings.biometric_lock, false),
      activity_alerts: asBoolean(privacySecuritySettings.activity_alerts, true),
    },
    settings: {
      health_data_sync: asBoolean(settings.health_data_sync, false),
      anonymous_analytics: asBoolean(settings.anonymous_analytics, true),
    },
  };
}

export function mergePatientProfileMeta(
  insuranceInfo: unknown,
  patch: Partial<PatientProfileMeta>
): JsonObject {
  const baseInsuranceInfo = getInsuranceInfo(insuranceInfo);
  const existingMeta = getPatientProfileMeta(baseInsuranceInfo);

  return {
    ...baseInsuranceInfo,
    profile_meta: {
      ...existingMeta,
      ...patch,
    },
  };
}

export function getNotificationSummary(settings: NotificationSettings): string {
  const labels: string[] = [];
  if (settings.appointment_reminders) labels.push("Appointments");
  if (settings.medication_alerts) labels.push("Medication");
  if (settings.health_tips) labels.push("Health tips");
  if (settings.email_notifications) labels.push("Email");
  if (settings.browser_notifications === true) labels.push("Browser");
  if (settings.sms_notifications) labels.push("SMS");
  return labels.length ? `Enabled: ${labels.join(", ")}` : "No notification preferences saved";
}

export function getPrivacySummary(settings: PrivacySecuritySettings): string {
  const visibility = settings.profile_visibility === "private" ? "Private" : "Care team only";
  const controls: string[] = [];
  if (settings.two_factor_enabled) controls.push("2FA");
  if (settings.biometric_lock) controls.push("Biometric");
  if (settings.activity_alerts) controls.push("Alerts");
  return controls.length ? `Visibility: ${visibility} • ${controls.join(", ")}` : `Visibility: ${visibility}`;
}
