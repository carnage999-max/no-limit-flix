import { NextRequest, NextResponse } from 'next/server';
import { searchMoviesByMood } from '@/lib/tmdb';
import type { AIPickRequest, AIPickResponse } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body: AIPickRequest = await request.json();
        const { moods = [], freeText = '' } = body;

        // Search using TMDb
        const { movies, tags } = await searchMoviesByMood(moods);

        if (movies.length === 0) {
            return NextResponse.json(
                { error: 'No movies found matching your criteria' },
                { status: 404 }
            );
        }

        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response: AIPickResponse = {
            sessionId,
            hero: movies[0],
            alternates: movies.slice(1, 5),
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
