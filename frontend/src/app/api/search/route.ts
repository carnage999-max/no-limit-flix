import { NextRequest, NextResponse } from 'next/server';
import { searchMovie } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.trim().length < 2) {
            return NextResponse.json(
                { error: 'Query must be at least 2 characters' },
                { status: 400 }
            );
        }

        const data = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`,
            { next: { revalidate: 3600 } }
        );

        if (!data.ok) {
            throw new Error('Failed to search movies');
        }

        const results = await data.json();

        // Return simplified results with just id, title, and year
        const simplifiedResults = results.results.slice(0, 10).map((movie: any) => ({
            id: movie.id.toString(),
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
        }));

        return NextResponse.json(simplifiedResults);
    } catch (error: any) {
        console.error('Error in /api/search:', error);
        return NextResponse.json(
            { error: 'Failed to search movies' },
            { status: 500 }
        );
    }
}
