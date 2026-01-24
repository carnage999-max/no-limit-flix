import { NextRequest, NextResponse } from 'next/server';
import { searchMoviesByMood } from '@/lib/tmdb';
import type { RepickRequest, RepickResponse } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body: RepickRequest = await request.json();
        const { feedback = [] } = body;

        // Map feedback to "moods" for TMDb search
        const feedbackToMoods: Record<string, string> = {
            'Too slow': 'Intense',
            'Too dark': 'Uplifting',
            'Seen it': 'Epic',
            'Not intense enough': 'Intense',
            'Try something lighter': 'Funny',
        };

        const moods = feedback.map(f => feedbackToMoods[f]).filter(Boolean);
        if (moods.length === 0) moods.push('Thrilling');

        // Re-search using TMDb
        const { movies, tags } = await searchMoviesByMood(moods);

        if (movies.length === 0) {
            return NextResponse.json(
                { error: 'No movies found' },
                { status: 404 }
            );
        }

        const response: RepickResponse = {
            hero: movies[0],
            alternates: movies.slice(1, 10),
            explanationTokens: [...feedback, ...tags.filter(t => !feedback.includes(t))],
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error in /api/ai/repick:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate new picks' },
            { status: 500 }
        );
    }
}
