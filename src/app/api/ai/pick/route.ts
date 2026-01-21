import { NextRequest, NextResponse } from 'next/server';
import type { AIPickRequest, AIPickResponse, MoviePick } from '@/types';

// Mock movie database - In production, this would call TMDb API
const MOCK_MOVIES: MoviePick[] = [
    {
        id: '1',
        title: 'Inception',
        year: 2010,
        runtime: 148,
        poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
        permanenceBadge: 'Permanent Core',
        explanation: 'A mind-bending thriller that matches your desire for something intense and thought-provoking. The layered narrative and stunning visuals create an immersive experience perfect for focused viewing.',
        trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
        watchProviders: [
            {
                name: 'Netflix',
                logoUrl: 'https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
                link: 'https://www.netflix.com',
            },
        ],
    },
    {
        id: '2',
        title: 'The Grand Budapest Hotel',
        year: 2014,
        runtime: 99,
        poster: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/nP6RliHjxsU3pWI6Vl3XzqNgJqr.jpg',
        permanenceBadge: 'Permanent Core',
        explanation: 'A whimsical and visually stunning comedy-drama that balances humor with heart. Perfect for when you want something uplifting yet sophisticated.',
        trailerUrl: 'https://www.youtube.com/watch?v=1Fg5iWmQjwk',
        watchProviders: [
            {
                name: 'Amazon Prime',
                logoUrl: 'https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg',
                link: 'https://www.amazon.com/prime-video',
            },
        ],
    },
    {
        id: '3',
        title: 'Parasite',
        year: 2019,
        runtime: 132,
        poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
        permanenceBadge: 'Long-Term',
        explanation: 'A darkly comedic thriller that keeps you on edge. The perfect blend of social commentary and suspense for viewers seeking something intense and thought-provoking.',
        trailerUrl: 'https://www.youtube.com/watch?v=5xH0HfJHsaY',
        watchProviders: [
            {
                name: 'Hulu',
                logoUrl: 'https://image.tmdb.org/t/p/original/pqUTCleNUiTLAVlelGxUgWn1ELh.jpg',
                link: 'https://www.hulu.com',
            },
        ],
    },
    {
        id: '4',
        title: 'Amélie',
        year: 2001,
        runtime: 122,
        poster: 'https://image.tmdb.org/t/p/w500/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/5l0RjZXuZGkJnOZqNhPdMNfCbmH.jpg',
        permanenceBadge: 'Permanent Core',
        explanation: 'A heartwarming and whimsical French film that radiates joy. Perfect for when you need something uplifting and romantic with a unique visual style.',
        trailerUrl: 'https://www.youtube.com/watch?v=HUECWi5pX7o',
        watchProviders: [
            {
                name: 'Netflix',
                logoUrl: 'https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
                link: 'https://www.netflix.com',
            },
        ],
    },
    {
        id: '5',
        title: 'Mad Max: Fury Road',
        year: 2015,
        runtime: 120,
        poster: 'https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/tbhdm8UJAb4ViCTsulYFL3lxMCd.jpg',
        permanenceBadge: 'Permanent Core',
        explanation: 'An adrenaline-fueled action epic with stunning visuals and relentless pacing. Perfect for when you want something intense, thrilling, and epic.',
        trailerUrl: 'https://www.youtube.com/watch?v=hEJnMQG9ev8',
        watchProviders: [
            {
                name: 'HBO Max',
                logoUrl: 'https://image.tmdb.org/t/p/original/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg',
                link: 'https://www.hbomax.com',
            },
        ],
    },
];

// Simple mood-based matching algorithm
function matchMoviesByMood(moods: string[], freeText: string): MoviePick[] {
    const moodKeywords: Record<string, string[]> = {
        'Thrilling': ['intense', 'thriller', 'suspense', 'action'],
        'Heartwarming': ['uplifting', 'romantic', 'joy', 'heartwarming'],
        'Mind-bending': ['thought-provoking', 'mind-bending', 'complex'],
        'Funny': ['comedy', 'humor', 'whimsical'],
        'Dark': ['dark', 'noir', 'gritty'],
        'Uplifting': ['uplifting', 'joy', 'heartwarming', 'inspiring'],
        'Intense': ['intense', 'adrenaline', 'action', 'thriller'],
        'Relaxing': ['calm', 'peaceful', 'gentle'],
        'Romantic': ['romantic', 'love', 'heartwarming'],
        'Epic': ['epic', 'grand', 'spectacular', 'stunning'],
    };

    // Score each movie based on mood match
    const scoredMovies = MOCK_MOVIES.map(movie => {
        let score = 0;
        const explanation = movie.explanation.toLowerCase();

        moods.forEach(mood => {
            const keywords = moodKeywords[mood] || [];
            keywords.forEach(keyword => {
                if (explanation.includes(keyword)) {
                    score += 2;
                }
            });
        });

        if (freeText) {
            const searchTerms = freeText.toLowerCase().split(' ');
            searchTerms.forEach(term => {
                if (explanation.includes(term) || movie.title.toLowerCase().includes(term)) {
                    score += 3;
                }
            });
        }

        return { movie, score };
    });

    // Sort by score and return
    return scoredMovies
        .sort((a, b) => b.score - a.score)
        .map(item => item.movie);
}

export async function POST(request: NextRequest) {
    try {
        const body: AIPickRequest = await request.json();
        const { moods = [], freeText = '' } = body;

        // Match movies based on moods
        const matchedMovies = matchMoviesByMood(moods, freeText);

        // If no moods selected, randomize
        const movies = moods.length > 0 || freeText
            ? matchedMovies
            : [...MOCK_MOVIES].sort(() => Math.random() - 0.5);

        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response: AIPickResponse = {
            sessionId,
            hero: movies[0],
            alternates: movies.slice(1, 5),
            explanationTokens: moods,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in /api/ai/pick:', error);
        return NextResponse.json(
            { error: 'Failed to generate picks' },
            { status: 500 }
        );
    }
}
