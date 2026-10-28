import { GENRE_SIGN_SPOTS } from "../data/layout";
import type { Movie } from "../data/types";

const FALLBACK_GENRE = "Classics";

/** First comma-separated genre, title-cased. Internet Archive / OMDb metadata is free text, so this is a best effort, not a taxonomy. */
export function primaryGenre(raw: string | null | undefined): string {
  const first = (raw || "").split(",")[0]?.trim();
  if (!first) return FALLBACK_GENRE;
  return first
    .split(/\s+/)
    .map((word) => (word.length > 2 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()))
    .join(" ");
}

export interface ShelfGenreAssignment {
  /** One genre per GENRE_SIGN_SPOTS entry — index 0..3 maps to that spot and the shelf run beneath it. */
  signed: string[];
  /** Genre for the (unsigned) back shelves, or null to mix every movie in for variety. */
  back: string | null;
}

/**
 * Picks the most common genres in the library (by count, ties broken
 * alphabetically for a stable layout) and assigns one to each genre sign /
 * shelf run. A thin library can repeat a genre across more than one shelf
 * rather than leave a sign blank.
 */
export function assignShelfGenres(movies: Movie[]): ShelfGenreAssignment {
  const counts = new Map<string, number>();
  for (const movie of movies) {
    counts.set(movie.genreBucket, (counts.get(movie.genreBucket) || 0) + 1);
  }

  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const names = ranked.map(([name]) => name);

  const signed =
    names.length > 0
      ? GENRE_SIGN_SPOTS.map((_, i) => names[i % names.length])
      : GENRE_SIGN_SPOTS.map(() => FALLBACK_GENRE);

  const back = names[4] ?? null;

  return { signed, back };
}
