export function NavigationHelp() {
  return (
    <div className="hidden lg:flex pointer-events-auto s3d-glass-panel rounded-2xl p-3 w-[clamp(250px,18vw,300px)] gap-3 items-center">
      <div className="shrink-0 rounded-xl bg-black/50 border border-white/10 px-2 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size decorative asset, not content */}
        <img src="/3d/remote.png" alt="" width={44} height={88} className="h-[88px] w-auto object-contain" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-nlf-gold mb-1">How to Navigate</p>
        <p className="text-[11px] text-white/50 mb-2 leading-snug">Walk the aisles and click a case to see its details.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px]">
          <dt className="text-white/40 uppercase tracking-wider">Move</dt>
          <dd className="text-white/80">WASD / Arrows</dd>
          <dt className="text-white/40 uppercase tracking-wider">Look</dt>
          <dd className="text-white/80">Drag mouse</dd>
          <dt className="text-white/40 uppercase tracking-wider">Select</dt>
          <dd className="text-white/80">Click a case</dd>
          <dt className="text-white/40 uppercase tracking-wider">Turn</dt>
          <dd className="text-white/80">Q / E</dd>
        </dl>
      </div>
    </div>
  );
}
