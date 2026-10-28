import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Movie } from "../data/types";
import { useLibraryMovies } from "../lib/useLibraryMovies";
import type { ShelfGenreAssignment } from "../lib/genreBuckets";

interface MovieSelectionContextValue {
  loading: boolean;
  error: string | null;
  movies: Movie[];
  featuredMovies: Movie[];
  standeeMovies: Movie[];
  shelfGenres: ShelfGenreAssignment;
  selectedMovie: Movie | null;
  selectedId: string | null;
  hoveredId: string | null;
  selectMovie: (id: string) => void;
  setHoveredId: (id: string | null) => void;
  play: () => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
}

const MovieSelectionContext = createContext<MovieSelectionContextValue | null>(null);

interface MovieSelectionProviderProps {
  children: ReactNode;
  /** Called with the selected movie when "Play Now" is pressed — the page decides where that goes. */
  onPlay?: (movie: Movie) => void;
}

export function MovieSelectionProvider({ children, onPlay }: MovieSelectionProviderProps) {
  const library = useLibraryMovies();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const selectMovie = useCallback((id: string) => setSelectedId(id), []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedMovie = useMemo(
    () => library.movies.find((m) => m.id === selectedId) ?? library.featuredMovies[0] ?? null,
    [library.movies, library.featuredMovies, selectedId]
  );

  const play = useCallback(() => {
    if (selectedMovie) onPlay?.(selectedMovie);
  }, [onPlay, selectedMovie]);

  const value = useMemo<MovieSelectionContextValue>(
    () => ({
      loading: library.loading,
      error: library.error,
      movies: library.movies,
      featuredMovies: library.featuredMovies,
      standeeMovies: library.standeeMovies,
      shelfGenres: library.shelfGenres,
      selectedMovie,
      selectedId,
      hoveredId,
      selectMovie,
      setHoveredId,
      play,
      favorites,
      toggleFavorite,
    }),
    [library, selectedMovie, selectedId, hoveredId, selectMovie, play, favorites, toggleFavorite]
  );

  return <MovieSelectionContext.Provider value={value}>{children}</MovieSelectionContext.Provider>;
}

export function useMovieSelection() {
  const ctx = useContext(MovieSelectionContext);
  if (!ctx) throw new Error("useMovieSelection must be used within MovieSelectionProvider");
  return ctx;
}
