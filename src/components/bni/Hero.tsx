import { Shield, Clock, Calendar, Users } from "lucide-react";

export function Hero() {
  return (
    <section className="bg-white border-b border-gray-100 px-6 py-11 text-center">
      <div className="inline-flex items-center gap-2 bg-[var(--bni-red-lt)] border border-[var(--bni-red)]/20 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-[var(--bni-red)] uppercase tracking-wider mb-4">
        <Shield className="w-3 h-3" strokeWidth={2.5} />
        2026 Roster Data Collection
      </div>
      <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight text-gray-900">
        Submit Your <em className="text-[var(--bni-red)] not-italic font-black">Member Profile</em>
      </h1>
      <p className="mt-3 text-gray-600 max-w-xl mx-auto">
        Fill in your details for the BNI Ethan 2026 Roster.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {[
          { icon: Clock, label: "Takes 3 minutes" },
          { icon: Calendar, label: "Every Wednesday · 7:00 AM" },
          { icon: Users, label: "Navi Mumbai" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="inline-flex items-center gap-2 bg-[var(--bni-navy-lt)] text-[var(--bni-navy)] rounded-full px-3 py-1.5 text-xs font-medium"
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
