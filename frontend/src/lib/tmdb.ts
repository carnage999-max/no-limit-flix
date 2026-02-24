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

    let lastError;
    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryParams}`, {
                next: { revalidate: 3600 },
                signal: AbortSignal.timeout(8000) // 8s timeout to fail fast and retry
            });

            if (!response.ok) {
                if (response.status >= 500) throw new Error(`TMDB Server Error: ${response.status}`);
                throw new Error(`TMDB API error: ${response.statusText}`);
            }
            return await response.json();
        } catch (e: any) {
            lastError = e;
            const isTimeout = e.name === 'TimeoutError' || e.code === 'ETIMEDOUT' || e.cause?.code === 'ETIMEDOUT';
            if (isTimeout || e.message.includes('Server Error') || e.message.includes('fetch failed')) {
                // Wait before retry (exponentialish)
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                continue;
            }
            throw e; // Throw immediately for other errors (auth, 404, etc)
        }
    }
    throw lastError;
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
        tmdb_id: data.id.toString(),   // explicit field for library join
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

export async function getTVSeriesDetails(id: string) {
    const data = await fetchFromTMDB(`/tv/${id}`, {
        append_to_response: 'videos,watch/providers'
    });

    const trailer = data.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
    const usProviders = data['watch/providers']?.results?.US?.flatrate || data['watch/providers']?.results?.US?.buy || [];

    return {
        id: data.id.toString(),
        tmdb_id: data.id.toString(),
        title: data.name,
        year: data.first_air_date ? new Date(data.first_air_date).getFullYear() : 0,
        rating: data.vote_average || 0,
        ratingCount: data.vote_count || 0,
        poster: getImageUrl(data.poster_path),
        backdrop: getImageUrl(data.backdrop_path, 'original'),
        overview: data.overview,
        numberOfSeasons: data.number_of_seasons || 0,
        numberOfEpisodes: data.number_of_episodes || 0,
        trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
        watchProviders: usProviders.map((p: any) => ({
            name: p.provider_name,
            logoUrl: getImageUrl(p.logo_path),
            link: `https://www.themoviedb.org/tv/${id}/watch`,
        })),
        genres: data.genres?.map((g: any) => g.name) || [],
        status: data.status,
    };
}


export async function searchKeywords(query: string) {
    const data = await fetchFromTMDB('/search/keyword', { query });
    return data.results || [];
}

export async function searchMovie(query: string) {
    const data = await fetchFromTMDB('/search/movie', { query });
    return data.results?.[0] || null;
}

export async function searchPerson(query: string) {
    const data = await fetchFromTMDB('/search/person', { query });
    return data.results?.[0] || null;
}

const TMDB_GENRE_NAME_TO_ID: Record<string, number> = {
    'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35, 'Crime': 80,
    'Documentary': 99, 'Drama': 18, 'Family': 10751, 'Fantasy': 14, 'History': 36,
    'Horror': 27, 'Music': 10402, 'Mystery': 9648, 'Romance': 10749, 'Sci-Fi': 878, 'Science Fiction': 878,
    'TV Movie': 10770, 'Thriller': 53, 'War': 10752, 'Western': 37
};

export interface SearchOptions {
    keywords?: string[];
    tmdb_genres?: string[]; // Direct TMDB genre names
    year_range?: [number, number];
    sort_by?: string;
}

