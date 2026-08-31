export type Genre = "Action" | "Comedy" | "Horror" | "Sci-Fi" | "Drama" | "Thriller";

export interface Movie {
  id: string;
  title: string;
  year: number;
  rating: string;
  duration: string;
  stars: number;
  genre: Genre;
  description: string;
  colorFrom: string;
  colorTo: string;
  accent: string;
  featured?: boolean;
}
