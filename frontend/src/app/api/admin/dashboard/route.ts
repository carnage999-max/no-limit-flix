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
            moviePerformanceRaw,
        ] = await Promise.all([
            prisma.video.count({ where: { type: 'movie', status: 'completed' } }),
            prisma.user.count(),
            prisma.watchHistory.count(),
            prisma.watchHistory.count({ where: { isCompleted: true } }),
            prisma.watchHistory.aggregate({ _sum: { duration: true } }),
            prisma.$queryRaw<MoviePerformanceRow[]>`
                SELECT
                    v.id AS "videoId",
                    v.title,
                    v.genre,
                    v."releaseYear",
                    COUNT(w.id)::int AS "watchCount",
                    COUNT(w.id) FILTER (WHERE w."isCompleted" = true)::int AS "completedCount",
                    COALESCE(ROUND(AVG(w."completionPercent"))::int, 0) AS "avgCompletion",
                    COALESCE(ROUND(SUM(COALESCE(w.duration, 0)) / 60)::int, 0) AS "minutesWatched"
                FROM "Video" v
                LEFT JOIN "WatchHistory" w ON w."videoId" = v.id
                WHERE v.type = 'movie'
                  AND v.status = 'completed'
                GROUP BY v.id, v.title, v.genre, v."releaseYear"
                ORDER BY COUNT(w.id) DESC, v.title ASC
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
            },
            moviePerformance: moviePerformanceRaw.map((movie) => ({
                ...movie,
                watchCount: Number(movie.watchCount || 0),
                completedCount: Number(movie.completedCount || 0),
                avgCompletion: Number(movie.avgCompletion || 0),
                minutesWatched: Number(movie.minutesWatched || 0),
            })),
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        return NextResponse.json({ error: 'Failed to load admin dashboard' }, { status: 500 });
    }
}
