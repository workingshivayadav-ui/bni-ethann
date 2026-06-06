import { useState, useMemo } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { MemberRow, MembersResponse } from "@/lib/api/members.types";
import {
  Mail,
  Phone,
  Image as ImageIcon,
  Search,
  X,
} from "lucide-react";

export const membersQueryOptions = queryOptions({
  queryKey: ["members"],
  queryFn: async (): Promise<MembersResponse> => {
    const res = await apiFetch("/api/members");
    if (!res.ok) throw new Error("Failed to load members");
    return res.json();
  },
});

const ROSTER_TARGET = 24;

export function RosterPanel() {
  const { data } = useSuspenseQuery(membersQueryOptions);
  const members = data.members;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const hay = [
        m.firstName,
        m.lastName,
        m.company,
        m.profession,
        m.serviceArea,
        ...m.services,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [members, query]);

  const pct = Math.min(100, Math.round((members.length / ROSTER_TARGET) * 100));

  return (
    <aside className="bg-[var(--off-white)] p-6 md:p-7 md:border-l border-gray-100">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <h2 className="font-display font-black text-2xl text-gray-900">
          Submitted Members
        </h2>
        <span className="bg-[var(--bni-red)] text-white text-xs font-bold px-3 py-1 rounded-full">
          {members.length}
        </span>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--bni-red)] to-[var(--bni-navy)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[11px] text-gray-400 text-right mt-1 mb-4 font-medium">
        {members.length} of {ROSTER_TARGET} target
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--bni-red)]/20 focus:border-[var(--bni-red)] transition"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-right text-[11px] text-gray-400 font-medium mb-3">
        {filtered.length} shown
      </div>

      <div className="max-h-[480px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-10 h-10 mx-auto opacity-50" strokeWidth={1.5} />
            <p className="text-sm mt-3">
              No members match your search.
              <br />
              Try a different keyword.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function MemberCard({ member }: { member: MemberRow }) {
  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition">
      <div className="h-1 bg-[var(--bni-red)]" />
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-gray-100 overflow-hidden bg-[var(--bni-navy-lt)] flex items-center justify-center font-display font-black text-base text-[var(--bni-navy)] shrink-0">
          {member.photoDataUrl ? (
            <img src={member.photoDataUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            initials || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-gray-900 leading-tight">
            {member.firstName} {member.lastName}
          </div>
          <div className="text-[11px] text-gray-400 font-medium">{member.profession}</div>
          <div className="text-xs font-semibold text-[var(--bni-red)] mt-0.5">{member.company}</div>
          {member.services.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {member.services.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bni-navy-lt)] text-[var(--bni-navy)] font-semibold border border-[var(--bni-navy)]/10"
                >
                  {s}
                </span>
              ))}
              {member.services.length > 4 && (
                <span className="text-[10px] text-gray-400 self-center">
                  +{member.services.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
            member.photoDataUrl ? "text-[var(--bni-navy)]" : "text-gray-300"
          }`}
          title={member.photoDataUrl ? "Photo attached" : "No photo"}
        >
          <ImageIcon className="w-3 h-3" />
        </span>
      </div>
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2 no-print">
        <div className="flex items-center gap-3 min-w-0 text-xs text-gray-600">
          <a href={`tel:${member.mobile}`} className="flex items-center gap-1 hover:text-[var(--bni-red)]">
            <Phone className="w-3 h-3 text-[var(--bni-red)]" />
            <span className="truncate">{member.mobile}</span>
          </a>
          <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:text-[var(--bni-red)] min-w-0">
            <Mail className="w-3 h-3 text-[var(--bni-red)]" />
            <span className="truncate max-w-[140px]">{member.email}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
