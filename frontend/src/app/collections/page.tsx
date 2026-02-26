'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Collection {
    slug: string;
    title: string;
    description: string;
    count: number;
    accentColor: string;
}

const COLLECTIONS: Collection[] = [
    {
        slug: 'mind-benders',
        title: 'Mind Benders',
        description: 'Films that challenge perception and reality',
        count: 24,
        accentColor: '#8B5CF6',
    },
    {
        slug: 'feel-good-classics',
        title: 'Feel-Good Classics',
        description: 'Timeless films that warm the heart',
        count: 32,
        accentColor: '#F43F5E',
    },
    {
        slug: 'visual-masterpieces',
        title: 'Visual Masterpieces',
        description: 'Stunning cinematography and art direction',
        count: 28,
        accentColor: '#D4AF37',
    },
    {
        slug: 'hidden-gems',
        title: 'Hidden Gems',
        description: 'Underrated films worth discovering',
        count: 45,
        accentColor: '#14B8A6',
    },
    {
        slug: 'adrenaline-rush',
        title: 'Adrenaline Rush',
        description: 'High-octane action and thrills',
        count: 36,
        accentColor: '#3B82F6',
    },
    {
        slug: 'slow-cinema',
        title: 'Slow Cinema',
        description: 'Contemplative and meditative experiences',
        count: 18,
        accentColor: '#A7ABB4',
    },
    {
        slug: 'cult-favorites',
        title: 'Cult Favorites',
        description: 'Films with devoted followings',
        count: 41,
        accentColor: '#8B5CF6',
    },
    {
        slug: 'foreign-language',
        title: 'Foreign Language Excellence',
        description: 'International cinema at its finest',
        count: 52,
        accentColor: '#F43F5E',
    },
    {
        slug: 'directors-vision',
        title: "Director's Vision",
        description: 'Auteur-driven masterworks',
        count: 29,
        accentColor: '#D4AF37',
    },
    {
        slug: 'comfort-watches',
        title: 'Comfort Watches',
        description: 'Films you can return to again and again',
        count: 38,
        accentColor: '#14B8A6',
    },
    {
        slug: 'edge-of-your-seat',
        title: 'Edge of Your Seat',
        description: 'Suspense and tension from start to finish',
        count: 33,
        accentColor: '#3B82F6',
    },
    {
        slug: 'animation-excellence',
        title: 'Animation Excellence',
        description: 'The best in animated storytelling',
        count: 27,
        accentColor: '#F43F5E',
    },
];

export default function CollectionsPage() {
    return (
        <main style={{ minHeight: '100vh', padding: '4rem 2rem' }}>
            <div
                style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                }}
            >
                {/* Header */}
                <div
                    className="animate-slide-up"
                    style={{
                        textAlign: 'center',
                        marginBottom: '4rem',
                    }}
                >
                    <h1
                        style={{
                            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                            fontWeight: '700',
                            lineHeight: '1.1',
                            letterSpacing: '-0.02em',
                            marginBottom: '1rem',
                            background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Curated Collections
                    </h1>
                    <p
                        style={{
                            fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                            color: '#A7ABB4',
                            maxWidth: '700px',
                            margin: '0 auto',
                        }}
                    >
                        Stable, thoughtfully curated collections that never rotate
                    </p>
                </div>

                {/* Collections Grid */}
                <div
                    className="animate-fade-in"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '2rem',
                    }}
                >
                    {COLLECTIONS.map((collection, idx) => (
                        <Link
                            key={collection.slug}
                            href={`/collection/${collection.slug}`}
                            className="animate-slide-up"
                            style={{
                                textDecoration: 'none',
                                display: 'block',
                                padding: '2rem',
                                borderRadius: '1rem',
                                background: 'rgba(167, 171, 180, 0.03)',
                                border: '1px solid rgba(167, 171, 180, 0.1)',
                                transition: 'all 0.3s',
                                animationDelay: `${idx * 0.05}s`,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-8px)';
                                e.currentTarget.style.borderColor = collection.accentColor;
                                e.currentTarget.style.background = `${collection.accentColor}10`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.1)';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.03)';
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: collection.accentColor,
                                    marginBottom: '1.5rem',
                                }}
                            />

                            <h2
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                    color: '#F3F4F6',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                {collection.title}
                            </h2>

                            <p
                                style={{
                                    fontSize: '1rem',
                                    color: '#A7ABB4',
                                    marginBottom: '1rem',
                                    lineHeight: '1.6',
                                }}
                            >
                                {collection.description}
                            </p>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.875rem',
                                        color: '#A7ABB4',
                                    }}
                                >
                                    {collection.count} films
                                </span>
                                <span
                                    style={{
                                        fontSize: '1.25rem',
                                        color: collection.accentColor,
                                    }}
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
