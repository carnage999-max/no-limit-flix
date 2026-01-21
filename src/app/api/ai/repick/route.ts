import { NextRequest, NextResponse } from 'next/server';
import type { RepickRequest, RepickResponse, MoviePick } from '@/types';

// Same mock database as pick endpoint
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
    {
        id: '6',
        title: 'Spirited Away',
        year: 2001,
        runtime: 125,
        poster: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg',
        permanenceBadge: 'Permanent Core',
        explanation: 'A magical and enchanting animated masterpiece that transports you to another world. Perfect for when you want something relaxing, heartwarming, and visually stunning.',
        trailerUrl: 'https://www.youtube.com/watch?v=ByXuk9QqQkk',
        watchProviders: [
            {
                name: 'HBO Max',
                logoUrl: 'https://image.tmdb.org/t/p/original/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg',
                link: 'https://www.hbomax.com',
            },
        ],
    },
];

// Feedback-based filtering
function filterByFeedback(feedback: string[]): MoviePick[] {
    const feedbackRules: Record<string, (movie: MoviePick) => boolean> = {
        'Too slow': (m) => m.runtime < 120,
        'Too dark': (m) => m.explanation.toLowerCase().includes('uplifting') || m.explanation.toLowerCase().includes('heartwarming'),
        'Seen it': () => true, // Just return different movies
        'Not intense enough': (m) => m.explanation.toLowerCase().includes('intense') || m.explanation.toLowerCase().includes('action'),
        'Try something lighter': (m) => m.explanation.toLowerCase().includes('uplifting') || m.explanation.toLowerCase().includes('whimsical'),
    };

    let filtered = [...MOCK_MOVIES];

    feedback.forEach(fb => {
        const rule = feedbackRules[fb];
        if (rule) {
            filtered = filtered.filter(rule);
        }
    });

    // Randomize to provide variety
    return filtered.sort(() => Math.random() - 0.5);
}

export async function POST(request: NextRequest) {
    try {
        const body: RepickRequest = await request.json();
        const { feedback = [] } = body;

        // Filter movies based on feedback
        const movies = filterByFeedback(feedback);

        const response: RepickResponse = {
            hero: movies[0] || MOCK_MOVIES[0],
            alternates: movies.slice(1, 5),
            explanationTokens: feedback,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in /api/ai/repick:', error);
        return NextResponse.json(
            { error: 'Failed to generate new picks' },
            { status: 500 }
        );
    }
}
