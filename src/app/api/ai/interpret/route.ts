import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

interface InterpretRequest {
    freeText: string;
}

interface InterpretResponse {
    mood_tags: string[];
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

Your ONLY job is to convert user free-text mood descriptions into:
1. Structured mood tags (from a predefined list)
2. Numerical adjustment hints for content filtering

AVAILABLE MOOD TAGS (use ONLY these):
- Thrilling, Heartwarming, Mind-bending, Funny, Dark, Uplifting, Intense, Relaxing, Romantic, Epic, Magical, Gritty, Futuristic, Nostalgic, Artistic, Spooky, Mysterious, Action-packed

ADJUSTMENT HINTS (range: -1.0 to 1.0):
- tension_bias: negative = less tense, positive = more tense
- pacing_bias: negative = slower, positive = faster
- intensity_bias: negative = lighter, positive = heavier

CRITICAL RULES:
- Return ONLY valid JSON
- Use ONLY the mood tags listed above
- Select 1-3 most relevant tags
- Adjustments should be subtle (-0.3 to 0.3 range typically)
- Do NOT invent movie titles
- Do NOT recommend specific movies
- Do NOT add commentary

Example input: "something chill to unwind after work"
Example output:
{
  "mood_tags": ["Relaxing", "Heartwarming"],
  "adjustments": {
    "tension_bias": -0.3,
    "pacing_bias": -0.2,
    "intensity_bias": -0.2
  }
}`;

    const userPrompt = `Interpret this mood description: "${freeText}"

Return ONLY valid JSON with mood_tags and adjustments.`;

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
        maxTokens: 500
    });

    const messageContent = completion.choices?.[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '{}';

    // Parse the JSON response
    let parsed: InterpretResponse;
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        // If DeepSeek returns malformed JSON, use fallback
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

    // Filter to only valid mood tags
    const mood_tags = (raw.mood_tags || [])
        .filter((tag: string) => validMoodTags.includes(tag))
        .slice(0, 3); // Max 3 tags

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

    return { mood_tags, adjustments };
}

function getFallbackInterpretation(freeText: string): InterpretResponse {
    const text = freeText.toLowerCase();
    const mood_tags: string[] = [];
    const adjustments: InterpretResponse['adjustments'] = {};

    // Simple keyword matching as fallback
    if (text.includes('chill') || text.includes('relax') || text.includes('calm')) {
        mood_tags.push('Relaxing');
        adjustments.tension_bias = -0.3;
        adjustments.pacing_bias = -0.2;
    }
    if (text.includes('excit') || text.includes('thrill') || text.includes('action')) {
        mood_tags.push('Thrilling');
        adjustments.tension_bias = 0.3;
        adjustments.intensity_bias = 0.2;
    }
    if (text.includes('funny') || text.includes('laugh') || text.includes('comedy')) {
        mood_tags.push('Funny');
        adjustments.intensity_bias = -0.1;
    }
    if (text.includes('dark') || text.includes('serious') || text.includes('heavy')) {
        mood_tags.push('Dark');
        adjustments.intensity_bias = 0.3;
    }
    if (text.includes('romantic') || text.includes('love') || text.includes('heart')) {
        mood_tags.push('Romantic');
    }
    if (text.includes('mind') || text.includes('complex') || text.includes('think')) {
        mood_tags.push('Mind-bending');
    }

    // Default if no matches
    if (mood_tags.length === 0) {
        mood_tags.push('Uplifting');
    }

    return {
        mood_tags: mood_tags.slice(0, 3),
        adjustments
    };
}
