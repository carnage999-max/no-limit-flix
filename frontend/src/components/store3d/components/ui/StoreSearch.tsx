import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useMovieSelection } from "../../hooks/useMovieSelection";

const MAX_RESULTS = 8;

/**
 * Finds a film without leaving the store: picking a result selects it, so its details fill the
 * info panel and its case lights up on the shelf.
 */
export function StoreSearch() {
  const { movies, selectMovie } = useMovieSelection();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const starts = [];
    const contains = [];
    for (const movie of movies) {
      const title = movie.title.toLowerCase();
      if (title.startsWith(needle)) starts.push(movie);
      else if (title.includes(needle)) contains.push(movie);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [movies, query]);

  const choose = (id: string) => {
    selectMovie(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="s3d-btn-press pointer-events-auto flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/80 hover:text-nlf-gold transition-colors"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Search</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="s3d-panel-in s3d-glass-panel rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
              <Search size={16} className="text-nlf-gold shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) choose(results[0].id);
                }}
                placeholder="Search the shelves…"
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="s3d-btn-press h-6 w-6 flex items-center justify-center rounded-md text-white/50 hover:text-white shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <p className="px-3 py-4 text-xs text-white/50">No film here by that name.</p>
              )}
              {results.map((movie) => (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => choose(movie.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
                >
                  <span className="flex-1 min-w-0 truncate text-sm text-white/90">{movie.title}</span>
                  {movie.year && <span className="text-[11px] text-nlf-muted shrink-0">{movie.year}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
