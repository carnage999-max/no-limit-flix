import { NextRequest, NextResponse } from 'next/server';
import { searchMoviesByMood } from '@/lib/tmdb';
import type { AIPickRequest, AIPickResponse } from '@/types';
import { enrichMoviesWithPlayable } from '@/lib/library';

/**
 * POST /api/ai/pick
 *
 * Discovery-first: uses TMDb mood search to generate recommendations.
 * Compliance enrichment: if a recommended title also exists in our hosted library
 * (matched by tmdbId), we mark it as playable and attach the assetId + cloudfrontUrl.
 * Only OUR content is ever marked playable — no external streams.
 */
export async function POST(request: NextRequest) {
    try {
        const body: AIPickRequest = await request.json();
        const { moods = [], searchParams } = body;

        // 1. Get discovery results from TMDb
        const { movies, tags } = await searchMoviesByMood(moods, searchParams);

        if (movies.length === 0) {
            return NextResponse.json(
                { error: 'No movies found matching your criteria' },
                { status: 404 }
            );
        }

        // 2. Enrichment Logic (Centralized)
        const allPicks = [movies[0], ...movies.slice(1, 10)];
        const enrichedPicks = await enrichMoviesWithPlayable(allPicks);

        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response: AIPickResponse = {
            sessionId,
            hero: enrichedPicks[0],
            alternates: enrichedPicks.slice(1),
            explanationTokens: tags,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error in /api/ai/pick:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate picks' },
            { status: 500 }
        );
    }
}
