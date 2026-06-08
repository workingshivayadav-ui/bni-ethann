import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTION_API_URL } from "@/lib/api/config";

function backendBase(): string {
  return (process.env.API_URL || PRODUCTION_API_URL).replace(/\/$/, "");
}

export const Route = createFileRoute("/api/members/files/delivery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const incoming = new URL(request.url);
        const backend = new URL(`${backendBase()}/api/members/files/delivery`);
        incoming.searchParams.forEach((value, key) => {
          backend.searchParams.set(key, value);
        });

        const res = await fetch(backend.toString());
        const headers = new Headers();
        const contentType = res.headers.get("content-type");
        const disposition = res.headers.get("content-disposition");
        const cacheControl = res.headers.get("cache-control");
        if (contentType) headers.set("content-type", contentType);
        if (disposition) headers.set("content-disposition", disposition);
        if (cacheControl) headers.set("cache-control", cacheControl);

        return new Response(await res.arrayBuffer(), {
          status: res.status,
          headers,
        });
      },
    },
  },
});
