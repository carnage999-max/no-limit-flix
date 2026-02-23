'use client';

import Link from 'next/link';
import { ButtonPrimary } from '@/components';

export default function NotFound() {
    return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', background: '#0B0B0D' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
                {/* 404 Display */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1
                        style={{
                            fontSize: 'clamp(3rem, 15vw, 8rem)',
                            fontWeight: '900',
                            lineHeight: '1',
                            background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '1rem',
                        }}
                    >
                        404
                    </h1>
                    <p
                        style={{
                            fontSize: 'clamp(1.25rem, 4vw, 2rem)',
                            fontWeight: '700',
                            color: '#F3F4F6',
                            marginBottom: '1rem',
                        }}
                    >
                        Page Not Found
                    </p>
                    <p
                        style={{
                            fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                            color: '#A7ABB4',
                            marginBottom: '2rem',
                            lineHeight: '1.6',
                        }}
                    >
                        Oops! We couldn't find the page you're looking for. It might have been removed, renamed, or doesn't exist.
                    </p>
                </div>

                {/* Action Buttons */}
                <div
                    style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <Link href="/">
                        <ButtonPrimary>Back to Home</ButtonPrimary>
                    </Link>
                    <Link href="/series">
                        <div
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: '0.5rem',
                                background: 'transparent',
                                border: '1px solid #A7ABB4',
                                color: '#F3F4F6',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                e.currentTarget.style.borderColor = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = '#A7ABB4';
                            }}
                        >
                            Browse Series
                        </div>
                    </Link>
                </div>

                {/* Decorative Element */}
                <div
                    style={{
                        marginTop: '3rem',
                        paddingTop: '2rem',
                        borderTop: '1px solid rgba(167, 171, 180, 0.1)',
                        color: '#A7ABB4',
                        fontSize: '0.9rem',
                    }}
                >
                    <p>If you believe this is an error, please contact support.</p>
                </div>
            </div>
        </main>
    );
}
