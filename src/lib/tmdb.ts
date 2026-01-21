const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Genre ID to Name map to avoid extra calls for lists
const GENRE_MAP: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

export async function fetchFromTMDB(endpoint: string, params: Record<string, string> = {}) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not set. Please add NEXT_PUBLIC_TMDB_API_KEY to your .env.local');
    }

    const queryParams = new URLSearchParams({
        api_key: TMDB_API_KEY,
        ...params,
    });

    const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryParams}`, {
        next: { revalidate: 3600 }
    });

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
    }
    return response.json();
}

export function getImageUrl(path: string | null, size: 'w500' | 'original' = 'w500') {
    if (!path) return 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=500&auto=format&fit=crop';
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

export async function getMovieDetails(id: string) {
    const data = await fetchFromTMDB(`/movie/${id}`, {
        append_to_response: 'videos,watch/providers'
    });

    const trailer = data.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
    const usProviders = data['watch/providers']?.results?.US?.flatrate || data['watch/providers']?.results?.US?.buy || [];

    return {
        id: data.id.toString(),
        title: data.title,
        year: data.release_date ? new Date(data.release_date).getFullYear() : 0,
        runtime: data.runtime || 120,
        poster: getImageUrl(data.poster_path),
        backdrop: getImageUrl(data.backdrop_path, 'original'),
        explanation: data.overview,
        trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
        watchProviders: usProviders.map((p: any) => ({
            name: p.provider_name,
            logoUrl: getImageUrl(p.logo_path),
            link: `https://www.themoviedb.org/movie/${id}/watch`,
        })),
        genres: data.genres?.map((g: any) => g.name) || [],
    };
}

export async function searchMoviesByMood(moods: string[]) {
    const genreMap: Record<string, number> = {
        'Thrilling': 53,
        'Heartwarming': 10751,
        'Mind-bending': 878,
        'Funny': 35,
        'Dark': 27,
        'Uplifting': 10751,
        'Intense': 28,
        'Relaxing': 99,
        'Romantic': 10749,
        'Epic': 12,
        'Magical': 14,
        'Gritty': 80,
        'Futuristic': 878,
        'Nostalgic': 36,
        'Artistic': 18,
        'Spooky': 27,
        'Mysterious': 9648,
        'Action-packed': 28
    };

    const genreIds = moods.map(m => genreMap[m]).filter(Boolean);

    // Discovery mode (Mood only)
    const discoveryData = await fetchFromTMDB('/discover/movie', {
        with_genres: genreIds.join(','),
        sort_by: 'popularity.desc',
        'vote_count.gte': '100',
        region: 'US',
        include_adult: 'false'
    });

    const results = discoveryData.results || [];
    const movies = results.slice(0, 5);

    // Fetch full details for home page picks to get genres, providers, trailers
    const detailedMovies = await Promise.all(movies.map(async (movie: any) => {
        try {
            return await getMovieDetails(movie.id);
        } catch (e) {
            return null;
        }
    }));

    const validMovies = detailedMovies.filter(Boolean) as any[];

    return {
        movies: validMovies,
        tags: moods
    };
}

export async function getMoviesByCollection(slug: string) {
    const slugToParams: Record<string, any> = {
        'mind-benders': { with_genres: '9648,878', 'vote_average.gte': 7 },
        'feel-good-classics': { with_genres: '10751,35', 'vote_average.gte': 7 },
        'visual-masterpieces': { with_genres: '16,18', 'vote_average.gte': 8 },
        'adrenaline-rush': { with_genres: '28,12', 'vote_average.gte': 7 },
        'hidden-gems': { 'vote_count.lte': 1000, 'vote_average.gte': 7.5 },
        'slow-cinema': { with_genres: '99,18', 'vote_average.gte': 7 },
        'cult-favorites': { with_keywords: '10343', 'vote_average.gte': 7 },
        'foreign-language': { 'with_original_language': 'fr|ja|ko|es', 'vote_average.gte': 8 },
        'directors-vision': { with_genres: '18', 'vote_average.gte': 8.5 },
        'comfort-watches': { with_genres: '35,10751', 'vote_average.gte': 6.5 },
        'edge-of-your-seat': { with_genres: '53,27', 'vote_average.gte': 7 },
        'animation-excellence': { with_genres: '16', 'vote_average.gte': 7.5 },
    };

    const params = slugToParams[slug] || { with_genres: '18' };

    const results = await fetchFromTMDB('/discover/movie', {
        ...params,
        sort_by: 'popularity.desc',
        region: 'US',
        include_adult: 'false'
    });

    return results.results.slice(0, 20).map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
        runtime: 120,
        poster: getImageUrl(movie.poster_path),
        genres: movie.genre_ids?.map((id: number) => GENRE_MAP[id]).filter(Boolean) || [],
    }));
}
