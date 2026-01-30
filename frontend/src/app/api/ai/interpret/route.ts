import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

interface InterpretRequest {
    freeText: string;
}

interface InterpretResponse {
    mood_tags: string[];
    tmdb_genres?: string[];
    keywords?: string[];
    year_range?: [number, number];
    sort_by?: string;
    adjustments: {
        tension_bias?: number;
        pacing_bias?: number;
        intensity_bias?: number;
    };
}

export async function POST(request: NextRequest) {
    let requestBody: InterpretRequest | null = null;

    try {
        const body: InterpretRequest = await request.json();
        requestBody = body;
        const { freeText } = body;

        if (!freeText || freeText.trim().length === 0) {
            return NextResponse.json(
                { error: 'freeText is required' },
                { status: 400 }
            );
        }

        if (!OPENROUTER_API_KEY) {
            // Fallback to basic keyword matching if API key not configured
            return NextResponse.json(getFallbackInterpretation(freeText));
        }

        // Call DeepSeek R1 via OpenRouter to interpret mood
        const interpretation = await interpretMoodWithDeepSeek(freeText);

        return NextResponse.json(interpretation);
    } catch (error: any) {
        console.error('Error in /api/ai/interpret:', error);

        // Fallback on error
        const fallback = getFallbackInterpretation(requestBody?.freeText || '');
        return NextResponse.json(fallback);
    }
}

async function interpretMoodWithDeepSeek(freeText: string): Promise<InterpretResponse> {
    const systemPrompt = `You are a mood interpretation assistant for a movie discovery app.

Your ONLY job is to convert user free-text mood descriptions into structured search parameters for the TMDB API.

OUTPUT FORMAT (JSON ONLY):
{
  "mood_tags": ["List", "of", "UI", "Tags"],
  "tmdb_genres": ["Action", "Comedy", "etc"],
  "keywords": ["specific", "descriptive", "keywords"],
  "year_range": [min_year, max_year] or null,
  "sort_by": "popularity.desc" or "vote_average.desc" or "primary_release_date.desc",
  "adjustments": {
    "tension_bias": 0.0,
    "pacing_bias": 0.0,
    "intensity_bias": 0.0
  }
}

AVAILABLE UI MOOD TAGS (Select 1-3):
- Thrilling, Heartwarming, Mind-bending, Funny, Dark, Uplifting, Intense, Relaxing, Romantic, Epic, Magical, Gritty, Futuristic, Nostalgic, Artistic, Spooky, Mysterious, Action-packed

AVAILABLE TMDB GENRES:
- Action, Adventure, Animation, Comedy, Crime, Documentary, Drama, Family, Fantasy, History, Horror, Music, Mystery, Romance, Sci-Fi, TV Movie, Thriller, War, Western

CRITICAL RULES:
1. "keywords" are CRITICAL. Infer specific subjects (e.g., "vampire", "space", "zombie").
2. "tmdb_genres" should match standard TMDB genres.
3. "year_range": Infer from context.
4. DO NOT output internal 'thinking' or 'reasoning' blocks if possible. Just the JSON.
5. Return ONLY valid JSON.

Example input: "I want a scary 80s movie about aliens"
Example output:
{
  "mood_tags": ["Spooky", "Nostalgic", "Thrilling"],
  "tmdb_genres": ["Horror", "Sci-Fi"],
  "keywords": ["alien", "creature", "space"],
  "year_range": [1980, 1989],
  "sort_by": "vote_average.desc",
  "adjustments": { "tension_bias": 0.8, "intensity_bias": 0.5 }
}`;

    const userPrompt = `Interpret this mood description: "${freeText}"

Return ONLY valid JSON.`;

    const openrouter = new OpenRouter({
        apiKey: OPENROUTER_API_KEY
    });

    const completion = await openrouter.chat.send({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: 1000
    });

    const messageContent = completion.choices?.[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '{}';

    console.log("DeepSeek Raw Content:", content); // Debug logging

    // Parse the JSON response
    let parsed: InterpretResponse;
    try {
        // Remove <think>...</think> blocks if present
        let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // Remove markdown code blocks
        cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '').trim();

        // Find the first '{' and last '}'
        const start = cleanContent.indexOf('{');
        const end = cleanContent.lastIndexOf('}');

        if (start !== -1 && end !== -1) {
            const jsonStr = cleanContent.substring(start, end + 1);
            parsed = JSON.parse(jsonStr);
        } else {
            parsed = JSON.parse(cleanContent);
        }
    } catch (e) {
        console.error("Failed to parse AI response. Content length:", content.length);
        throw new Error('Invalid JSON from OpenRouter DeepSeek');
    }

    // Validate and sanitize the response
    return sanitizeInterpretation(parsed);
}

