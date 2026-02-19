import { NextRequest, NextResponse } from 'next/server';
import { searchMoviesByMood } from '@/lib/tmdb';
import type { RepickRequest, RepickResponse, MoviePick } from '@/types';
import { enrichMoviesWithPlayable } from '@/lib/library';
import { OpenRouter } from '@openrouter/sdk';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(request: NextRequest) {
    let body: RepickRequest | null = null;
    try {
        body = await request.json();
        const { feedback = [], currentSearchParams } = body!;
        const feedbackText = feedback.join(', ');

        let newSearchParams = currentSearchParams || {};
        let newMoods: string[] = ['Thrilling']; // Default

        if (OPENROUTER_API_KEY) {
            try {
                // AI Interpretation of Feedback
                const interpretation = await interpretFeedbackWithDeepSeek(feedbackText, currentSearchParams);
                if (interpretation) {
                    newSearchParams = {
                        ...newSearchParams, // base
                        ...interpretation // override
                    };
                    // Use inferred moods if available, otherwise keep generic
                    if (interpretation.mood_tags) {
                        newMoods = interpretation.mood_tags;
                        delete (interpretation as any).mood_tags;
                    }
                }
            } catch (e) {
                console.error("AI Repick failed, using fallback", e);
                newMoods = getFallbackMoods(feedbackText);
            }
        } else {
            newMoods = getFallbackMoods(feedbackText);
        }

        // Re-search using TMDb
        const { movies, tags } = await searchMoviesByMood(newMoods, newSearchParams);

        if (movies.length === 0) {
            return NextResponse.json(
                { error: 'No movies found' },
                { status: 404 }
            );
        }

        // Enrichment Logic
        const allPicks = [movies[0], ...movies.slice(1, 10)];
        const enrichedPicks = await enrichMoviesWithPlayable(allPicks as MoviePick[]);

        const response: RepickResponse = {
            hero: enrichedPicks[0] as MoviePick,
            alternates: enrichedPicks.slice(1) as MoviePick[],
            explanationTokens: [...feedback, ...tags.filter(t => !feedback.includes(t))],
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error in /api/ai/repick:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate new picks' },
            { status: 500 }
        );
    }
}

function getFallbackMoods(feedbackText: string): string[] {
    const feedbackToMoods: Record<string, string> = {
        'Too slow': 'Intense',
        'Too dark': 'Uplifting',
        'Seen it': 'Epic',
        'Not intense enough': 'Intense',
        'Try something lighter': 'Funny',
    };
    return [feedbackToMoods[feedbackText] || 'Thrilling'];
}

async function interpretFeedbackWithDeepSeek(feedback: string, currentParams: any) {
    const systemPrompt = `You are a movie recommendation adjustment assistant.
Your job is to modify TMDB search parameters based on user feedback.

CURRENT PARAMS: ${JSON.stringify(currentParams || {})}

USER FEEDBACK: "${feedback}"

INSTRUCTIONS:
1. Return a JSON object with the adjusted parameters.
2. YOU MUST NOT return Thinking blocks. ONLY JSON.

OUTPUT FORMAT:
{
    "mood_tags": ["New", "Moods"],
    "tmdb_genres": ["Updated", "Genres"],
    "keywords": ["Updated", "Keywords"],
    "year_range": [min, max],
    "sort_by": "..."
}`;

    const openrouter = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
    const completion = await openrouter.chat.send({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [{ role: 'system', content: systemPrompt }],
        maxTokens: 1000
    });

    const messageContent = completion.choices?.[0]?.message?.content;
    let content = typeof messageContent === 'string' ? messageContent : '{}';

    try {
        let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '').trim();
        const start = cleanContent.indexOf('{');
        const end = cleanContent.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            return JSON.parse(cleanContent.substring(start, end + 1));
        }
    } catch (e) { }
    return null;
}
