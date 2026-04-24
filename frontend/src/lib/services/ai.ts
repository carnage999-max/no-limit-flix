import type { ActorProfile, MoviePick } from '@/types';

// Weight constants from spec Section 5
const W_ACTOR_SIMILARITY = 0.45;
const W_MOOD_ALIGNMENT = 0.30;
const W_TITLE_SIMILARITY = 0.15;
const W_PERMANENCE = 0.10;

export const MOOD_TAXONOMY = {
    intensity: {
        label: 'Intensity',
        description: 'How emotionally or physically charged the experience should feel',
        options: [
            { value: 'intense',   label: 'Intense',   weight: 1.0 },
            { value: 'moderate',  label: 'Moderate',  weight: 0.5 },
            { value: 'relaxing',  label: 'Relaxing',  weight: 0.0 },
        ],
    },
    pacing: {
        label: 'Pacing',
        description: 'The narrative tempo — how fast the story moves',
        options: [
            { value: 'fast',   label: 'Fast',   weight: 1.0 },
            { value: 'medium', label: 'Medium', weight: 0.5 },
            { value: 'slow',   label: 'Slow',   weight: 0.0 },
        ],
    },
    warmth: {
        label: 'Warmth',
        description: 'The emotional temperature — hopeful and warm vs. cold and bleak',
        options: [
            { value: 'warm',    label: 'Warm',    weight: 1.0 },
            { value: 'neutral', label: 'Neutral', weight: 0.5 },
            { value: 'cold',    label: 'Cold',    weight: 0.0 },
        ],
    },
} as const;

export type MoodDimension = keyof typeof MOOD_TAXONOMY;
export type MoodTaxonomyOption = { value: string; label: string; weight: number };

export const MOOD_TO_GENRES: Record<string, string[]> = {
    'serious':      ['Drama', 'Thriller', 'Crime'],
    'tense':        ['Thriller', 'Horror', 'Crime', 'Mystery'],
    'intense':      ['Action', 'Thriller', 'Drama'],
    'dark':         ['Horror', 'Crime', 'Drama', 'Thriller'],
    'light':        ['Comedy', 'Family', 'Romance'],
    'funny':        ['Comedy'],
    'romantic':     ['Romance', 'Drama'],
    'epic':         ['Action', 'Adventure', 'Sci-Fi', 'Fantasy'],
    'mysterious':   ['Mystery', 'Thriller'],
    'heartwarming': ['Family', 'Romance', 'Drama'],
    'relaxing':     ['Drama', 'Documentary', 'Comedy'],
    'thrilling':    ['Thriller', 'Action', 'Horror'],
    'nostalgic':    ['Drama', 'History', 'Family'],
    'mind-bending': ['Sci-Fi', 'Mystery', 'Fantasy'],
    'uplifting':    ['Family', 'Comedy', 'Drama'],
    'gritty':       ['Crime', 'Drama', 'Thriller'],
    'artistic':     ['Drama', 'Documentary'],
    'futuristic':   ['Sci-Fi', 'Action'],
    'action-packed':['Action', 'Adventure', 'Thriller'],
};

function calculateActorMatch(actor: ActorProfile, movie: MoviePick): number {
    const genreBlend = actor.genreBlend;
    const movieGenres = (movie.genres || []).map(g => g.toLowerCase());

    // Genre alignment: how much does actor's genre weight align with movie genres
    let genreScore = 0;
    let genreWeight = 0;
    for (const genre of movieGenres) {
        if (genreBlend[genre] !== undefined) {
            genreScore += genreBlend[genre];
            genreWeight++;
        }
    }
    const normalizedGenreScore = genreWeight > 0 ? genreScore / genreWeight : 0.25;

    // Pacing alignment: use runtime as a proxy for film pacing
    const runtime = movie.runtime || 120;
    let pacingScore = 0.5;
    if (actor.pacingTendency === 'slow' && runtime > 130) pacingScore = 0.85;
    else if (actor.pacingTendency === 'slow' && runtime < 100) pacingScore = 0.2;
    else if (actor.pacingTendency === 'fast' && runtime < 110) pacingScore = 0.85;
    else if (actor.pacingTendency === 'fast' && runtime > 140) pacingScore = 0.2;
    else if (actor.pacingTendency === 'medium') pacingScore = 0.6;

    return (normalizedGenreScore * 0.7) + (pacingScore * 0.3);
}

