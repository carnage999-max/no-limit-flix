export interface Movie {
    id: string;
    title: string;
    year: number;
    runtime: number;
    poster: string;
    backdrop?: string;
    genres: string[];
}

export interface MoviePick extends Movie {
    explanation: string;
    trailerUrl?: string;
    watchProviders: WatchProvider[];
    playable?: boolean;
    assetId?: string;
    cloudfrontUrl?: string;
    permanence?: 'Permanent Core' | 'Long-Term' | 'Licensed';
}

export interface WatchProvider {
    name: string;
    logoUrl: string;
    link: string;
}

export interface AIPickRequest {
    moods: string[];
    freeText?: string;
    constraints?: Record<string, unknown>;
    adjustments?: {
        tension_bias?: number;
        pacing_bias?: number;
        intensity_bias?: number;
    };
    searchParams?: {
        tmdb_genres?: string[];
        keywords?: string[];
        year_range?: [number, number];
        sort_by?: string;
    };
}

export interface AIPickResponse {
    sessionId: string;
    hero: MoviePick;
    alternates: MoviePick[];
    explanationTokens: string[];
}

export interface RepickRequest {
    sessionId: string;
    feedback: string[];
    currentSearchParams?: {
        tmdb_genres?: string[];
        keywords?: string[];
        year_range?: [number, number];
        sort_by?: string;
    };
}

export interface RepickResponse {
    hero: MoviePick;
    alternates: MoviePick[];
    explanationTokens: string[];
}
