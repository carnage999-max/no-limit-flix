import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

// Helper to convert BigInt to string for JSON serialization
function serializeData(data: any): any {
    if (data === null || data === undefined) return data;
    
    if (typeof data === 'bigint') {
        return data.toString();
    }
    
    if (data instanceof Date) {
        return data.toISOString();
    }
    
    if (Array.isArray(data)) {
        return data.map(serializeData);
    }
    
    if (typeof data === 'object') {
        const serialized: any = {};
        for (const [key, value] of Object.entries(data)) {
            serialized[key] = serializeData(value);
        }
        return serialized;
    }
    
    return data;
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        // Handle both Promise and direct params (for Next.js version compatibility)
        const resolvedParams = params instanceof Promise ? await params : params;
        const { id } = resolvedParams;

        if (!id) {
            console.error('Missing video ID in request');
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const {
            title,
            description,
            releaseYear,
            tmdbId,
            thumbnailUrl,
            genre,
            rating,
            sourceProvider,
            sourcePageUrl,
            sourceRights,
            sourceLicenseUrl,
        } = body;

        if (!title) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const video = await prisma.video.findUnique({
            where: { id },
        });

        if (!video) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        const updated = await prisma.video.update({
            where: { id },
            data: {
                title,
                description: typeof description === 'string' ? description : null,
                releaseYear: releaseYear ? Number(releaseYear) : null,
                tmdbId: typeof tmdbId === 'string' && tmdbId.trim() ? tmdbId.trim() : null,
                thumbnailUrl: typeof thumbnailUrl === 'string' && thumbnailUrl.trim() ? thumbnailUrl.trim() : null,
                genre: typeof genre === 'string' && genre.trim() ? genre.trim() : null,
                rating: typeof rating === 'string' && rating.trim() ? rating.trim() : null,
                sourceProvider: typeof sourceProvider === 'string' && sourceProvider.trim() ? sourceProvider.trim() : null,
                sourcePageUrl: typeof sourcePageUrl === 'string' && sourcePageUrl.trim() ? sourcePageUrl.trim() : null,
                sourceRights: typeof sourceRights === 'string' && sourceRights.trim() ? sourceRights.trim() : null,
                sourceLicenseUrl: typeof sourceLicenseUrl === 'string' && sourceLicenseUrl.trim() ? sourceLicenseUrl.trim() : null,
                updatedAt: new Date(),
            },
        });

        // Serialize the response to handle BigInt values
        const serialized = serializeData(updated);
        return NextResponse.json({ video: serialized });
    } catch (error) {
        console.error('Error updating video:', error);
        return NextResponse.json(
            { error: 'Failed to update video', details: (error as Error).message },
            { status: 500 }
        );
    }
}
