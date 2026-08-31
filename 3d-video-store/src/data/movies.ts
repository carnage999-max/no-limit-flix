import type { Movie } from "./types";

export const MOVIES: Movie[] = [
  {
    id: "the-beekeeper",
    title: "The Beekeeper",
    year: 2024,
    rating: "R",
    duration: "1h 45m",
    stars: 3.5,
    genre: "Action",
    description:
      'One man\'s brutal campaign for vengeance takes on national stakes after he is revealed to be a former operative of a clandestine organization known as "Beekeepers".',
    colorFrom: "#5a4321",
    colorTo: "#151008",
    accent: "#f5c452",
    featured: true,
  },
  {
    id: "dune-part-two",
    title: "Dune: Part Two",
    year: 2024,
    rating: "PG-13",
    duration: "2h 46m",
    stars: 4.5,
    genre: "Sci-Fi",
    description:
      "Paul Atreides unites with the Fremen to wage war against House Harkonnen, torn between the love of his life and the fate of the known universe.",
    colorFrom: "#3a2a15",
    colorTo: "#0d0a05",
    accent: "#e8b34a",
    featured: true,
  },
  {
    id: "godzilla-kong",
    title: "Godzilla x Kong: The New Empire",
    year: 2024,
    rating: "PG-13",
    duration: "1h 55m",
    stars: 3.5,
    genre: "Sci-Fi",
    description:
      "Two ancient titans, Godzilla and Kong, clash in an epic battle as humans unravel their intertwined origins and a mysterious new threat that puts their existence at risk.",
    colorFrom: "#1c2b1a",
    colorTo: "#080b06",
    accent: "#7cc46b",
    featured: true,
  },
  {
    id: "civil-war",
    title: "Civil War",
    year: 2024,
    rating: "R",
    duration: "1h 49m",
    stars: 4,
    genre: "Thriller",
    description:
      "A team of journalists travel across a dystopian, war-torn America during a rapidly escalating civil war between the government and secessionist militias.",
    colorFrom: "#2a2422",
    colorTo: "#0a0908",
    accent: "#c9432f",
    featured: true,
  },
  {
    id: "if",
    title: "IF",
    year: 2024,
    rating: "PG",
    duration: "1h 44m",
    stars: 3.5,
    genre: "Comedy",
    description:
      "A girl who can see everyone's imaginary friends embarks on a magical adventure to reconnect forgotten IFs with children who need them.",
    colorFrom: "#241a3a",
    colorTo: "#0a0712",
    accent: "#8a6bd6",
    featured: true,
  },
  {
    id: "kingdom-apes",
    title: "Kingdom of the Planet of the Apes",
    year: 2024,
    rating: "PG-13",
    duration: "2h 25m",
    stars: 4,
    genre: "Sci-Fi",
    description:
      "Many years after Caesar's reign, a young ape goes on a journey that will lead him to question everything he's been taught about the past.",
    colorFrom: "#2a2416",
    colorTo: "#0a0906",
    accent: "#c99a3f",
    featured: true,
  },

  { id: "john-wick-4", title: "John Wick: Chapter 4", year: 2023, rating: "R", duration: "2h 49m", stars: 4.5, genre: "Action", description: "John Wick uncovers a path to defeating The High Table, but must face off against a new adversary with powerful alliances.", colorFrom: "#1a1a1e", colorTo: "#050506", accent: "#d4b34a" },
  { id: "top-gun-maverick", title: "Top Gun: Maverick", year: 2022, rating: "PG-13", duration: "2h 11m", stars: 4.5, genre: "Action", description: "Maverick confronts his past while training a new generation of pilots for a dangerous mission.", colorFrom: "#1c2530", colorTo: "#06090c", accent: "#4fa0d6" },
  { id: "mad-max-fury", title: "Mad Max: Fury Road", year: 2015, rating: "R", duration: "2h 0m", stars: 5, genre: "Action", description: "In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search of her homeland.", colorFrom: "#3a2410", colorTo: "#0c0704", accent: "#e08a3a" },
  { id: "extraction-2", title: "Extraction 2", year: 2023, rating: "R", duration: "2h 2m", stars: 3.5, genre: "Action", description: "Tasked with extracting a family from a Georgian prison, a mercenary must survive when things go wrong.", colorFrom: "#20201c", colorTo: "#080806", accent: "#c94b2f" },
  { id: "the-gray-man", title: "The Gray Man", year: 2022, rating: "PG-13", duration: "2h 9m", stars: 3, genre: "Action", description: "A CIA operative uncovers agency secrets and becomes hunted by an unhinged rogue agent across the globe.", colorFrom: "#1e242c", colorTo: "#06080a", accent: "#7a95b0" },
  { id: "bullet-train", title: "Bullet Train", year: 2022, rating: "R", duration: "2h 6m", stars: 3.5, genre: "Action", description: "Five assassins aboard a fast-moving bullet train discover their missions are all connected.", colorFrom: "#241820", colorTo: "#080508", accent: "#d63f7a" },

  { id: "barbie", title: "Barbie", year: 2023, rating: "PG-13", duration: "1h 54m", stars: 4, genre: "Comedy", description: "Barbie and Ken venture from Barbieland to the real world, discovering the joys and perils of living among humans.", colorFrom: "#3a1a2c", colorTo: "#0d060a", accent: "#ff6fb0" },
  { id: "super-mario", title: "The Super Mario Bros. Movie", year: 2023, rating: "PG", duration: "1h 32m", stars: 4, genre: "Comedy", description: "A plumber named Mario travels through an underground labyrinth to save a captured princess.", colorFrom: "#241c38", colorTo: "#08060f", accent: "#e0433f" },
  { id: "the-holdovers", title: "The Holdovers", year: 2023, rating: "R", duration: "2h 13m", stars: 4.5, genre: "Comedy", description: "A cranky teacher at a New England prep school remains on campus with a troubled student over the holidays.", colorFrom: "#2a2218", colorTo: "#0a0806", accent: "#c9a24a" },
  { id: "free-guy", title: "Free Guy", year: 2021, rating: "PG-13", duration: "1h 55m", stars: 4, genre: "Comedy", description: "A bank teller discovers he is a background character in an open-world video game and decides to become the hero.", colorFrom: "#1a2438", colorTo: "#06080e", accent: "#4ec3ff" },
  { id: "ghostbusters-frozen", title: "Ghostbusters: Frozen Empire", year: 2024, rating: "PG-13", duration: "1h 55m", stars: 3, genre: "Comedy", description: "The Spengler family returns to the iconic firehouse to team up with the original Ghostbusters for a new threat.", colorFrom: "#1c2222", colorTo: "#070a0a", accent: "#7fd4d0" },

  { id: "evil-dead-rise", title: "Evil Dead Rise", year: 2023, rating: "R", duration: "1h 36m", stars: 3.5, genre: "Horror", description: "A twisted tale of two estranged sisters whose reunion is cut short by the rise of flesh-possessing demons.", colorFrom: "#2a0e0e", colorTo: "#0a0303", accent: "#e0392f" },
  { id: "talk-to-me", title: "Talk to Me", year: 2023, rating: "R", duration: "1h 35m", stars: 4, genre: "Horror", description: "A group of friends discover how to conjure spirits using an embalmed hand, with terrifying consequences.", colorFrom: "#1c1414", colorTo: "#070505", accent: "#d63f3f" },
  { id: "the-nun-2", title: "The Nun II", year: 2023, rating: "R", duration: "1h 50m", stars: 3, genre: "Horror", description: "A demonic force continues its reign of terror in a new chapter of terrifying evil within the Conjuring universe.", colorFrom: "#1a1c22", colorTo: "#06070a", accent: "#8a8fb0" },
  { id: "smile", title: "Smile", year: 2022, rating: "R", duration: "1h 55m", stars: 3.5, genre: "Horror", description: "After witnessing a bizarre, traumatic incident, a doctor starts experiencing terrifying occurrences she can't explain.", colorFrom: "#20181c", colorTo: "#08060a", accent: "#e04f6f" },
  { id: "insidious-red", title: "Insidious: The Red Door", year: 2023, rating: "PG-13", duration: "1h 47m", stars: 3, genre: "Horror", description: "The Lambert family must go deeper into The Further to put their demons to rest once and for all.", colorFrom: "#22120e", colorTo: "#080403", accent: "#c9432f" },

  { id: "oppenheimer", title: "Oppenheimer", year: 2023, rating: "R", duration: "3h 0m", stars: 5, genre: "Drama", description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.", colorFrom: "#20201e", colorTo: "#08080706", accent: "#c9a24a" },
  { id: "killers-flower-moon", title: "Killers of the Flower Moon", year: 2023, rating: "R", duration: "3h 26m", stars: 4.5, genre: "Drama", description: "Members of the Osage tribe are murdered under mysterious circumstances in the 1920s, sparking a major FBI investigation.", colorFrom: "#2a2014", colorTo: "#0a0805", accent: "#c9843f" },
  { id: "poor-things", title: "Poor Things", year: 2023, rating: "R", duration: "2h 21m", stars: 4.5, genre: "Drama", description: "A young woman is brought back to life by an unorthodox scientist and sets off on a journey of self-discovery.", colorFrom: "#141c2a", colorTo: "#05070a", accent: "#4a7fc9" },
  { id: "the-fabelmans", title: "The Fabelmans", year: 2022, rating: "PG-13", duration: "2h 31m", stars: 4, genre: "Drama", description: "A young man growing up in Arizona discovers a shattering family secret and explores how the power of movies can help him see the truth.", colorFrom: "#241c14", colorTo: "#080605", accent: "#c9a24a" },

  { id: "no-time-to-die", title: "No Time to Die", year: 2021, rating: "PG-13", duration: "2h 43m", stars: 4, genre: "Thriller", description: "James Bond has left active service, but his peace is short-lived when an old friend enlists his help to rescue a kidnapped scientist.", colorFrom: "#181c22", colorTo: "#06080a", accent: "#4a8fc9" },
  { id: "knives-out", title: "Knives Out", year: 2019, rating: "PG-13", duration: "2h 10m", stars: 4.5, genre: "Thriller", description: "A detective investigates the death of a patriarch of an eccentric, combative family shortly after his 85th birthday.", colorFrom: "#241814", colorTo: "#080504", accent: "#c9633f" },
  { id: "the-menu", title: "The Menu", year: 2022, rating: "R", duration: "1h 47m", stars: 4, genre: "Thriller", description: "A couple travels to a remote island to eat at an exclusive restaurant where the chef has prepared a shocking menu.", colorFrom: "#181414", colorTo: "#060505", accent: "#c94a3f" },
  { id: "prisoners", title: "Prisoners", year: 2013, rating: "R", duration: "2h 33m", stars: 4.5, genre: "Thriller", description: "When his daughter and her friend go missing, a father takes matters into his own hands as police pursue multiple leads.", colorFrom: "#141a20", colorTo: "#05070a", accent: "#3f7fa0" },

  { id: "spiderverse", title: "Spider-Man: Across the Spider-Verse", year: 2023, rating: "PG", duration: "2h 20m", stars: 5, genre: "Sci-Fi", description: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People tasked with protecting its very existence.", colorFrom: "#241030", colorTo: "#08040c", accent: "#d63fd6" },
  { id: "guardians-3", title: "Guardians of the Galaxy Vol. 3", year: 2023, rating: "PG-13", duration: "2h 30m", stars: 4, genre: "Sci-Fi", description: "Still reeling from the loss of Gamora, Peter Quill rallies his team to defend the universe and one of their own.", colorFrom: "#1a2438", colorTo: "#06080e", accent: "#e0433f" },
  { id: "the-creator", title: "The Creator", year: 2023, rating: "PG-13", duration: "2h 13m", stars: 3.5, genre: "Sci-Fi", description: "Amid a future war between humans and AI, a former soldier is tasked with hunting down a mysterious weapon in the form of a child.", colorFrom: "#141c1e", colorTo: "#05080a", accent: "#4fc9c0" },
  { id: "avatar-water", title: "Avatar: The Way of Water", year: 2022, rating: "PG-13", duration: "3h 12m", stars: 4.5, genre: "Sci-Fi", description: "Jake Sully and his family explore the reefs of Pandora and fight to protect their home from returning threats.", colorFrom: "#0e2430", colorTo: "#04080a", accent: "#3fc9e0" },
];

export const FEATURED_MOVIES = MOVIES.filter((m) => m.featured);
export const DEFAULT_MOVIE_ID = "the-beekeeper";

export function getMovieById(id: string): Movie | undefined {
  return MOVIES.find((m) => m.id === id);
}
