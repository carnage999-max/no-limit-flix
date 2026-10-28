export function NavigationHelp() {
  return (
    <div className="hidden lg:flex pointer-events-auto s3d-glass-panel rounded-2xl p-3 w-[clamp(250px,18vw,300px)] gap-3 items-center">
      <div className="shrink-0 flex flex-col items-center gap-1.5 rounded-xl bg-black/50 border border-white/10 px-3 py-3">
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-16">
          <div />
          <div className="h-3.5 rounded-sm bg-nlf-gold/70" />
          <div />
          <div className="h-3.5 rounded-sm bg-nlf-gold/70" />
          <div className="h-3.5 w-3.5 rounded-full bg-nlf-gold border border-black/40 mx-auto" />
          <div className="h-3.5 rounded-sm bg-nlf-gold/70" />
          <div />
          <div className="h-3.5 rounded-sm bg-nlf-gold/70" />
          <div />
        </div>
        <div className="mt-1 h-1.5 w-8 rounded-full bg-white/15" />
      </div>

      <div className="flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-nlf-gold mb-1">How to Navigate</p>
        <p className="text-[11px] text-white/50 mb-2 leading-snug line-clamp-2">Use WASD, arrows, or the on-screen buttons to walk the store.</p>
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
