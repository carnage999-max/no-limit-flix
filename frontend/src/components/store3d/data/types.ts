// A movie as shown in the 3D store. Built from the real library (see
// lib/useLibraryMovies.ts) — nothing here is hard-coded sample data.
export interface Movie {
  id: string;
  title: string;
  year: number | null;
  rating: string;
  duration: string;
  stars: number;
  /** Raw genre label from the catalog, shown in the info panel as-is (may be empty). */
  genre: string;
  /** One of the small set of genres used to group shelves and sign them (see genreBuckets.ts). */
  genreBucket: string;
  description: string;
  /** Real poster image, when the library has one. Falls back to a generated card when absent. */
  posterUrl: string | null;
  colorFrom: string;
  colorTo: string;
  accent: string;
  featured?: boolean;
}
