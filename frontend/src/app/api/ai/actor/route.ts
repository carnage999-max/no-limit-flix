import { NextRequest, NextResponse } from 'next/server';
import { searchPerson, searchMoviesByActor, getMovieDetails } from '@/lib/tmdb';
import { enrichMoviesWithPlayable } from '@/lib/library';
import { calculateRecommendationScore, generateExplanation, buildActorProfileFromTMDB } from '@/lib/services/ai';
import prisma from '@/lib/db';
import type { ActorRequest, ActorResponse, MoviePick, ActorProfile } from '@/types';

async function findOrCreateActor(req: ActorRequest): Promise<ActorProfile | null> {
    if (req.actorId) {
        const actor = await (prisma as any).actor.findUnique({ where: { id: req.actorId } });
        if (actor) return actor as ActorProfile;
    }

    if (req.actorTmdbId) {
        const existing = await (prisma as any).actor.findUnique({ where: { tmdbId: req.actorTmdbId } });
        if (existing) return existing as ActorProfile;
    }

    let tmdbActor: any = null;
    if (req.actorTmdbId) {
        try {
            const { fetchFromTMDB } = await import('@/lib/tmdb');
            tmdbActor = await fetchFromTMDB(`/person/${req.actorTmdbId}`, { append_to_response: 'movie_credits' });
            if (tmdbActor && tmdbActor.movie_credits?.cast) {
                tmdbActor.known_for = tmdbActor.movie_credits.cast.slice(0, 10).map((m: any) => ({
                    genre_ids: m.genre_ids || [],
                }));
            }
        } catch { /* fallthrough to name search */ }
    }

    if (!tmdbActor && req.actorName) {
        tmdbActor = await searchPerson(req.actorName);
    }

    if (!tmdbActor) return null;

    const profile = buildActorProfileFromTMDB(tmdbActor);

    const actor = await (prisma as any).actor.upsert({
        where: { tmdbId: profile.tmdbId! },
        update: {
            name: profile.name,
            profilePath: profile.profilePath,
            toneProfile: profile.toneProfile,
            pacingTendency: profile.pacingTendency,
            emotionalRange: profile.emotionalRange,
            genreBlend: profile.genreBlend,
        },
        create: {
            name: profile.name,
            tmdbId: profile.tmdbId,
            profilePath: profile.profilePath,
            toneProfile: profile.toneProfile,
            pacingTendency: profile.pacingTendency,
            emotionalRange: profile.emotionalRange,
            genreBlend: profile.genreBlend,
            rewatchability: profile.rewatchability,
            permanenceScore: profile.permanenceScore,
        },
    });

    if (tmdbActor.movie_credits?.cast) {
        const castCredits: any[] = tmdbActor.movie_credits.cast;
        for (const credit of castCredits) {
            const video = await (prisma as any).video.findFirst({
                where: { tmdbId: credit.id.toString() },
                select: { id: true },
            });
            if (video) {
                await (prisma as any).actorOnVideo.upsert({
                    where: { actorId_videoId: { actorId: actor.id, videoId: video.id } },
                    update: { role: credit.character || null, isLead: (credit.order ?? 99) < 3 },
                    create: {
                        actorId: actor.id,
                        videoId: video.id,
                        role: credit.character || null,
                        isLead: (credit.order ?? 99) < 3,
                    },
                });
            }
        }
    }

    return actor as ActorProfile;
}