function sanitizeInterpretation(raw: any): InterpretResponse {
    const validMoodTags = [
        'Thrilling', 'Heartwarming', 'Mind-bending', 'Funny', 'Dark',
        'Uplifting', 'Intense', 'Relaxing', 'Romantic', 'Epic',
        'Magical', 'Gritty', 'Futuristic', 'Nostalgic', 'Artistic',
        'Spooky', 'Mysterious', 'Action-packed'
    ];

    const validTmdbGenres = [
        'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
        'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
        'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi',
        'TV Movie', 'Thriller', 'War', 'Western'
    ];

    // Filter to only valid mood tags
    const mood_tags = (raw.mood_tags || [])
        .filter((tag: string) => validMoodTags.includes(tag))
        .slice(0, 3);

    const tmdb_genres = (raw.tmdb_genres || [])
        .filter((g: string) => validTmdbGenres.includes(g));

    const keywords = (raw.keywords || []).slice(0, 5); // Limit keywords

    let year_range = raw.year_range;
    if (year_range && (!Array.isArray(year_range) || year_range.length !== 2)) {
        year_range = undefined;
    }

    // Clamp adjustments to safe ranges
    const adjustments: InterpretResponse['adjustments'] = {};

    if (raw.adjustments?.tension_bias !== undefined) {
        adjustments.tension_bias = Math.max(-1, Math.min(1, raw.adjustments.tension_bias));
    }
    if (raw.adjustments?.pacing_bias !== undefined) {
        adjustments.pacing_bias = Math.max(-1, Math.min(1, raw.adjustments.pacing_bias));
    }
    if (raw.adjustments?.intensity_bias !== undefined) {
        adjustments.intensity_bias = Math.max(-1, Math.min(1, raw.adjustments.intensity_bias));
    }

    return {
        mood_tags,
        tmdb_genres,
        keywords,
        year_range,
        sort_by: raw.sort_by || 'popularity.desc',
        adjustments
    };
}

function getFallbackInterpretation(freeText: string): InterpretResponse {
    const text = freeText.toLowerCase();
    const mood_tags: string[] = [];
    const tmdb_genres: string[] = [];
    const keywords: string[] = [];
    const adjustments: InterpretResponse['adjustments'] = {};

    // Robust Keyword Matching
    if (text.includes('chill') || text.includes('relax') || text.includes('calm')) {
        mood_tags.push('Relaxing');
        keywords.push('relaxing');
        adjustments.tension_bias = -0.3;
        adjustments.pacing_bias = -0.2;
    }
    if (text.includes('excit') || text.includes('thrill') || text.includes('action') || text.includes('fast')) {
        mood_tags.push('Thrilling');
        tmdb_genres.push('Action');
        adjustments.tension_bias = 0.3;
        adjustments.intensity_bias = 0.2;
    }
    if (text.includes('funny') || text.includes('laugh') || text.includes('comedy') || text.includes('humor')) {
        mood_tags.push('Funny');
        tmdb_genres.push('Comedy');
        adjustments.intensity_bias = -0.1;
    }
    if (text.includes('dark') || text.includes('serious') || text.includes('heavy') || text.includes('grim')) {
        mood_tags.push('Dark');
        tmdb_genres.push('Drama', 'Thriller');
        adjustments.intensity_bias = 0.3;
    }
    if (text.includes('scary') || text.includes('horror') || text.includes('spooky') || text.includes('ghost')) {
        mood_tags.push('Spooky');
        tmdb_genres.push('Horror');
        adjustments.tension_bias = 0.5;
    }
    if (text.includes('romantic') || text.includes('love') || text.includes('heart') || text.includes('date')) {
        mood_tags.push('Romantic');
        tmdb_genres.push('Romance');
    }
    if (text.includes('mind') || text.includes('complex') || text.includes('think') || text.includes('mystery')) {
        mood_tags.push('Mind-bending');
        tmdb_genres.push('Sci-Fi', 'Mystery');
    }
    if (text.includes('family') || text.includes('kid') || text.includes('child')) {
        mood_tags.push('Heartwarming');
        tmdb_genres.push('Family');
    }
    if (text.includes('cartoon') || text.includes('anime') || text.includes('animation')) {
        mood_tags.push('Artistic');
        tmdb_genres.push('Animation');
    }

    // Default if no matches found at all
    if (mood_tags.length === 0) {
        if (text.length > 0) {
            // If they typed something we didn't catch, try to map it to a keyword
            keywords.push(text.split(' ')[0]); // simplistic
        }
        mood_tags.push('Uplifting');
    }

    // Remove duplicates
    const uniqueMoods = [...new Set(mood_tags)];
    const uniqueGenres = [...new Set(tmdb_genres)];

    return {
        mood_tags: uniqueMoods.slice(0, 3),
        tmdb_genres: uniqueGenres.slice(0, 3),
        keywords,
        sort_by: 'popularity.desc',
        adjustments
    };
}
