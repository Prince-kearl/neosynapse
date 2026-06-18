export const isConsentGrantedByDefault = (latestConsent?: { granted: boolean } | null) =>
  latestConsent?.granted !== false;

