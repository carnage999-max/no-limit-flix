import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

type MoviePerformanceRow = {
    videoId: string;
    title: string;
    genre: string | null;
    releaseYear: number | null;
    watchCount: number;
    completedCount: number;
    avgCompletion: number;
    minutesWatched: number;
    userRatingCount: number;
    avgUserRating: number;
};

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 20)));

        const [
            totalMovies,
            totalUsers,
            totalViews,
            completedViews,
            durationAggregate,
            userRatingCount,
            userRatingAggregate,
            moviePerformanceRaw,
        ] = await Promise.all([
            prisma.video.count({ where: { type: 'movie', status: 'completed' } }),
            prisma.user.count(),
            prisma.watchHistory.count(),
            prisma.watchHistory.count({ where: { isCompleted: true } }),
            prisma.watchHistory.aggregate({ _sum: { duration: true } }),
            prisma.userRating.count(),
            prisma.userRating.aggregate({ _avg: { score: true } }),
            prisma.$queryRaw<MoviePerformanceRow[]>`
                SELECT
                    v.id AS "videoId",
                    v.title,
                    v.genre,
                    v."releaseYear",
                    COALESCE(w."watchCount", 0)::int AS "watchCount",
                    COALESCE(w."completedCount", 0)::int AS "completedCount",
                    COALESCE(w."avgCompletion", 0)::int AS "avgCompletion",
                    COALESCE(w."minutesWatched", 0)::int AS "minutesWatched",
                    COALESCE(ur."userRatingCount", 0)::int AS "userRatingCount",
                    COALESCE(ur."avgUserRating", 0)::float AS "avgUserRating"
                FROM "Video" v
                LEFT JOIN (
                    SELECT
                        "videoId",
                        COUNT(id)::int AS "watchCount",
                        COUNT(id) FILTER (WHERE "isCompleted" = true)::int AS "completedCount",
                        COALESCE(ROUND(AVG("completionPercent"))::int, 0) AS "avgCompletion",
                        COALESCE(ROUND(SUM(COALESCE(duration, 0)) / 60)::int, 0) AS "minutesWatched"
                    FROM "WatchHistory"
                    GROUP BY "videoId"
                ) w ON w."videoId" = v.id
                LEFT JOIN (
                    SELECT
                        "videoId",
                        COUNT(id)::int AS "userRatingCount",
                        COALESCE(ROUND(AVG(score * 2)::numeric, 1)::float, 0) AS "avgUserRating"
                    FROM "UserRating"
                    GROUP BY "videoId"
                ) ur ON ur."videoId" = v.id
                WHERE v.type = 'movie'
                  AND v.status = 'completed'
                ORDER BY COALESCE(w."watchCount", 0) DESC, v.title ASC
                LIMIT ${limit}
            `,
        ]);

        const totalMinutesWatched = Math.round((durationAggregate._sum.duration || 0) / 60);

        return NextResponse.json({
            stats: {
                totalMovies,
                totalUsers,
                totalViews,
                completedViews,
                completionRate: totalViews > 0 ? Math.round((completedViews / totalViews) * 100) : 0,
                totalMinutesWatched,
                userRatingCount,
                averageUserRating: userRatingAggregate._avg.score ? Math.round(userRatingAggregate._avg.score * 20) / 10 : 0,
            },
            moviePerformance: moviePerformanceRaw.map((movie) => ({
                ...movie,
                watchCount: Number(movie.watchCount || 0),
                completedCount: Number(movie.completedCount || 0),
                avgCompletion: Number(movie.avgCompletion || 0),
                minutesWatched: Number(movie.minutesWatched || 0),
                userRatingCount: Number(movie.userRatingCount || 0),
                avgUserRating: Number(movie.avgUserRating || 0),
            })),
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        return NextResponse.json({ error: 'Failed to load admin dashboard' }, { status: 500 });
    }
}
