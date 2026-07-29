'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { RatingSummary } from '@/types';
import { useSession } from '@/context/SessionContext';
import { useToast } from './Toast';

type UserRatingPanelProps = {
    videoId?: string | null;
    initialSummary?: RatingSummary | null;
    fallbackScore?: number | null;
};

const scoreLabel = (score?: number | null) => (
    Number.isFinite(Number(score)) ? `${Number(score).toFixed(1)}/10` : 'No data'
);

export default function UserRatingPanel({ videoId, initialSummary, fallbackScore }: UserRatingPanelProps) {
    const { user } = useSession();
    const { showToast } = useToast();
    const [summary, setSummary] = useState<RatingSummary | null>(initialSummary || null);
    const [selectedScore, setSelectedScore] = useState<number>(initialSummary?.userRating?.score || 0);
    const [feedback, setFeedback] = useState(initialSummary?.userRating?.feedback || '');
    const [hoveredScore, setHoveredScore] = useState(0);
    const [loading, setLoading] = useState(Boolean(videoId));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSummary(initialSummary || null);
        setSelectedScore(initialSummary?.userRating?.score || 0);
        setFeedback(initialSummary?.userRating?.feedback || '');
    }, [initialSummary]);

    useEffect(() => {
        if (!videoId) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        async function loadRating() {
            try {
                setLoading(true);
                const response = await fetch(`/api/ratings/${videoId}`, { cache: 'no-store' });
                if (!response.ok) return;
                const data = await response.json();
                if (cancelled) return;
                setSummary(data.rating || null);
                setSelectedScore(data.rating?.userRating?.score || 0);
                setFeedback(data.rating?.userRating?.feedback || '');
            } catch (error) {
                console.error('Failed to load rating:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadRating();
        return () => {
            cancelled = true;
        };
    }, [videoId]);

    const displayScore = useMemo(() => {
        const value = summary?.finalScore ?? fallbackScore;
        return Number.isFinite(Number(value)) ? Number(value) : null;
    }, [summary, fallbackScore]);

    if (!videoId) return null;

    const submitRating = async () => {
        if (!user) {
            showToast('Please log in to rate this title', 'info');
            return;
        }
        if (!selectedScore) {
            showToast('Choose a star rating first', 'info');
            return;
        }

        try {
            setSaving(true);
            const response = await fetch(`/api/ratings/${videoId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: selectedScore, feedback }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to save rating');
            }
            setSummary(data.rating || null);
            showToast('Rating saved', 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to save rating', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section
            style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                background: 'rgba(167, 171, 180, 0.05)',
                border: '1px solid rgba(167, 171, 180, 0.12)',
                marginBottom: '2rem',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                }}
            >
                <div>
                    <div style={{ fontSize: '0.75rem', color: '#A7ABB4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
                        Audience rating
                    </div>
                    <div style={{ color: '#F6D365', fontSize: '1.65rem', fontWeight: 800, marginTop: '0.2rem' }}>
                        {displayScore ? `${displayScore.toFixed(1)}/10` : loading ? 'Loading' : 'No rating yet'}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(84px, 1fr))', gap: '0.5rem', flex: '1 1 320px', maxWidth: '420px' }}>
                    {[
                        ['External', summary?.external],
                        ['Users', summary?.internal],
                        ['Engagement', summary?.engagement],
                    ].map(([label, data]) => {
                        const breakdown = data as RatingSummary['external'] | undefined;
                        return (
                            <div
                                key={label as string}
                                style={{
                                    minWidth: 0,
                                    padding: '0.65rem',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(11, 11, 13, 0.45)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                            >
                                <div style={{ color: '#A7ABB4', fontSize: '0.7rem', fontWeight: 700 }}>{label as string}</div>
                                <div style={{ color: '#F3F4F6', fontWeight: 800, fontSize: '0.9rem', marginTop: '0.15rem' }}>
                                    {scoreLabel(breakdown?.score)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map((score) => {
                        const active = score <= (hoveredScore || selectedScore);
                        return (
                            <button
                                key={score}
                                type="button"
                                onClick={() => setSelectedScore(score)}
                                onMouseEnter={() => setHoveredScore(score)}
                                onMouseLeave={() => setHoveredScore(0)}
                                aria-label={`Rate ${score} out of 5 stars`}
                                style={{
                                    width: '2.25rem',
                                    height: '2.25rem',
                                    borderRadius: '0.5rem',
                                    border: active ? '1px solid rgba(246, 211, 101, 0.65)' : '1px solid rgba(167, 171, 180, 0.18)',
                                    background: active ? 'rgba(212, 175, 55, 0.14)' : 'rgba(11, 11, 13, 0.35)',
                                    color: '#F6D365',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <Star size={19} fill={active ? '#F6D365' : 'none'} color="#F6D365" />
                            </button>
                        );
                    })}
                    <span style={{ color: '#A7ABB4', fontSize: '0.82rem', fontWeight: 600 }}>
                        {selectedScore ? `${selectedScore}/5` : 'Select a rating'}
                    </span>
                </div>

                <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Optional feedback"
                    maxLength={1200}
                    style={{
                        width: '100%',
                        minHeight: '5.5rem',
                        resize: 'vertical',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(167, 171, 180, 0.16)',
                        background: 'rgba(11, 11, 13, 0.45)',
                        color: '#F3F4F6',
                        padding: '0.8rem 0.9rem',
                        outline: 'none',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#8C9099', fontSize: '0.78rem' }}>
                        Watched ratings carry more weight.
                    </span>
                    <button
                        type="button"
                        onClick={submitRating}
                        disabled={saving || !selectedScore}
                        style={{
                            border: 'none',
                            borderRadius: '0.5rem',
                            background: selectedScore ? '#D4AF37' : 'rgba(167, 171, 180, 0.2)',
                            color: selectedScore ? '#0B0B0D' : '#8C9099',
                            fontWeight: 800,
                            padding: '0.7rem 1rem',
                            cursor: saving || !selectedScore ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {saving ? 'Saving' : 'Save rating'}
                    </button>
                </div>
            </div>
        </section>
    );
}
