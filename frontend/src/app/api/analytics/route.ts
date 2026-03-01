import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        const userId = sessionUser?.id || null;

        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type') || 'watch_stats'; // watch_stats, top_movies, user_activity

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        if (sessionUser?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        if (type === 'watch_stats') {
            const [totalWatched, completedWatches, durationAggregate, topGenresRaw] = await Promise.all([
                prisma.watchHistory.count(),
                prisma.watchHistory.count({ where: { isCompleted: true } }),
                prisma.watchHistory.aggregate({ _sum: { duration: true } }),
                prisma.$queryRaw`
                    SELECT v.genre, COUNT(*)::int AS count
                    FROM "WatchHistory" w
                    JOIN "Video" v ON v.id = w."videoId"
                    WHERE v.genre IS NOT NULL
                    GROUP BY v.genre
                    ORDER BY COUNT(*) DESC
                    LIMIT 5
                `
            ]);

            const totalMinutesWatched = Math.round(((durationAggregate?._sum?.duration || 0) / 60));
            const topGenres = Array.isArray(topGenresRaw)
                ? topGenresRaw.map((row: any) => ({ genre: row.genre, count: Number(row.count) }))
                : [];

            return NextResponse.json({
                totalWatched,
                completedWatches,
                totalMinutesWatched,
                completionRate: totalWatched > 0 ? Math.round((completedWatches / totalWatched) * 100) : 0,
                topGenres
            });
        } else if (type === 'top_movies') {
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '10');
            const skip = (page - 1) * limit;

            const topMovieCounts = await prisma.watchHistory.groupBy({
                by: ['videoId'],
                _count: { videoId: true },
                orderBy: { _count: { videoId: 'desc' } },
                skip,
                take: limit
            });

            const ids = topMovieCounts.map((row) => row.videoId);
            const videos = await prisma.video.findMany({
                where: { id: { in: ids } },
                select: { id: true, title: true, thumbnailUrl: true, genre: true }
            });
            const videoMap = new Map(videos.map((video) => [video.id, video]));

            const moviesWithDetails = topMovieCounts.map((row) => {
                const video = videoMap.get(row.videoId);
                return {
                    videoId: row.videoId,
                    title: video?.title || 'Untitled',
                    thumbnailUrl: video?.thumbnailUrl || null,
                    watchCount: row._count.videoId,
                    genre: video?.genre || null
                };
            });

            return NextResponse.json({
                topMovies: moviesWithDetails
            });
        } else if (type === 'user_activity') {
            const rangeDays = 14;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (rangeDays - 1));
            startDate.setHours(0, 0, 0, 0);

            const activityRaw = await prisma.$queryRaw`
                SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS watches
                FROM "WatchHistory"
                WHERE "createdAt" >= ${startDate}
                GROUP BY day
                ORDER BY day ASC
            `;

            const activityMap = new Map<string, number>();
            if (Array.isArray(activityRaw)) {
                activityRaw.forEach((row: any) => {
                    const key = new Date(row.day).toISOString().slice(0, 10);
                    activityMap.set(key, Number(row.watches));
                });
            }

            const activityData = Array.from({ length: rangeDays }).map((_, idx) => {
                const day = new Date(startDate);
                day.setDate(startDate.getDate() + idx);
                const key = day.toISOString().slice(0, 10);
                return {
                    date: key,
                    watches: activityMap.get(key) || 0
                };
            });

            return NextResponse.json({ activityData });
        }

        return NextResponse.json(
            { error: 'Invalid type' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
