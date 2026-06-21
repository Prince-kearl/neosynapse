export const DEFAULT_PUBLIC_APP_URL = "https://neosynapseai.com";

export const normalizePublicAppUrl = (url?: string) =>
  (url?.trim() || DEFAULT_PUBLIC_APP_URL).replace(/\/+$/, "");

export const PUBLIC_APP_URL = normalizePublicAppUrl(import.meta.env.VITE_APP_URL);

export const buildPublicAppUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_APP_URL}${normalizedPath}`;
};
