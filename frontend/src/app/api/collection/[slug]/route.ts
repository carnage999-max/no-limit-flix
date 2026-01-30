import { NextRequest, NextResponse } from 'next/server';
import { getMoviesByCollection } from '@/lib/tmdb';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const movies = await getMoviesByCollection(slug);
        
        if (!movies || movies.length === 0) {
            return NextResponse.json(
                { error: 'Collection not found or empty' },
                { status: 404 }
            );
        }

        return NextResponse.json(movies);
    } catch (error: any) {
        console.error('Error fetching collection movies:', error);
        return NextResponse.json(
            { error: 'Failed to fetch collection' },
            { status: 500 }
        );
    }
}
