import prisma from '@/lib/db';

export type RatingBreakdown = {
    score: number | null;
    count: number;
    weight: number;
};

export type RatingSummary = {
    finalScore: number | null;
    external: RatingBreakdown;
    internal: RatingBreakdown;
    engagement: RatingBreakdown;
    userRating?: {
        score: number;
        feedback: string | null;
        verifiedCompletion: boolean;
        weight: number;
        updatedAt: string;
    } | null;
};

type RatingSource = {
    averageRating?: number | null;
    ratingCount?: number | null;
};

const EXTERNAL_WEIGHT = 0.5;
const INTERNAL_WEIGHT = 0.3;
const ENGAGEMENT_WEIGHT = 0.2;

const clampScore = (value: number) => Math.min(10, Math.max(0, value));
const roundScore = (value: number) => Math.round(value * 10) / 10;

const scoreOrNull = (value: number | null | undefined) => {
    if (!Number.isFinite(Number(value))) return null;
    return clampScore(Number(value));
};

const buildFinalScore = (parts: RatingBreakdown[]) => {
    const available = parts.filter((part) => part.score !== null);
    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, part) => sum + part.weight, 0);
    if (totalWeight <= 0) return null;

    const weightedScore = available.reduce((sum, part) => sum + Number(part.score) * part.weight, 0) / totalWeight;
    return roundScore(clampScore(weightedScore));
};

const emptySummary = (source?: RatingSource | null): RatingSummary => {
    const externalScore = scoreOrNull(source?.averageRating);
    const external: RatingBreakdown = {
        score: externalScore,
        count: Number(source?.ratingCount || 0),
        weight: EXTERNAL_WEIGHT,
    };
    const internal: RatingBreakdown = { score: null, count: 0, weight: INTERNAL_WEIGHT };
    const engagement: RatingBreakdown = { score: null, count: 0, weight: ENGAGEMENT_WEIGHT };

    return {
        finalScore: buildFinalScore([external, internal, engagement]),
        external,
        internal,
        engagement,
    };
};

export function getRatingWeight(completionPercent?: number | null) {
    const completion = Number(completionPercent || 0);
    if (completion >= 80) return 1;
    if (completion >= 50) return 0.7;
    return 0.35;
}

export async function getRatingSummaries(videoIds: string[], externalRatings: Record<string, RatingSource> = {}) {
    const ids = Array.from(new Set(videoIds.filter(Boolean)));
    const summaries = new Map<string, RatingSummary>();

    for (const id of ids) {
        summaries.set(id, emptySummary(externalRatings[id]));
    }

    if (ids.length === 0) return summaries;

    const [ratings, watchAggregates, completedAggregates] = await Promise.all([
        prisma.userRating.findMany({
            where: { videoId: { in: ids } },
            select: { videoId: true, score: true, weight: true },
        }),
        prisma.watchHistory.groupBy({
            by: ['videoId'],
            where: { videoId: { in: ids } },
            _avg: { completionPercent: true },
            _count: { id: true },
        }),
        prisma.watchHistory.groupBy({
            by: ['videoId'],
            where: { videoId: { in: ids }, isCompleted: true },
            _count: { id: true },
        }),
    ]);

    const ratingsByVideo = new Map<string, { weightedTotal: number; totalWeight: number; count: number }>();
    for (const rating of ratings) {
        const current = ratingsByVideo.get(rating.videoId) || { weightedTotal: 0, totalWeight: 0, count: 0 };
        const weight = Number(rating.weight || 0);
        current.weightedTotal += rating.score * 2 * weight;
        current.totalWeight += weight;
        current.count++;
        ratingsByVideo.set(rating.videoId, current);
    }

    const completedByVideo = new Map(completedAggregates.map((row) => [row.videoId, row._count.id]));

    for (const id of ids) {
        const summary = summaries.get(id) || emptySummary(externalRatings[id]);
        const internalAggregate = ratingsByVideo.get(id);
        if (internalAggregate && internalAggregate.totalWeight > 0) {
            summary.internal = {
                score: roundScore(clampScore(internalAggregate.weightedTotal / internalAggregate.totalWeight)),
                count: internalAggregate.count,
                weight: INTERNAL_WEIGHT,
            };
        }

        const watchAggregate = watchAggregates.find((row) => row.videoId === id);
        if (watchAggregate && watchAggregate._count.id > 0) {
            const averageCompletion = Number(watchAggregate._avg.completionPercent || 0);
            const completedCount = completedByVideo.get(id) || 0;
            const completionRatioScore = (completedCount / watchAggregate._count.id) * 10;
            const engagementScore = (averageCompletion / 10) * 0.75 + completionRatioScore * 0.25;
            summary.engagement = {
                score: roundScore(clampScore(engagementScore)),
                count: watchAggregate._count.id,
                weight: ENGAGEMENT_WEIGHT,
            };
        }

        summary.finalScore = buildFinalScore([summary.external, summary.internal, summary.engagement]);
        summaries.set(id, summary);
    }

    return summaries;
}

export async function getRatingSummary(videoId: string, userId?: string | null) {
    const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, averageRating: true, ratingCount: true },
    });

    if (!video) return null;

    const summaries = await getRatingSummaries([videoId], {
        [videoId]: {
            averageRating: video.averageRating,
            ratingCount: video.ratingCount,
        },
    });

    const summary = summaries.get(videoId) || emptySummary(video);

    if (userId) {
        const userRating = await prisma.userRating.findUnique({
            where: { userVideoRatingUnique: { userId, videoId } },
            select: {
                score: true,
                feedback: true,
                verifiedCompletion: true,
                weight: true,
                updatedAt: true,
            },
        });

        summary.userRating = userRating
            ? {
                ...userRating,
                updatedAt: userRating.updatedAt.toISOString(),
            }
            : null;
    }

    return summary;
}

export async function attachRatingSummaries<T extends { id: string; averageRating?: number | null; ratingCount?: number | null }>(items: T[]) {
    const summaries = await getRatingSummaries(
        items.map((item) => item.id),
        Object.fromEntries(items.map((item) => [item.id, { averageRating: item.averageRating, ratingCount: item.ratingCount }]))
    );

    return items.map((item) => {
        const ratingSummary = summaries.get(item.id) || emptySummary(item);
        return {
            ...item,
            ratingSummary,
            hybridRating: ratingSummary.finalScore,
        };
    });
}
