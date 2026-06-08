import { Shield, Clock, Calendar, Users } from "lucide-react";

export function Hero() {
  return (
    <section className="bni-hero px-6 py-12 md:py-14 text-center">
      <div className="bni-badge bni-badge--red mb-5">
        <Shield className="w-3.5 h-3.5" strokeWidth={2.5} />
        2026 Roster Data Collection
      </div>
      <h1 className="font-display font-black text-4xl md:text-[2.75rem] tracking-tight text-gray-900 leading-tight">
        Submit Your{" "}
        <em className="text-[var(--bni-red)] not-italic font-black">Member Profile</em>
      </h1>
      <p className="mt-4 text-gray-600 max-w-lg mx-auto text-[15px] leading-relaxed">
        Share your professional details, contact information, and documents for the BNI Ethan
        2026 chapter roster.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5 mt-7">
        {[
          { icon: Clock, label: "Takes 3 minutes" },
          { icon: Calendar, label: "Every Wednesday · 7:00 AM" },
          { icon: Users, label: "Navi Mumbai" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="bni-badge bni-badge--navy normal-case tracking-normal text-xs">
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
