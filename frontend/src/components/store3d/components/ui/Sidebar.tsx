import Link from "next/link";
import { Home, Clapperboard, Film, Tv, Clock, Star, Settings, User, X } from "lucide-react";

/**
 * Only routes that actually exist on the site — an aisle sign pointing at a room we don't have
 * is worse than no sign. "Video Store" is this page, so it has no href.
 */
const NAV_ITEMS: { label: string; icon: typeof Home; href?: string }[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Video Store", icon: Clapperboard },
  { label: "Movies", icon: Film, href: "/collections/internal-movies" },
  { label: "TV Shows", icon: Tv, href: "/collections/internal-tv" },
  { label: "Favorites", icon: Star, href: "/account/favorites" },
  { label: "Continue watching", icon: Clock, href: "/watch-history" },
  { label: "Profile", icon: User, href: "/profile" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const ITEM_BASE =
  "s3d-nav-item flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold tracking-wide justify-center lg:justify-start max-md:justify-start";
const ITEM_ACTIVE =
  "bg-gradient-to-r from-nlf-gold/20 to-nlf-gold/5 text-nlf-gold-light border border-nlf-gold/50 shadow-[0_0_18px_rgba(245,196,82,0.18)]";
const ITEM_IDLE = "text-nlf-muted border border-transparent hover:bg-white/5 hover:text-white";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="s3d-drawer-backdrop md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />
      )}

      <aside
        className={`pointer-events-auto shrink-0 h-full max-h-full s3d-glass-panel rounded-2xl flex flex-col overflow-y-auto
          w-[15vw] min-w-[64px] max-w-[240px] p-2 items-center
          lg:w-[220px] lg:max-w-none lg:p-2.5 lg:items-stretch
          transition-transform duration-300 ease-out
          max-md:fixed max-md:inset-y-3 max-md:left-3 max-md:z-50 max-md:w-[248px] max-md:max-w-[80vw] max-md:p-3 max-md:items-stretch
          ${open ? "max-md:translate-x-0" : "max-md:-translate-x-[130%]"}
        `}
      >
        <div className="flex items-center justify-between w-full pb-2 mb-1.5 border-b border-white/10 shrink-0">
          <div className="hidden lg:block max-md:block text-lg font-black tracking-tight leading-none">
            <span className="text-white">NO LIMIT</span>
            <span className="text-nlf-gold s3d-text-glow-gold"> FLIX</span>
          </div>
          <div className="lg:hidden max-md:hidden h-7 w-7 flex items-center justify-center rounded-lg bg-nlf-gold/15 border border-nlf-gold/40 text-nlf-gold font-black text-xs">
            NF
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden s3d-btn-press h-7 w-7 flex items-center justify-center rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30"
              aria-label="Close menu"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-0.5 w-full">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
            const body = (
              <>
                <Icon size={18} strokeWidth={2} className="shrink-0" />
                <span className="hidden lg:inline max-md:inline uppercase text-[12px]">{label}</span>
              </>
            );
            return href ? (
              <Link key={label} href={href} onClick={onClose} className={`${ITEM_BASE} ${ITEM_IDLE}`} title={label}>
                {body}
              </Link>
            ) : (
              <span key={label} aria-current="page" className={`${ITEM_BASE} ${ITEM_ACTIVE}`} title={label}>
                {body}
              </span>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
