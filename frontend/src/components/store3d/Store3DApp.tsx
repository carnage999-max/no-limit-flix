"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { buildWatchHref } from "@/lib/watch-asset";
import { StoreScene } from "./components/3d/StoreScene";
import { Sidebar } from "./components/ui/Sidebar";
import { MovieInfoPanel } from "./components/ui/MovieInfoPanel";
import { NavigationArrows } from "./components/ui/NavigationArrows";
import { NavigationHelp } from "./components/ui/NavigationHelp";
import { BottomHelp } from "./components/ui/BottomHelp";
import { TopBar } from "./components/ui/TopBar";
import { MovieSelectionProvider, useMovieSelection } from "./hooks/useMovieSelection";
import { useKeyboardControls } from "./hooks/useKeyboardControls";
import type { Movie } from "./data/types";

function ExitButton() {
  return (
    <Link
      href="/"
      className="s3d-btn-press pointer-events-auto flex items-center gap-1.5 rounded-full s3d-glass-panel px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/85 hover:text-nlf-gold-light hover:border-nlf-gold/40"
    >
      <ArrowLeft size={14} />
      Classic View
    </Link>
  );
}

function StoreUI() {
  useKeyboardControls();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col p-3 sm:p-4 gap-2 sm:gap-3">
      <div className="pointer-events-none flex items-center justify-between gap-3 sm:gap-6 shrink-0">
        <ExitButton />
        <div className="flex-1">
          <TopBar />
        </div>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex-1" />
        <MovieInfoPanel />
      </div>

      <div className="flex items-end justify-between shrink-0 gap-2 max-md:mb-[48vh]">
        <NavigationHelp />
        <div className="flex flex-col items-center gap-2 mx-auto lg:mx-0">
          <NavigationArrows />
          <BottomHelp onMenuClick={() => setMenuOpen(true)} />
        </div>
        <div className="hidden lg:block w-[220px]" />
      </div>
    </div>
  );
}

function StoreStatus({ message, spinning }: { message: string; spinning?: boolean }) {
  return (
    <div className="s3d-page flex items-center justify-center">
      <div className="s3d-panel-in s3d-glass-panel rounded-2xl px-8 py-6 flex flex-col items-center gap-3 text-center max-w-sm">
        {spinning && <Loader2 className="animate-spin text-nlf-gold" size={28} />}
        <p className="text-sm text-white/80">{message}</p>
        <ExitButton />
      </div>
    </div>
  );
}

function StoreShell() {
  const { loading, error } = useMovieSelection();

  if (loading) return <StoreStatus message="Walking into the store…" spinning />;
  if (error) return <StoreStatus message={error} />;

  return (
    <div className="s3d-page">
      <StoreScene />
      <StoreUI />
    </div>
  );
}

export default function Store3DApp() {
  const router = useRouter();

  const handlePlay = (movie: Movie) => {
    router.push(buildWatchHref(movie.id));
  };

  return (
    <MovieSelectionProvider onPlay={handlePlay}>
      <StoreShell />
    </MovieSelectionProvider>
  );
}
