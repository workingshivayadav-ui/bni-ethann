import { useState, useMemo, type ComponentType } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { MemberRow, MembersResponse } from "@/lib/api/members.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Phone,
  Image as ImageIcon,
  Search,
  X,
  Eye,
  Paperclip,
  ExternalLink,
  MapPin,
  Globe,
  FileText,
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
  const [viewMember, setViewMember] = useState<MemberRow | null>(null);

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
    <>
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
                <MemberCard key={m.id} member={m} onView={() => setViewMember(m)} />
              ))}
            </div>
          )}
        </div>
      </aside>

      <MemberDetailDialog member={viewMember} onClose={() => setViewMember(null)} />
    </>
  );
}

function MemberCard({
  member,
  onView,
}: {
  member: MemberRow;
  onView: () => void;
}) {
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
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
              member.photoDataUrl ? "text-[var(--bni-navy)]" : "text-gray-300"
            }`}
            title={member.photoDataUrl ? "Photo attached" : "No photo"}
          >
            <ImageIcon className="w-3 h-3" />
          </span>
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-[var(--bni-navy)] hover:bg-[var(--bni-red)] rounded-full px-2.5 py-1 transition"
          >
            <Eye className="w-3 h-3" />
            View
          </button>
        </div>
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

function MemberDetailDialog({
  member,
  onClose,
}: {
  member: MemberRow | null;
  onClose: () => void;
}) {
  if (!member) return null;

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {member.firstName} {member.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 items-start">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--bni-navy-lt)] shrink-0 border-2 border-gray-100">
            {member.photoDataUrl ? (
              <img src={member.photoDataUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display font-bold text-[var(--bni-navy)]">
                {member.firstName[0]}
                {member.lastName[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600">{member.profession}</p>
            <p className="text-sm font-semibold text-[var(--bni-red)]">{member.company}</p>
            {member.tagline && (
              <p className="text-xs italic text-gray-500 mt-1">"{member.tagline}"</p>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <DetailRow icon={Phone} label="Mobile" value={member.mobile} href={`tel:${member.mobile}`} />
          <DetailRow icon={Mail} label="Email" value={member.email} href={`mailto:${member.email}`} />
          {member.whatsapp && (
            <DetailRow icon={Phone} label="WhatsApp" value={member.whatsapp} href={`tel:${member.whatsapp}`} />
          )}
          {member.website && (
            <DetailRow icon={Globe} label="Website" value={member.website} href={member.website} external />
          )}
          {member.linkedin && (
            <DetailRow icon={Globe} label="LinkedIn" value={member.linkedin} href={member.linkedin} external />
          )}
          {member.address && <DetailRow icon={MapPin} label="Address" value={member.address} />}
          {member.serviceArea && <DetailRow icon={MapPin} label="Service area" value={member.serviceArea} />}
          {member.referral && <DetailRow icon={FileText} label="Ideal referral" value={member.referral} />}
          {member.notes && <DetailRow icon={FileText} label="Notes" value={member.notes} />}
        </div>

        {member.services.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">Services</div>
            <div className="flex flex-wrap gap-1.5">
              {member.services.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--bni-navy-lt)] text-[var(--bni-navy)] font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
            Documents ({member.attachments.length})
          </div>
          {member.attachments.length === 0 ? (
            <p className="text-xs text-gray-400">No documents uploaded.</p>
          ) : (
            <ul className="space-y-2">
              {member.attachments.map((a) => (
                <li
                  key={a.name + a.size}
                  className="flex items-center justify-between gap-2 border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-[var(--bni-red)] shrink-0" />
                    <span className="text-sm truncate">{a.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(a.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--bni-navy)] hover:text-[var(--bni-red)] shrink-0"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {member.storageFolder && (
            <p className="text-[10px] text-gray-400 mt-2">Stored in: {member.storageFolder}</p>
          )}
        </div>

        <p className="text-[10px] text-gray-400">
          Submitted {new Date(member.createdAt).toLocaleString()}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = href ? (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-[var(--bni-navy)] hover:text-[var(--bni-red)] break-words"
    >
      {value}
    </a>
  ) : (
    <span className="text-gray-900 break-words">{value}</span>
  );

  return (
    <div className="flex gap-2">
      <Icon className="w-4 h-4 text-[var(--bni-red)] shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
        <div className="text-sm">{content}</div>
      </div>
    </div>
  );
}
