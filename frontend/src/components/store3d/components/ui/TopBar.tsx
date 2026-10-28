import { Search, ChevronDown } from "lucide-react";

export function TopBar() {
  return (
    <div className="pointer-events-none flex items-center justify-end gap-3 sm:gap-6 shrink-0">
      <button className="s3d-btn-press pointer-events-auto flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/80 hover:text-nlf-gold transition-colors">
        <Search size={16} />
        <span className="hidden sm:inline">Search</span>
      </button>
      <button className="s3d-btn-press pointer-events-auto flex items-center gap-2 rounded-full s3d-glass-panel pl-1.5 pr-2 sm:pr-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/85 hover:text-nlf-gold hover:border-nlf-gold/40 transition-colors">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-nlf-gold text-black font-black text-sm shrink-0">
          N
        </span>
        <span className="hidden sm:inline">Nathan</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>
    </div>
  );
}
