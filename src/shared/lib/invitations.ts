export const buildInvitationLink = (origin: string, token: string) => {
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/auth/invite-accept?token=${encodeURIComponent(token)}`;
};

export const buildInvitationMessage = (inviteLink: string, role: string) =>
  `You're invited to join Neo Synapse as a ${role}. Open this secure invitation link and sign in with the invited email account to accept access: ${inviteLink}`;

export const buildWhatsAppShareUrl = (inviteLink: string, role: string) =>
  `https://wa.me/?text=${encodeURIComponent(buildInvitationMessage(inviteLink, role))}`;

export const buildInvitationEmailSubject = (role: string) =>
  `Invitation to join Neo Synapse as a ${role}`;

export const buildInvitationEmailBody = (inviteLink: string, role: string, recipientEmail: string) =>
  [
    "Hello,",
    "",
    `You have been invited to join Neo Synapse as a ${role}.`,
    "",
    "Open the secure invitation link below, then sign in with your existing Neo Synapse account:",
    inviteLink,
    "",
    `For security, this invitation can only be accepted while signed in as ${recipientEmail}.`,
    "The invitation expires seven days after it was created.",
    "",
    "Regards,",
    "Neo Synapse Administration",
  ].join("\r\n");

export const buildInvitationMailtoUrl = (recipientEmail: string, inviteLink: string, role: string) => {
  const subject = encodeURIComponent(buildInvitationEmailSubject(role));
  const body = encodeURIComponent(buildInvitationEmailBody(inviteLink, role, recipientEmail));

  return `mailto:${encodeURIComponent(recipientEmail)}?subject=${subject}&body=${body}`;
};
