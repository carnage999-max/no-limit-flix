
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