async function scoreInternalLibrary(actor: ActorProfile, moodTags: string[]): Promise<MoviePick[]> {
    // Resolve which library videos this actor actually appeared in
    const actorVideoLinks: { videoId: string; isLead: boolean }[] = await (prisma as any).actorOnVideo.findMany({
        where: { actorId: actor.id },
        select: { videoId: true, isLead: true },
    });
    const actorVideoIds = new Set(actorVideoLinks.map((l: { videoId: string }) => l.videoId));

    const videos = await (prisma as any).video.findMany({
        where: { status: 'completed' },
        select: {
            id: true,
            title: true,
            genre: true,
            releaseYear: true,
            duration: true,
            averageRating: true,
            tmdbId: true,
            thumbnailUrl: true,
            s3Url: true,
            sourceProvider: true,
        },
        take: 200,
    });

    if (videos.length === 0) return [];

    const moviePicks: MoviePick[] = videos.map((v: any) => ({
        id: v.tmdbId || v.id,
        tmdb_id: v.tmdbId || undefined,
        title: v.title,
        year: v.releaseYear || 0,
        runtime: v.duration ? Math.floor(v.duration / 60) : 120,
        poster: v.thumbnailUrl || '',
        genres: v.genre ? v.genre.split(',').map((g: string) => g.trim()) : [],
        explanation: '',
        watchProviders: [],
        playable: true,
        assetId: v.id,
        cloudfrontUrl: v.s3Url || undefined,
        averageRating: v.averageRating || undefined,
    }));

    const scored = moviePicks.map(movie => ({
        movie,
        score: calculateRecommendationScore(actor, movie, moodTags, actorVideoIds.has(movie.assetId!)),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.filter(s => s.score > 0.35).map(s => s.movie);
}

async function generateAIExplanation(actor: ActorProfile, movie: MoviePick, moodTags: string[]): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return generateExplanation(actor, movie, moodTags);

    try {
        const toneProfile = actor.toneProfile as string[];
        const prompt = `In one sentence, explain why "${movie.title}" (${movie.genres?.slice(0, 2).join(', ')}) is a great pick for someone who loves ${actor.name}'s ${toneProfile[0] || 'distinctive'}, ${actor.pacingTendency}-paced style${moodTags.length ? ` and is feeling ${moodTags.join('/')}` : ''}. Be specific and warm. No quotes.`;

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 120,
            }),
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return generateExplanation(actor, movie, moodTags);
        const data = await res.json();
        const raw: string = data.choices?.[0]?.message?.content || '';
        const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return clean || generateExplanation(actor, movie, moodTags);
    } catch {
        return generateExplanation(actor, movie, moodTags);
    }
}

export async function POST(request: NextRequest) {
    if (process.env.ENABLE_MOOD_SIMILARITY !== 'true') {
        return NextResponse.json({ error: 'Actor mood similarity is not enabled' }, { status: 503 });
    }

    try {
        const body: ActorRequest = await request.json();
        const { moodTags = [], constraints } = body;

        if (!body.actorId && !body.actorName && !body.actorTmdbId) {
            return NextResponse.json({ error: 'actorId, actorName, or actorTmdbId is required' }, { status: 400 });
        }

        const actor = await findOrCreateActor(body);
        if (!actor) {
            return NextResponse.json({ error: 'Actor not found' }, { status: 404 });
        }

        let picks = await scoreInternalLibrary(actor, moodTags);

        if (picks.length < 3 && actor.tmdbId) {
            const { movies } = await searchMoviesByActor(actor.tmdbId, moodTags);
            const enriched = await enrichMoviesWithPlayable(movies as MoviePick[]);
            const existingIds = new Set(picks.map(p => p.id));
            const tmdbPicks = enriched.filter(m => !existingIds.has(m.id));
            picks = [...picks, ...tmdbPicks];
        } else if (picks.length < 3 && body.actorName) {
            const tmdbActor = await searchPerson(body.actorName);
            if (tmdbActor) {
                const { movies } = await searchMoviesByActor(tmdbActor.id.toString(), moodTags);
                const enriched = await enrichMoviesWithPlayable(movies as MoviePick[]);
                const existingIds = new Set(picks.map(p => p.id));
                picks = [...picks, ...enriched.filter(m => !existingIds.has(m.id))];
            }
        }

        if (picks.length === 0) {
            return NextResponse.json({ error: 'No movies found for this actor + mood combination' }, { status: 404 });
        }

        const hero = picks[0];
        const alternates = picks.slice(1, 10);

        const explanation = await generateAIExplanation(actor, hero, moodTags);
        const topScore = calculateRecommendationScore(actor, hero, moodTags);
        const confidence_score = parseFloat(Math.min(0.5 + topScore * 0.5, 0.99).toFixed(2));

        const toneProfile = actor.toneProfile as string[];

        const response: ActorResponse = {
            hero,
            alternates,
            explanationTokens: [actor.name, ...moodTags, toneProfile[0] || ''].filter(Boolean),
            explanation,
            confidence_score,
            actorProfile: {
                id: actor.id,
                name: actor.name,
                profilePath: actor.profilePath,
                toneProfile,
                pacingTendency: actor.pacingTendency,
            },
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('Error in /api/ai/actor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
