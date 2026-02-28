import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

// Track watch history
export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { videoId, watchedDuration, totalDuration, title, poster } = await request.json();
        const userId = sessionUser.id;

        if (!videoId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Calculate watched percentage
        const completionPercent = totalDuration && watchedDuration ? (watchedDuration / totalDuration) * 100 : 0;
        const isCompleted = completionPercent >= 90;

        // Upsert watch history (update if exists, create if not)
        const watchHistory = await prisma.watchHistory.upsert({
            where: {
                userVideoUnique: {
                    userId,
                    videoId
                }
            },
            create: {
                userId,
                videoId,
                videoTitle: title || 'Unknown',
                videoPoster: poster,
                duration: watchedDuration,
                totalDuration,
                completionPercent,
                isCompleted
            },
            update: {
                duration: watchedDuration,
                totalDuration,
                completionPercent,
                isCompleted,
                watchedAt: new Date()
            }
        });

        // Also log analytics event
        await prisma.analyticsEvent.create({
            data: {
                userId,
                eventType: isCompleted ? 'watch_completed' : 'watch_started',
                videoId,
                videoTitle: title,
                metadata: {
                    watchedPercent,
                    duration,
                    watchedDuration
                }
            }
        });

        return NextResponse.json({ success: true, watchHistory });
    } catch (error) {
        console.error('Watch history error:', error);
        return NextResponse.json(
            { error: 'Failed to track watch history' },
            { status: 500 }
        );
    }
}

// Get watch history for user
export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        const userId = sessionUser?.id || null;
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const skip = (page - 1) * limit;

        const [watchHistory, total] = await Promise.all([
            prisma.watchHistory.findMany({
                where: {
                    userId,
                    title: search ? {
                        contains: search,
                        mode: 'insensitive'
                    } : undefined
                },
                orderBy: { startedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    video: true
                }
            }),
            prisma.watchHistory.count({
                where: {
                    userId,
                    title: search ? {
                        contains: search,
                        mode: 'insensitive'
                    } : undefined
                }
            })
        ]);

        return NextResponse.json({
            watchHistory,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Watch history fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch watch history' },
            { status: 500 }
        );
    }
}
