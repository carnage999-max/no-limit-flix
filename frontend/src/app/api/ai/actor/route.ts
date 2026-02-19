import { NextRequest, NextResponse } from 'next/server';
import { searchPerson, searchMoviesByActor } from '@/lib/tmdb';
import type { ActorRequest, ActorResponse, MoviePick } from '@/types';
import { enrichMoviesWithPlayable } from '@/lib/library';

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
        const { movies, tags } = await searchMoviesByActor(actor.id.toString(), moodTags);

        if (movies.length === 0) {
            return NextResponse.json({ error: 'No movies found for this actor + mood combo' }, { status: 404 });
        }

        // 3. Enrichment Logic
        const enrichedPicks = await enrichMoviesWithPlayable(movies as MoviePick[]);

        const response: ActorResponse = {
            hero: enrichedPicks[0] as MoviePick,
            alternates: enrichedPicks.slice(1, 10) as MoviePick[],
            explanationTokens: [actor.name, ...tags]
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('Error in /api/ai/actor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
