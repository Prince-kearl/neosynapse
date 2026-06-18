import { describe, expect, it } from "vitest";
import { normalizeProfessionalSettings } from "@/shared/hooks/useProfessionalSettings";

describe("professional settings", () => {
  it("defaults alerts and activity timeline visibility on", () => {
    const settings = normalizeProfessionalSettings({});

    expect(settings.patientAlerts).toBe(true);
    expect(settings.activityLoggingVisible).toBe(true);
  });

  it("respects saved disabled preferences and persisted display options", () => {
    const settings = normalizeProfessionalSettings({
      patient_alerts: false,
      activity_logging_visible: false,
      theme: "dark",
      language: "tw",
    });

    expect(settings.patientAlerts).toBe(false);
    expect(settings.activityLoggingVisible).toBe(false);
    expect(settings.theme).toBe("dark");
    expect(settings.language).toBe("tw");
  });
});
