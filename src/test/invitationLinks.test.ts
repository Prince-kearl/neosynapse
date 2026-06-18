import { describe, expect, it } from "vitest";
import { buildInvitationLink, buildInvitationMessage, buildWhatsAppShareUrl } from "@/shared/lib/invitations";

describe("invitation sharing links", () => {
  it("builds a stable invite accept URL", () => {
    expect(buildInvitationLink("https://app.neosynapse.health/", "abc 123")).toBe(
      "https://app.neosynapse.health/auth/invite-accept?token=abc%20123"
    );
  });

  it("builds a WhatsApp share URL with the invitation message", () => {
    const inviteLink = "https://app.neosynapse.health/auth/invite-accept?token=abc";
    const message = buildInvitationMessage(inviteLink, "professional");
    const shareUrl = buildWhatsAppShareUrl(inviteLink, "professional");

    expect(message).toContain("professional");
    expect(decodeURIComponent(shareUrl)).toContain(inviteLink);
    expect(shareUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});
