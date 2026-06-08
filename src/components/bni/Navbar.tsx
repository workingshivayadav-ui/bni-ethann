export function Navbar({ count }: { count: number }) {
  return (
    <>
      <div className="h-[5px] bg-gradient-to-r from-[var(--bni-red)] via-[var(--bni-red)] to-[var(--bni-gold)]" />
      <nav className="bni-navbar bg-[var(--bni-red)] h-[60px] px-7 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
            <span className="font-display font-black text-[var(--bni-red)] text-sm">BNI</span>
          </div>
          <div className="leading-tight">
            <div className="font-display font-black text-white text-[18px] tracking-tight">
              BNI <span className="text-[var(--bni-gold-lt)]">Ethan</span>
            </div>
            <div className="text-[11px] text-white/65 tracking-wider hidden sm:block">
              Navi Mumbai · 2026
            </div>
          </div>
        </div>
        <div className="bni-navbar-count">
          <strong className="text-[var(--bni-gold-lt)] font-bold">{count}</strong> / 24 submitted
        </div>
      </nav>
    </>
  );
}
