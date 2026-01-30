import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails } from '@/lib/tmdb';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
