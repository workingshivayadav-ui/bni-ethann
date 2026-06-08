import { useState, useMemo, type ComponentType } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { MemberRow, MembersResponse } from "@/lib/api/members.types";
import { enrichMembers } from "@/lib/api/members.normalize";
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
  MapPin,
  Globe,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { DocumentGallery } from "@/components/bni/DocumentGallery";

export const membersQueryOptions = queryOptions({
  queryKey: ["members"],
  staleTime: 0,
  queryFn: async (): Promise<MembersResponse> => {
    const res = await apiFetch("/api/members");
    if (!res.ok) throw new Error("Failed to load members");
    const data: MembersResponse = await res.json();
    return { ...data, members: enrichMembers(data.members) };
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
      <aside className="bni-roster-panel p-6 md:p-7">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
          <h2 className="font-display font-black text-2xl text-gray-900">
            Submitted Members
          </h2>
          <span className="bni-badge bni-badge--count">{members.length}</span>
        </div>

        <div className="bni-progress-track">
          <div className="bni-progress-fill" style={{ width: `${pct}%` }} />
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
            className="bni-input pl-9 pr-9 py-2.5"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="bni-btn-icon absolute right-2 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-right text-[11px] text-gray-400 font-medium mb-3">
          {filtered.length} shown
        </div>

        <div className="max-h-[480px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-hide">
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
    <div className="bni-member-card">
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
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                member.photoDataUrl ? "text-[var(--bni-navy)]" : "text-gray-300"
              }`}
              title={member.photoDataUrl ? "Photo attached" : "No photo"}
            >
              <ImageIcon className="w-3 h-3" />
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                member.attachments.length > 0 ? "text-emerald-700" : "text-gray-300"
              }`}
              title={
                member.attachments.length > 0
                  ? `${member.attachments.length} document(s)`
                  : "No documents"
              }
            >
              <Paperclip className="w-3 h-3" />
              {member.attachments.length > 0 ? member.attachments.length : null}
            </span>
          </div>
          <button
            type="button"
            onClick={onView}
            className="bni-btn-navy px-3 py-1.5 text-[10px]"
          >
            <Eye className="w-3.5 h-3.5" />
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 gap-0 scrollbar-hide">
        <div className="bg-[var(--bni-navy)] px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">
              {member.firstName} {member.lastName}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/75 mt-1">{member.profession}</p>
          <p className="text-sm font-semibold text-[var(--bni-gold-lt)]">{member.company}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex gap-4 items-start">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-[var(--bni-navy-lt)] shrink-0 border-2 border-gray-100 shadow-sm">
              {member.photoDataUrl ? (
                <img src={member.photoDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display font-bold text-2xl text-[var(--bni-navy)]">
                  {member.firstName[0]}
                  {member.lastName[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {member.tagline && (
                <p className="text-sm italic text-gray-600 mb-3">"{member.tagline}"</p>
              )}
              {member.services.length > 0 && (
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
              )}
            </div>
          </div>

          <section>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-3">
              Contact & business
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
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
              {member.serviceArea && (
                <DetailRow icon={MapPin} label="Service area" value={member.serviceArea} />
              )}
              {member.referral && (
                <DetailRow icon={FileText} label="Ideal referral" value={member.referral} />
              )}
              {member.notes && <DetailRow icon={FileText} label="Notes" value={member.notes} />}
            </div>
          </section>

          <section className="rounded-lg border border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 to-white p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Uploaded documents ({member.attachments.length})
              </h3>
            </div>
            <DocumentGallery items={member.attachments} status="uploaded" />
            {member.storageFolder && (
              <p className="text-[10px] text-gray-400 mt-3">Storage folder: {member.storageFolder}</p>
            )}
          </section>

          <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-3">
            Submitted {new Date(member.createdAt).toLocaleString()}
          </p>
        </div>
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