export async function searchMoviesByMood(moods: string[], options: SearchOptions = {}) {
    // 1. Map Custom Moods to Genres (Legacy support)
    const customMoodMap: Record<string, number> = {
        'Thrilling': 53, 'Heartwarming': 10751, 'Mind-bending': 878, 'Funny': 35,
        'Dark': 27, 'Uplifting': 10751, 'Intense': 28, 'Relaxing': 99,
        'Romantic': 10749, 'Epic': 12, 'Magical': 14, 'Gritty': 80,
        'Futuristic': 878, 'Nostalgic': 36, 'Artistic': 18, 'Spooky': 27,
        'Mysterious': 9648, 'Action-packed': 28
    };

    let genreIds = moods.map(m => customMoodMap[m]).filter(Boolean);

    // 2. Add specific TMDB genres if provided
    if (options.tmdb_genres) {
        const extraIds = options.tmdb_genres.map(g => TMDB_GENRE_NAME_TO_ID[g]).filter(Boolean);
        genreIds = [...new Set([...genreIds, ...extraIds])];
    }

    // 3. Resolve Keywords
    let keywordIds: string[] = [];
    if (options.keywords && options.keywords.length > 0) {
        // limit to first 3 keywords to save requests
        const keywordsToSearch = options.keywords.slice(0, 3);

        for (const k of keywordsToSearch) {
            try {
                const results = await searchKeywords(k);
                if (results.length > 0) {
                    keywordIds.push(results[0].id.toString());
                }
            } catch (e) {
                console.warn(`Failed to search keyword: ${k}`, e);
            }
        }
    }

    // 4. Build Discovery Params Logic
    const buildParams = (relaxed: boolean) => {
        const p: any = {
            sort_by: options.sort_by || 'popularity.desc',
            'vote_count.gte': '100',
            region: 'US',
            include_adult: 'false',
        };

        if (genreIds.length > 0) {
            p.with_genres = genreIds.join(',');
        }

        // Only include specific constraints if NOT relaxed
        if (!relaxed) {
            if (keywordIds.length > 0) {
                p.with_keywords = keywordIds.join(',');
            }
            if (options.year_range) {
                if (options.year_range[0]) p['primary_release_date.gte'] = `${options.year_range[0]}-01-01`;
                if (options.year_range[1]) p['primary_release_date.lte'] = `${options.year_range[1]}-12-31`;
            }
        }
        return p;
    };

    // Initial Search (Strict)
    let discoveryData = await fetchFromTMDB('/discover/movie', buildParams(false));
    let results = discoveryData.results || [];

    // Retry Search (Relaxed) if no results found and we had restrictive filters
    if (results.length === 0 && (keywordIds.length > 0 || options.year_range)) {
        console.log('No results found for strict terms. Retrying with relaxed constraints...');
        discoveryData = await fetchFromTMDB('/discover/movie', buildParams(true));
        results = discoveryData.results || [];
    }

    // FINAL EMERGENCY FALLBACK: Trending
    if (results.length === 0) {
        console.log('Zero results even after relaxation. Fetching trending movies as fallback.');
        try {
            // Fallback to trending so user always sees SOMETHING
            const trending = await fetchFromTMDB('/trending/movie/week');
            results = trending.results || [];
        } catch (e) {
            console.error("Critical: Failed to fetch trending fallback", e);
        }
    }

    const movies = results.slice(0, 10);

    // Fetch full details for home page picks - SEQUENTIAL to avoid Rate Limit/Timeout
    const validMovies: any[] = [];

    for (const movie of movies) {
        try {
            const details = await getMovieDetails(movie.id);
            if (details) validMovies.push(details);
        } catch (e) {
            console.error(`Failed to fetch details for movie ${movie.id}`, e);
        }
    }

    return {
        movies: validMovies,
        tags: [...moods, ...(options.keywords || [])]
    };
}

export async function searchMoviesByActor(actorId: string, moods: string[]) {
    // Reuse the legacy mood mapping for simplicity
    const customMoodMap: Record<string, number> = {
        'Thrilling': 53, 'Heartwarming': 10751, 'Mind-bending': 878, 'Funny': 35,
        'Dark': 27, 'Uplifting': 10751, 'Intense': 28, 'Relaxing': 99,
        'Romantic': 10749, 'Epic': 12, 'Magical': 14, 'Gritty': 80,
        'Futuristic': 878, 'Nostalgic': 36, 'Artistic': 18, 'Spooky': 27,
        'Mysterious': 9648, 'Action-packed': 28
    };

    const genreIds = moods.map(m => customMoodMap[m]).filter(Boolean);

    const params: any = {
        with_cast: actorId,
        sort_by: 'popularity.desc',
        'vote_count.gte': '50', // Lower threshold for actor deep cuts
        region: 'US',
        include_adult: 'false'
    };

    if (genreIds.length > 0) {
        params.with_genres = genreIds.join(',');
    }

    const discoveryData = await fetchFromTMDB('/discover/movie', params);
    const results = discoveryData.results || [];
    const movies = results.slice(0, 10);

    const validMovies: any[] = [];
    for (const movie of movies) {
        try {
            const details = await getMovieDetails(movie.id);
            if (details) validMovies.push(details);
        } catch (e) {
            // ignore error
        }
    }

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

    return results.results.slice(0, 60).map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
        runtime: 120,
        poster: getImageUrl(movie.poster_path),
        genres: movie.genre_ids?.map((id: number) => GENRE_MAP[id]).filter(Boolean) || [],
    }));
}