function calculateMoodMatch(movie: MoviePick, moodTags: string[]): number {
    if (moodTags.length === 0) return 0.5;

    const movieGenres = (movie.genres || []).map(g => g.toLowerCase());
    let matches = 0;

    for (const mood of moodTags) {
        const targetGenres = (MOOD_TO_GENRES[mood.toLowerCase()] || []).map(g => g.toLowerCase());
        if (targetGenres.some(tg => movieGenres.includes(tg))) {
            matches++;
        }
    }

    return matches / moodTags.length;
}

function calculateTitleSimilarity(actor: ActorProfile, movie: MoviePick, isActorFilm: boolean): number {
    if (isActorFilm) return 1.0;

    const movieGenres = (movie.genres || []).map(g => g.toLowerCase());
    let totalWeight = 0;
    for (const genre of movieGenres) {
        totalWeight += actor.genreBlend[genre] ?? 0;
    }
    return Math.min(totalWeight, 1.0);
}

export function calculateRecommendationScore(
    actor: ActorProfile,
    movie: MoviePick,
    moodTags: string[],
    isActorFilm = false
): number {
    const actorSim = calculateActorMatch(actor, movie);
    const moodAlign = calculateMoodMatch(movie, moodTags);
    const titleSim = calculateTitleSimilarity(actor, movie, isActorFilm);
    const permanence = Math.min(actor.permanenceScore, 1.0);

    return (
        actorSim * W_ACTOR_SIMILARITY +
        moodAlign * W_MOOD_ALIGNMENT +
        titleSim * W_TITLE_SIMILARITY +
        permanence * W_PERMANENCE
    );
}

export function generateExplanation(actor: ActorProfile, movie: MoviePick, moodTags: string[]): string {
    const tone = (actor.toneProfile as string[])[0] || 'distinctive';
    const moodStr = moodTags.length > 0 ? moodTags.join('/') : 'your current mood';
    return `Chosen because it reflects the ${tone} intensity and ${actor.pacingTendency} pacing you enjoy from ${actor.name}, matching your request for a ${moodStr} experience.`;
}

export function buildActorProfileFromTMDB(tmdbActor: {
    id: number;
    name: string;
    profile_path?: string | null;
    known_for?: Array<{ genre_ids?: number[] }>;
}): Omit<ActorProfile, 'id'> {
    const GENRE_ID_MAP: Record<number, string> = {
        28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy', 80: 'crime',
        99: 'documentary', 18: 'drama', 10751: 'family', 14: 'fantasy', 36: 'history',
        27: 'horror', 10402: 'music', 9648: 'mystery', 10749: 'romance', 878: 'sci-fi',
        53: 'thriller', 10752: 'war', 37: 'western'
    };

    const genreCount: Record<string, number> = {};
    for (const item of (tmdbActor.known_for || [])) {
        for (const gId of (item.genre_ids || [])) {
            const gName = GENRE_ID_MAP[gId];
            if (gName) genreCount[gName] = (genreCount[gName] || 0) + 1;
        }
    }

    const total = Object.values(genreCount).reduce((a, b) => a + b, 0) || 1;
    const genreBlend: Record<string, number> = {};
    for (const [g, count] of Object.entries(genreCount)) {
        genreBlend[g] = parseFloat((count / total).toFixed(2));
    }

    if (Object.keys(genreBlend).length === 0) {
        genreBlend['drama'] = 0.5;
        genreBlend['thriller'] = 0.3;
        genreBlend['action'] = 0.2;
    }

    const toneProfile: string[] = [];
    if ((genreBlend['thriller'] || 0) > 0.25 || (genreBlend['crime'] || 0) > 0.2) toneProfile.push('intense');
    if ((genreBlend['drama'] || 0) > 0.35) toneProfile.push('grounded');
    if ((genreBlend['action'] || 0) > 0.3) toneProfile.push('energetic');
    if ((genreBlend['comedy'] || 0) > 0.3) toneProfile.push('light');
    if (toneProfile.length === 0) toneProfile.push('versatile');

    let pacingTendency = 'medium';
    if ((genreBlend['action'] || 0) > 0.4 || (genreBlend['thriller'] || 0) > 0.4) {
        pacingTendency = 'fast';
    } else if ((genreBlend['drama'] || 0) > 0.5 || (genreBlend['documentary'] || 0) > 0.3) {
        pacingTendency = 'slow';
    }

    const emotionalRange = Math.min(0.3 + (genreBlend['drama'] || 0), 1.0);

    return {
        name: tmdbActor.name,
        tmdbId: tmdbActor.id.toString(),
        profilePath: tmdbActor.profile_path || null,
        toneProfile,
        pacingTendency,
        emotionalRange,
        genreBlend,
        rewatchability: 0.6,
        permanenceScore: 1.0,
    };
}
