import { NextRequest, NextResponse } from 'next/server';
import { searchPerson, searchMoviesByActor } from '@/lib/tmdb';
import type { ActorRequest, ActorResponse } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body: ActorRequest = await request.json();
        const { actorName, moodTags = [] } = body;

        if (!actorName) {
            return NextResponse.json({ error: 'Actor name is required' }, { status: 400 });
        }

        // 1. Find the actor
        const actor = await searchPerson(actorName);
        if (!actor) {
            return NextResponse.json({ error: 'Actor not found' }, { status: 404 });
        }

        // 2. Search their movies filtered by mood/genre
        // We reuse the simple genre mapping from moods here, no advanced AI deep analysis
        // as per the user's request to "just wire the TMDB API".
        const { movies, tags } = await searchMoviesByActor(actor.id.toString(), moodTags);

        if (movies.length === 0) {
            return NextResponse.json({ error: 'No movies found for this actor + mood combo' }, { status: 404 });
        }

        const response: ActorResponse = {
            hero: movies[0],
            alternates: movies.slice(1, 10),
            explanationTokens: [actor.name, ...tags]
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('Error in /api/ai/actor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
