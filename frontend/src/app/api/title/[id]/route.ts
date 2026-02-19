import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails } from '@/lib/tmdb';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Safety: If it's not a numeric string, it's not a TMDb ID.
        if (!/^\d+$/.test(id)) {
            return NextResponse.json(
                { error: 'Invalid TMDb ID format' },
                { status: 400 }
            );
        }

        const movie = await getMovieDetails(id);

        if (!movie) {
            return NextResponse.json(
                { error: 'Movie not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(movie);
    } catch (error: any) {
        console.error('Error fetching movie details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch title details' },
            { status: 500 }
        );
    }
}
