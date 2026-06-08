import { resolveBackendBase } from "@/lib/api/config";

/** Base URL for the Express backend. Empty string = same-origin (Vite proxy in dev). */
export function getApiBase(): string {
  return resolveBackendBase(typeof window !== "undefined");
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

const API_TIMEOUT_MS = 25_000;

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const signal =
    init?.signal ??
    (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(API_TIMEOUT_MS)
      : undefined);

  return fetch(apiUrl(path), { ...init, signal });
}
