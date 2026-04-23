import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildActorProfileFromTMDB } from '@/lib/services/ai';
import { fetchFromTMDB } from '@/lib/tmdb';

async function ingestActorByTmdbId(tmdbId: string): Promise<{ name: string; linked: number }> {
    const tmdbActor = await fetchFromTMDB(`/person/${tmdbId}`, { append_to_response: 'movie_credits' });

    if (tmdbActor.movie_credits?.cast) {
        tmdbActor.known_for = tmdbActor.movie_credits.cast.slice(0, 10).map((m: any) => ({
            genre_ids: m.genre_ids || [],
        }));
    }

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

    let linked = 0;
    if (tmdbActor.movie_credits?.cast) {
        for (const credit of tmdbActor.movie_credits.cast as any[]) {
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
                linked++;
            }
        }
    }

    return { name: actor.name, linked };
}

export async function POST(request: NextRequest) {
    const secret = process.env.ACTOR_METADATA_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'ACTOR_METADATA_SECRET is not configured' }, { status: 503 });
    }

    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { tmdbIds?: string[] };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { tmdbIds = [] } = body;

    if (tmdbIds.length === 0) {
        return NextResponse.json({ error: 'Provide at least one tmdbId' }, { status: 400 });
    }

    const ingested: { tmdbId: string; name?: string; linked?: number; status: string; error?: string }[] = [];

    for (const tmdbId of tmdbIds) {
        try {
            const { name, linked } = await ingestActorByTmdbId(tmdbId);
            ingested.push({ tmdbId, name, linked, status: 'ok' });
        } catch (e: any) {
            ingested.push({ tmdbId, status: 'error', error: e.message });
        }
    }

    return NextResponse.json({ ingested, count: ingested.filter(r => r.status === 'ok').length });
}
