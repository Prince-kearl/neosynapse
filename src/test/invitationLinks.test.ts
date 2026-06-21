import { describe, expect, it } from "vitest";
import {
  buildInvitationEmailBody,
  buildInvitationLink,
  buildInvitationMailtoUrl,
  buildInvitationMessage,
  buildWhatsAppShareUrl,
} from "@/shared/lib/invitations";

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
    expect(message).toContain("sign in with the invited email account");
    expect(message).not.toContain("create your account");
    expect(decodeURIComponent(shareUrl)).toContain(inviteLink);
    expect(shareUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it("builds a prefilled email for the invited account", () => {
    const inviteLink = "https://app.neosynapse.health/auth/invite-accept?token=abc";
    const recipient = "doctor+test@example.com";
    const mailtoUrl = buildInvitationMailtoUrl(recipient, inviteLink, "professional");
    const parsed = new URL(mailtoUrl);

    expect(parsed.protocol).toBe("mailto:");
    expect(decodeURIComponent(parsed.pathname)).toBe(recipient);
    expect(parsed.searchParams.get("subject")).toBe("Invitation to join Neo Synapse as a professional");
    expect(parsed.searchParams.get("body")).toBe(buildInvitationEmailBody(inviteLink, "professional", recipient));
    expect(parsed.searchParams.get("body")).toContain("only be accepted while signed in as doctor+test@example.com");
    expect(mailtoUrl).not.toContain("Invitation+to+join");
    expect(mailtoUrl).toContain("Invitation%20to%20join");
    expect(mailtoUrl).toContain("%0D%0A");
    expect(parsed.searchParams.get("body")?.split("\r\n")).toContain(inviteLink);
  });
});
