import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_MOVIE_ID, getMovieById, MOVIES } from "../data/movies";
import type { Movie } from "../data/types";

interface MovieSelectionContextValue {
  movies: Movie[];
  selectedMovie: Movie;
  selectedId: string;
  hoveredId: string | null;
  selectMovie: (id: string) => void;
  setHoveredId: (id: string | null) => void;
  isPlaying: boolean;
  play: () => void;
  closePlayer: () => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
}

const MovieSelectionContext = createContext<MovieSelectionContextValue | null>(null);

export function MovieSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(DEFAULT_MOVIE_ID);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const selectMovie = useCallback((id: string) => {
    setSelectedId(id);
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => setIsPlaying(true), []);
  const closePlayer = useCallback(() => setIsPlaying(false), []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedMovie = getMovieById(selectedId) ?? MOVIES[0];

  const value = useMemo<MovieSelectionContextValue>(
    () => ({
      movies: MOVIES,
      selectedMovie,
      selectedId,
      hoveredId,
      selectMovie,
      setHoveredId,
      isPlaying,
      play,
      closePlayer,
      favorites,
      toggleFavorite,
    }),
    [selectedMovie, selectedId, hoveredId, selectMovie, isPlaying, play, closePlayer, favorites, toggleFavorite]
  );

  return <MovieSelectionContext.Provider value={value}>{children}</MovieSelectionContext.Provider>;
}

export function useMovieSelection() {
  const ctx = useContext(MovieSelectionContext);
  if (!ctx) throw new Error("useMovieSelection must be used within MovieSelectionProvider");
  return ctx;
}
