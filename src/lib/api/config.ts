/** Production Express API (Railway). Used when env vars are not set. */
export const PRODUCTION_API_URL =
  "https://bni-ethan-backend-production.up.railway.app";

export const LOCAL_API_URL = "http://localhost:4000";

export function resolveBackendBase(isBrowser: boolean): string {
  // Browser always uses same-origin /api/* (Vercel or Vite proxy) — avoids CORS/timeouts.
  if (isBrowser) return "";

  const fromEnv = process.env.API_URL || process.env.VITE_API_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }

  const isProd =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  if (isProd) return PRODUCTION_API_URL;

  return LOCAL_API_URL;
}
