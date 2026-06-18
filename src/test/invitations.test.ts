import { describe, expect, it } from "vitest";

const getDefaultInvitationSender = (sender?: string | null) =>
  sender || "Neo Synapse <onboarding@resend.dev>";

describe("invitation email configuration", () => {
  it("uses the safe Resend onboarding sender unless a verified sender is configured", () => {
    expect(getDefaultInvitationSender()).toBe("Neo Synapse <onboarding@resend.dev>");
    expect(getDefaultInvitationSender("Neo Synapse <noreply@neosynapse.health>")).toBe("Neo Synapse <noreply@neosynapse.health>");
  });
});
