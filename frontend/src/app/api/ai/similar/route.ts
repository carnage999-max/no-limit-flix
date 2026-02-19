import { NextRequest, NextResponse } from 'next/server';
import { searchMovie, getMovieDetails, searchMoviesByMood } from '@/lib/tmdb';
import type { SimilarRequest, SimilarResponse, MoviePick } from '@/types';
import { enrichMoviesWithPlayable } from '@/lib/library';
import { OpenRouter } from '@openrouter/sdk';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(request: NextRequest) {
    try {
        const body: SimilarRequest = await request.json();
        const { referenceTitle, moodTags = [] } = body;

        if (!referenceTitle) {
            return NextResponse.json({ error: 'Reference title is required' }, { status: 400 });
        }

        // 1. Find the reference movie
        const refMovie = await searchMovie(referenceTitle);
        if (!refMovie) {
            return NextResponse.json({ error: 'Reference movie not found' }, { status: 404 });
        }

        // 2. Get Full Details
        const refDetails = await getMovieDetails(refMovie.id);

        let aiParams: any = {};
        let adjustedMoods: string[] = [...moodTags];

        if (OPENROUTER_API_KEY) {
            try {
                // 3. AI Fingerprinting
                const fingerprint = await generateFingerprint(refDetails, moodTags);
                if (fingerprint) {
                    aiParams = {
                        tmdb_genres: fingerprint.tmdb_genres,
                        keywords: fingerprint.keywords,
                        sort_by: fingerprint.sort_by,
                        year_range: fingerprint.year_range
                    };
                    if (fingerprint.mood_tags) adjustedMoods = fingerprint.mood_tags;
                }
            } catch (e) {
                console.error("AI Fingerprint failed", e);
            }
        }

        // 4. Search with derived params
        const { movies, tags } = await searchMoviesByMood(adjustedMoods, aiParams);

        // Filter out the reference movie itself
        const filteredMovies = movies.filter(m => m.id !== refDetails.id);

        if (filteredMovies.length === 0) {
            return NextResponse.json({ error: 'No similar movies found' }, { status: 404 });
        }

        const sessionId = `session_similar_${Date.now()}`;

        // 5. Enrichment Logic
        const allPicks = [filteredMovies[0], ...filteredMovies.slice(1, 10)];
        const enrichedPicks = await enrichMoviesWithPlayable(allPicks as MoviePick[]);

        const response: SimilarResponse = {
            sessionId,
            hero: enrichedPicks[0],
            alternates: enrichedPicks.slice(1),
            explanationTokens: tags,
            confidenceScore: 0.85,
            inferredParams: {
                tmdb_genres: aiParams.tmdb_genres,
                keywords: aiParams.keywords,
                year_range: aiParams.year_range,
                sort_by: aiParams.sort_by
            }
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('Error in /api/ai/similar:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function generateFingerprint(movie: any, userMoods: string[]) {
    const systemPrompt = `You are an expert film analyst. 
Your task: Create a "Content Fingerprint" for a reference movie and generate TMDB search parameters to find SIMILAR movies that match its vibe.

REFERENCE MOVIE: "${movie.title}" (${movie.year})
GENRES: ${movie.genres.join(', ')}
PLOT: ${movie.explanation.slice(0, 300)}...
USER REQUESTED EXTRA MOODS: ${userMoods.join(', ')}

INSTRUCTIONS:
1. Analyze the reference movie's specific sub-genre, tone, pacing, and emotional impact.
2. If User Moods are present, SKEW the results towards those moods.
3. Generate specific TMDB Genres and Keywords.
4. DO NOT return Thinking blocks. ONLY JSON.

OUTPUT FORMAT:
{
  "mood_tags": ["Vibe1", "Vibe2"],
  "tmdb_genres": ["Action", "Thriller"],
  "keywords": ["specific", "keywords"],
  "year_range": [min, max],
  "sort_by": "popularity.desc"
}`;

    const openrouter = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
    const completion = await openrouter.chat.send({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [{ role: 'system', content: systemPrompt }],
        maxTokens: 1000
    });

    const messageContent = completion.choices?.[0]?.message?.content;
    let jsonStr = '{}';
    if (typeof messageContent === 'string') {
        jsonStr = messageContent;
    }

    try {
        let clean = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        clean = clean.replace(/```json\n?|\n?```/g, '').trim();
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1) return JSON.parse(clean.substring(start, end + 1));
    } catch (e) { }
    return null;
}
