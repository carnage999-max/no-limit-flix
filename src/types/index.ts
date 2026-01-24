// Core data types for No Limit Flix

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
}

export interface RepickResponse {
    hero: MoviePick;
    alternates: MoviePick[];
    explanationTokens: string[];
}

export interface Collection {
    slug: string;
    title: string;
    description: string;
    promiseStatement: string;
    movies: Movie[];
}

export type FilterLength = 'Short' | 'Medium' | 'Long';
export type FilterIntensity = 'Low' | 'Medium' | 'High';
export type FilterTone = 'Light' | 'Neutral' | 'Heavy';

export interface CollectionFilters {
    length?: FilterLength;
    intensity?: FilterIntensity;
    tone?: FilterTone;
}
