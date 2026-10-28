import { useEffect, useState } from "react";
import type { Movie } from "../data/types";
import { primaryGenre } from "./genreBuckets";
import { buildStoreShelves, type ShelfPlan } from "../data/shelfLayout";
import { paletteFor } from "./palette";

interface RawLibraryMovie {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null; // seconds
  releaseYear?: number | null;
  genre?: string | null;
  rating?: string | null;
  createdAt?: string;
  ratingSummary?: { finalScore?: number | null } | null;
  hybridRating?: number | null;
  averageRating?: number | null;
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds <= 0) return "—";
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/** Ratings in this app are 0-10; the 3D store shows 0-5 stars in half-star steps. */
const toStars = (raw: RawLibraryMovie): number => {
  const score = raw.ratingSummary?.finalScore ?? raw.hybridRating ?? raw.averageRating;
  if (!Number.isFinite(Number(score))) return 0;
  const stars = Number(score) / 2;
  return Math.max(0, Math.min(5, Math.round(stars * 2) / 2));
};

function toMovie(raw: RawLibraryMovie): Movie {
  const palette = paletteFor(raw.id);
  const genre = (raw.genre || "").trim();
  return {
    id: raw.id,
    title: raw.title,
    year: raw.releaseYear ?? null,
    rating: raw.rating?.trim() || "NR",
    duration: formatDuration(raw.duration),
    stars: toStars(raw),
    genre,
    genreBucket: primaryGenre(genre),
    description: raw.description?.trim() || "No synopsis yet for this title.",
    posterUrl: raw.thumbnailUrl || null,
    ...palette,
  };
}

export interface LibraryMovies {
  loading: boolean;
  error: string | null;
  /** Every movie in the library, in catalog order — used to fill the shelves. */
  movies: Movie[];
  /** A handful of recent titles for the central "New Releases" display. */
  featuredMovies: Movie[];
  /** One movie per standee cut-out spot (data/layout.ts STANDEE_SPOTS), picked from the featured set. */
  standeeMovies: Movie[];
  /** Where every case sits on the shelves, plus the genre label for each overhead sign. */
  shelfPlan: ShelfPlan;
}

const EMPTY: LibraryMovies = {
  loading: true,
  error: null,
  movies: [],
  featuredMovies: [],
  standeeMovies: [],
  shelfPlan: { placements: [], signLabels: [] },
};

/** Loads the real catalog once and shapes it for the 3D store. No sample data anywhere in this path. */
export function useLibraryMovies(): LibraryMovies {
  const [state, setState] = useState<LibraryMovies>(EMPTY);

  useEffect(() => {
    // No "fetch once" guard here on purpose: React's dev-mode StrictMode runs this effect,
    // its cleanup (which aborts), then the effect again — a ref guard would make that second,
    // real run a no-op and the page would be stuck loading forever after the synthetic abort.
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/library/movies", { signal: controller.signal });
        if (!res.ok) throw new Error(`Library request failed (${res.status})`);
        const data = (await res.json()) as { movies?: RawLibraryMovie[] };
        const movies = (data.movies || []).map(toMovie);

        if (movies.length === 0) {
          setState({ ...EMPTY, loading: false, error: "No movies are in the library yet." });
          return;
        }

        const featuredMovies = movies.slice(0, Math.min(6, movies.length));
        const standeeMovies = featuredMovies.length > 0 ? [featuredMovies[0], featuredMovies[featuredMovies.length - 1]] : [];
        const shelfPlan = buildStoreShelves(movies);

        setState({ loading: false, error: null, movies, featuredMovies, standeeMovies, shelfPlan });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({ ...EMPTY, loading: false, error: err instanceof Error ? err.message : "Failed to load the library." });
      }
    })();

    return () => controller.abort();
  }, []);

  return state;
}
