import { useMemo, useState } from "react";
import { Play, Heart, Info, Star, StarHalf } from "lucide-react";
import { useMovieSelection } from "../../hooks/useMovieSelection";
import { createPosterTexture } from "../../lib/posterTexture";
import { MOVIES } from "../../data/movies";

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5 text-nlf-gold">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={15} fill="currentColor" strokeWidth={0} />
      ))}
      {hasHalf && <StarHalf size={15} fill="currentColor" strokeWidth={0} />}
      {Array.from({ length: Math.max(0, empty) }).map((_, i) => (
        <Star key={`e${i}`} size={15} className="text-white/20" strokeWidth={1.5} />
      ))}
    </div>
  );
}

export function MovieInfoPanel() {
  const { selectedMovie, play, isPlaying, closePlayer, favorites, toggleFavorite } = useMovieSelection();
  const [showInfo, setShowInfo] = useState(false);

  const posterUrl = useMemo(() => {
    const tex = createPosterTexture(selectedMovie);
    return (tex.image as HTMLCanvasElement).toDataURL("image/png");
  }, [selectedMovie]);

  const isFavorite = favorites.has(selectedMovie.id);
  const index = MOVIES.findIndex((m) => m.id === selectedMovie.id) + 1;

  return (
    <div
      className="
        flex flex-col gap-1.5 z-30
        md:w-[19vw] md:min-w-[240px] md:max-w-[300px] md:shrink-0 md:h-full md:max-h-full md:static
        max-md:fixed max-md:inset-x-3 max-md:bottom-3
      "
    >
      <aside
        key={selectedMovie.id}
        className="panel-in pointer-events-auto glass-panel rounded-2xl overflow-hidden flex flex-col md:flex-1 md:min-h-0 max-md:max-h-[46vh]"
      >
        <div className="relative shrink-0">
          <img
            src={posterUrl}
            alt={selectedMovie.title}
            className="w-full h-28 sm:h-32 md:h-[15vh] md:max-h-[160px] md:min-h-[110px] object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/95 to-transparent" />
          <div className="absolute top-2 right-2 rounded-full bg-black/60 border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-nlf-gold">
            {selectedMovie.genre}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1.5">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight text-white">
            {selectedMovie.title}
          </h2>

          <div className="flex items-center gap-2 text-xs text-nlf-muted font-medium">
            <span>{selectedMovie.year}</span>
            <span className="border border-white/25 rounded px-1.5 py-0.5 text-[11px]">{selectedMovie.rating}</span>
            <span>{selectedMovie.duration}</span>
          </div>

          <StarRating value={selectedMovie.stars} />

          <p className="text-[12.5px] text-white/75 leading-snug line-clamp-2 md:line-clamp-3">
            {selectedMovie.description}
          </p>

          <div className="flex flex-col gap-1.5 mt-1.5">
            <button
              onClick={play}
              className="btn-press group flex items-center justify-center gap-2 rounded-xl bg-nlf-gold hover:bg-nlf-gold-light text-black font-black uppercase tracking-wide text-sm py-2.5 shadow-[0_0_28px_rgba(245,196,82,0.4)] hover:shadow-[0_0_38px_rgba(245,196,82,0.6)]"
            >
              <Play size={17} fill="currentColor" className="transition-transform group-hover:scale-110" />
              Play Now
            </button>
            <button
              onClick={() => toggleFavorite(selectedMovie.id)}
              className={`btn-press flex items-center justify-center gap-2 rounded-lg border font-bold uppercase tracking-wide text-[10.5px] py-1.5 ${
                isFavorite
                  ? "border-nlf-gold/60 bg-nlf-gold/10 text-nlf-gold-light"
                  : "border-white/15 text-white/85 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              <Heart size={13} fill={isFavorite ? "currentColor" : "none"} />
              {isFavorite ? "Added to Favorites" : "Add to Favorites"}
            </button>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="btn-press flex items-center justify-center gap-2 rounded-lg border border-white/15 text-white/85 hover:border-white/30 hover:bg-white/5 font-bold uppercase tracking-wide text-[10.5px] py-1.5"
            >
              <Info size={13} />
              More Info
            </button>
          </div>

          {showInfo && (
            <div className="panel-in rounded-lg border border-white/10 bg-black/40 p-2 text-[10.5px] text-white/65 leading-relaxed">
              Genre: {selectedMovie.genre} &middot; ID: {selectedMovie.id}
            </div>
          )}
        </div>
      </aside>

      <div className="text-right text-[10.5px] tracking-widest text-nlf-muted uppercase pr-1 shrink-0 max-md:hidden">
        {index} of {MOVIES.length} in aisle
      </div>

      {isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-auto p-4">
          <div className="panel-in glass-panel rounded-2xl p-6 sm:p-8 max-w-md w-full text-center">
            <p className="text-nlf-gold text-xs uppercase tracking-widest mb-2">Now Playing</p>
            <h3 className="text-xl sm:text-2xl font-black uppercase mb-4">{selectedMovie.title}</h3>
            <p className="text-white/60 text-sm mb-6">
              Playback isn't wired up in this preview yet — this confirms the selection flow works end-to-end.
            </p>
            <button
              onClick={closePlayer}
              className="btn-press rounded-xl bg-nlf-gold text-black font-bold uppercase text-sm px-6 py-2.5"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
