import { useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { movementInput, type MovementFlags } from "../../lib/movementInput";

interface ArrowButtonProps {
  flag: keyof MovementFlags;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  className?: string;
  delay?: string;
}

function ArrowButton({ flag, icon: Icon, className = "", delay = "0s" }: ArrowButtonProps) {
  const active = useRef(false);

  const start = useCallback(() => {
    active.current = true;
    movementInput[flag] = true;
  }, [flag]);
  const stop = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    movementInput[flag] = false;
  }, [flag]);

  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={{ animationDelay: delay }}
      className={`arrow-pulse btn-press flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-nlf-gold/70 bg-black/75 shadow-[0_4px_16px_rgba(0,0,0,0.6)] text-nlf-gold hover:bg-nlf-gold/20 hover:border-nlf-gold active:bg-nlf-gold/30 select-none ${className}`}
      aria-label={flag}
    >
      <Icon size={26} strokeWidth={2.5} />
    </button>
  );
}

export function NavigationArrows() {
  return (
    <div className="pointer-events-auto grid grid-cols-3 grid-rows-2 gap-2 w-[176px]">
      <div />
      <ArrowButton flag="forward" icon={ChevronUp} delay="0s" />
      <div />
      <ArrowButton flag="left" icon={ChevronLeft} delay="0.3s" />
      <ArrowButton flag="backward" icon={ChevronDown} delay="0.15s" />
      <ArrowButton flag="right" icon={ChevronRight} delay="0.45s" />
    </div>
  );
}
