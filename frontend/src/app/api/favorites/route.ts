import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { userId, videoId, action, title, poster } = await request.json();

        if (!userId || !videoId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (action === 'add') {
            const favorite = await prisma.favorite.upsert({
                where: {
                    userFavoriteUnique: {
                        userId,
                        videoId
                    }
                },
                create: {
                    userId,
                    videoId,
                    videoTitle: title || 'Unknown',
                    videoPoster: poster
                },
                update: {} // If already exists, do nothing
            });

            return NextResponse.json({ success: true, favorite });
        } else if (action === 'remove') {
            await prisma.favorite.deleteMany({
                where: {
                    userId,
                    videoId
                }
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Favorite error:', error);
        return NextResponse.json(
            { error: 'Failed to manage favorites' },
            { status: 500 }
        );
    }
}

// Get user's favorites
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing userId' },
                { status: 400 }
            );
        }

        const skip = (page - 1) * limit;

        const [favorites, total] = await Promise.all([
            prisma.favorite.findMany({
                where: { userId },
                orderBy: { addedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    video: true
                }
            }),
            prisma.favorite.count({ where: { userId } })
        ]);

        return NextResponse.json({
            favorites,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Favorites fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch favorites' },
            { status: 500 }
        );
    }
}
