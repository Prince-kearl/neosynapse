import { describe, expect, it } from "vitest";
import { normalizeAdminSettings } from "@/shared/hooks/useAdminSettings";

describe("normalizeAdminSettings", () => {
  it("uses admin-safe defaults when settings are missing", () => {
    expect(normalizeAdminSettings(null)).toMatchObject({
      systemAlerts: true,
      newRegistrations: false,
      auditLoggingVisible: true,
      dataRetentionDays: "90",
      theme: undefined,
      language: undefined,
    });
  });

  it("maps persisted admin settings into runtime settings", () => {
    expect(
      normalizeAdminSettings({
        system_alerts: false,
        new_registrations: true,
        audit_logging_visible: false,
        data_retention_days: "365",
        theme: "dark",
        language: "fr",
      })
    ).toMatchObject({
      systemAlerts: false,
      newRegistrations: true,
      auditLoggingVisible: false,
      dataRetentionDays: "365",
      theme: "dark",
      language: "fr",
    });
  });
});
