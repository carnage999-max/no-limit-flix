'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ShellPage, ShellPageHeader } from '@/components';

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
        <ShellPage width="wide">
            <ShellPageHeader
                eyebrow="Collections"
                title="Curated Collections"
                subtitle="Stable, thoughtfully curated shelves that keep the permanent-library feel front and center."
            />

            <section className="glass-panel utility-panel">
                <div className="catalog-grid">
                    {COLLECTIONS.map((collection) => (
                        <Link key={collection.slug} href={`/collection/${collection.slug}`} className="catalog-card">
                            <div className="catalog-card__accent" style={{ background: collection.accentColor }} />
                            <h2>{collection.title}</h2>
                            <p>{collection.description}</p>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                {collection.count} films
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </ShellPage>
    );
}
