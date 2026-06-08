import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTION_API_URL } from "@/lib/api/config";

function backendBase(): string {
  return (process.env.API_URL || PRODUCTION_API_URL).replace(/\/$/, "");
}

async function proxyToBackend(request: Request, method: string): Promise<Response> {
  const url = `${backendBase()}/api/members`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const res = await fetch(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await request.text(),
    signal: AbortSignal.timeout(20_000),
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export const Route = createFileRoute("/api/members")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToBackend(request, "GET"),
      POST: async ({ request }) => proxyToBackend(request, "POST"),
    },
  },
});
