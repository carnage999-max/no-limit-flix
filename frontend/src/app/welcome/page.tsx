'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/context/SessionContext';

const SUBTITLES = [
    'The world of discovery awaits you.',
    'Your next favorite story is closer than ever.',
    'Press play on something unforgettable.',
    'Tonight’s lineup was made for you.',
    'Stories that stay with you are inside.',
    'Queue the magic. It’s all here.',
    'Lights dimmed. Possibilities up.',
    'A cinematic escape is one tap away.',
    'Your vault of wonder is ready.',
    'Find the story that matches your mood.',
    'Curated stories, zero noise.',
    'You’re back. The screen is yours.',
    'Epic nights start with a single frame.',
    'The classics are waiting to be rediscovered.',
    'Settle in. The spotlight is on.',
    'Welcome back to the endless reel.',
    'Something legendary is in your queue.',
    'It’s time to stream with intention.',
    'Your private cinema is live.',
    'Press play on a new obsession.',
    'Every vibe has a story here.',
    'Shadows, sparks, and stories await.',
    'Pick a mood. We’ll handle the rest.',
    'Your next binge begins here.',
    'Film nights just got better.',
    'Discover hidden gems on repeat.',
    'Turn the volume up on discovery.',
    'The vault is open. Explore.',
    'Your curated watchlist is ready.',
    'Dive back into the archive.',
    'An adventure in every genre.',
    'New moods. Same obsession.',
    'Welcome to the cinematic underground.',
    'Your personal film festival starts now.',
    'Find something unforgettable tonight.',
    'Make the night yours.',
    'A story tailored to your vibe.',
    'The reel keeps rolling.',
    'Return to the thrill of discovery.',
    'We saved the best seats for you.',
    'Bring the drama. We’ve got the rest.',
    'Cinema with no limits.',
    'Reignite your watchlist.',
    'All your favorites, ready to stream.',
    'A new chapter begins with one click.',
    'Take a seat. The feature starts now.',
    'Your mood, your movie, your moment.',
    'The night is young and so is the catalog.',
    'A fresh story is calling.',
    'Welcome back to No Limit Flix.',
];

function WelcomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: sessionLoading } = useSession();
    const [mounted, setMounted] = useState(false);

    const subtitle = useMemo(() => {
        return SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)];
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push('/auth');
        }
    }, [user, sessionLoading, router]);

    useEffect(() => {
        if (!user) return;
        const redirect = searchParams.get('redirect') || '/';
        const timer = setTimeout(() => {
            router.push(redirect);
        }, 2200);
        return () => clearTimeout(timer);
    }, [user, router, searchParams]);

    if (!mounted || sessionLoading || !user) return null;

    const displayName = (user.username || user.email || 'Guest').toUpperCase();

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
        }}>
            <div style={{ maxWidth: '720px' }}>
                <h1 style={{
                    fontSize: 'clamp(2.2rem, 6vw, 4rem)',
                    fontWeight: 800,
                    color: '#F3F4F6',
                    letterSpacing: '-0.03em',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    borderRight: '3px solid rgba(212, 175, 55, 0.6)',
                    width: 'fit-content',
                }} className="welcome-type">
                    Welcome back,{' '}
                    <span style={{
                        background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                    }}>
                        {displayName}
                    </span>
                </h1>
                <p style={{
                    fontSize: '1rem',
                    color: '#A7ABB4',
                    marginBottom: '2rem',
                    lineHeight: 1.6,
                }}>
                    {subtitle}
                </p>
                <button
                    type="button"
                    onClick={() => router.push(searchParams.get('redirect') || '/')}
                    style={{
                        padding: '0.8rem 1.6rem',
                        borderRadius: '999px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                        color: '#0B0B0D',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    Enter
                </button>
            </div>
            <style>{`
                .welcome-type {
                    animation: typing 1.1s steps(22, end) forwards, blink 0.7s step-end infinite;
                }
                @keyframes typing {
                    from { width: 0; }
                    to { width: 100%; }
                }
                @keyframes blink {
                    50% { border-color: transparent; }
                }
            `}</style>
        </main>
    );
}

export default function WelcomePage() {
    return (
        <Suspense
            fallback={(
                <main style={{
                    minHeight: '100vh',
                    background: '#0B0B0D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#A7ABB4',
                    padding: '2rem',
                }}>
                    Loading...
                </main>
            )}
        >
            <WelcomeContent />
        </Suspense>
    );
}
