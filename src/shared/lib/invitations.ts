export const buildInvitationLink = (origin: string, token: string) => {
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/auth/invite-accept?token=${encodeURIComponent(token)}`;
};

export const buildInvitationMessage = (inviteLink: string, role: string) =>
  `You're invited to join Neo Synapse as a ${role}. Use this secure invitation link to create your account: ${inviteLink}`;

export const buildWhatsAppShareUrl = (inviteLink: string, role: string) =>
  `https://wa.me/?text=${encodeURIComponent(buildInvitationMessage(inviteLink, role))}`;
