import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { getRatingSummary, getRatingWeight } from '@/lib/ratings';

const MIN_UPDATE_INTERVAL_MS = 10 * 60 * 1000;
const MAX_RATINGS_PER_HOUR = 30;
const MAX_FEEDBACK_LENGTH = 1200;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;
        const sessionUser = await getSessionUser(request);
        const summary = await getRatingSummary(videoId, sessionUser?.id);

        if (!summary) {
            return NextResponse.json({ error: 'Title not found' }, { status: 404 });
        }

        return NextResponse.json({ rating: summary });
    } catch (error) {
        console.error('Rating lookup error:', error);
        return NextResponse.json({ error: 'Failed to load rating' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { videoId } = await params;
        const body = await request.json();
        const score = Number(body?.score);
        const feedback = typeof body?.feedback === 'string'
            ? body.feedback.trim().slice(0, MAX_FEEDBACK_LENGTH)
            : null;

        if (!Number.isInteger(score) || score < 1 || score > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5 stars' }, { status: 400 });
        }

        const [video, existingRating, recentRatingCount, watchHistory] = await Promise.all([
            prisma.video.findFirst({
                where: { id: videoId, status: 'completed' },
                select: { id: true },
            }),
            prisma.userRating.findUnique({
                where: { userVideoRatingUnique: { userId: sessionUser.id, videoId } },
                select: { updatedAt: true },
            }),
            prisma.userRating.count({
                where: {
                    userId: sessionUser.id,
                    createdAt: {
                        gte: new Date(Date.now() - 60 * 60 * 1000),
                    },
                },
            }),
            prisma.watchHistory.findUnique({
                where: { userVideoUnique: { userId: sessionUser.id, videoId } },
                select: { completionPercent: true, isCompleted: true },
            }),
        ]);

        if (!video) {
            return NextResponse.json({ error: 'Title not found' }, { status: 404 });
        }

        if (existingRating && Date.now() - existingRating.updatedAt.getTime() < MIN_UPDATE_INTERVAL_MS) {
            return NextResponse.json(
                { error: 'Please wait before changing this rating again' },
                { status: 429 }
            );
        }

        if (!existingRating && recentRatingCount >= MAX_RATINGS_PER_HOUR) {
            return NextResponse.json(
                { error: 'Rating limit reached. Try again later.' },
                { status: 429 }
            );
        }

        const completionPercent = watchHistory?.completionPercent ?? 0;
        const verifiedCompletion = Boolean(watchHistory?.isCompleted || completionPercent >= 50);
        const weight = getRatingWeight(completionPercent);

        await prisma.userRating.upsert({
            where: { userVideoRatingUnique: { userId: sessionUser.id, videoId } },
            create: {
                userId: sessionUser.id,
                videoId,
                score,
                feedback,
                watchCompletionPercent: completionPercent,
                verifiedCompletion,
                weight,
            },
            update: {
                score,
                feedback,
                watchCompletionPercent: completionPercent,
                verifiedCompletion,
                weight,
            },
        });

        const summary = await getRatingSummary(videoId, sessionUser.id);
        return NextResponse.json({ rating: summary });
    } catch (error) {
        console.error('Rating submit error:', error);
        return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }
}
