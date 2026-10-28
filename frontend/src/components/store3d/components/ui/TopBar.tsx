import Link from "next/link";
import { LogIn } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { StoreSearch } from "./StoreSearch";

export function TopBar() {
  const { user, loading } = useSession();
  const name = user?.username || user?.email || "";
  const initial = (name || "U").charAt(0).toUpperCase();

  return (
    <div className="pointer-events-none flex items-center justify-end gap-3 sm:gap-6 shrink-0">
      <StoreSearch />

      {loading ? null : user ? (
        <Link
          href="/profile"
          title={name}
          className="s3d-btn-press pointer-events-auto flex items-center gap-2 rounded-full s3d-glass-panel pl-1.5 pr-2 sm:pr-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/85 hover:text-nlf-gold hover:border-nlf-gold/40 transition-colors"
        >
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary hosts; the site uses plain <img> for them elsewhere too
            <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-nlf-gold text-black font-black text-sm shrink-0">
              {initial}
            </span>
          )}
          <span className="hidden sm:inline max-w-[9rem] truncate normal-case">{name}</span>
        </Link>
      ) : (
        <Link
          href="/auth"
          className="s3d-btn-press pointer-events-auto flex items-center gap-2 rounded-full s3d-glass-panel px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/85 hover:text-nlf-gold hover:border-nlf-gold/40 transition-colors"
        >
          <LogIn size={15} className="shrink-0" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      )}
    </div>
  );
}
