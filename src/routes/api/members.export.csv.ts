import { createFileRoute } from "@tanstack/react-router";
import { apiUrl } from "@/lib/api/client";
import type { MemberRow } from "@/lib/api/members.types";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("; ") : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const Route = createFileRoute("/api/members/export/csv")({
  server: {
    handlers: {
      GET: async () => {
        const res = await fetch(apiUrl("/api/members"));
        if (!res.ok) {
          return new Response("Failed to load members", { status: 502 });
        }
        const { members } = (await res.json()) as { members: MemberRow[] };

        const headers = [
          "Submitted",
          "First Name",
          "Last Name",
          "Profession",
          "Tagline",
          "Company",
          "Website",
          "Services",
          "Ideal Referral",
          "Service Area",
          "Mobile",
          "Email",
          "Address",
          "WhatsApp",
          "LinkedIn",
          "Notes",
        ];
        const lines = [headers.join(",")];
        for (const m of members) {
          lines.push(
            [
              m.createdAt,
              m.firstName,
              m.lastName,
              m.profession,
              m.tagline,
              m.company,
              m.website,
              m.services,
              m.referral,
              m.serviceArea,
              m.mobile,
              m.email,
              m.address,
              m.whatsapp,
              m.linkedin,
              m.notes,
            ]
              .map(csvEscape)
              .join(",")
          );
        }
        return new Response(lines.join("\n"), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="bni-ethan-roster.csv"`,
          },
        });
      },
    },
  },
});
