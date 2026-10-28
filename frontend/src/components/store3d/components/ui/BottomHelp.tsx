import { Menu, RotateCcw } from "lucide-react";

interface BottomHelpProps {
  onMenuClick?: () => void;
}

export function BottomHelp({ onMenuClick }: BottomHelpProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-white/60 font-medium tracking-wide drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]">
      {onMenuClick ? (
        <button
          onClick={onMenuClick}
          className="s3d-btn-press pointer-events-auto md:pointer-events-none flex items-center gap-1.5 hover:text-white"
        >
          Press <Menu size={14} className="text-white/70" /> for Menu
        </button>
      ) : (
        <span className="pointer-events-none flex items-center gap-1.5">
          Press <Menu size={14} className="text-white/70" /> for Menu
        </span>
      )}
      <span className="pointer-events-none text-white/20">|</span>
      <span className="pointer-events-none flex items-center gap-1.5">
        Press <RotateCcw size={14} className="text-white/70" /> to Go Back
      </span>
    </div>
  );
}
