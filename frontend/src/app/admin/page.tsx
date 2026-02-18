'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { ButtonPrimary } from '@/components';

function AdminLoginContent() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/admin/upload';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push(redirectTo);
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || 'Invalid credentials');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] max-w-2xl mx-auto px-6 text-center animate-fade-in">
            <div className="space-y-12 w-full">
                {/* Cinema Visual */}
                <div className="relative inline-block group">
                    <div className="w-24 h-24 rounded-[2rem] border-2 border-white/10 flex items-center justify-center relative z-10 bg-white/[0.02] backdrop-blur-3xl shadow-2xl transition-transform group-hover:rotate-12 duration-700">
                        <ShieldCheck className="w-10 h-10 text-gold-mid" />
                    </div>
                    <div className="absolute inset-0 bg-gold-mid/10 blur-[60px] rounded-full scale-150 animate-pulse" />
                    <div className="absolute -top-4 -right-4 text-gold-mid/40 animate-bounce">
                        <Sparkles className="w-6 h-6" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-display gold-gradient-text uppercase leading-none tracking-tighter">
                        Secure Uplink
                    </h1>
                    <p className="text-subheading text-white/40 italic max-w-sm mx-auto font-medium tracking-wide">
                        Validated clearance is required for library management.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="w-full max-w-md mx-auto space-y-10">
                    <div className="space-y-6 group">
                        <label className="text-[10px] uppercase tracking-[0.6em] font-black text-silver/30 group-focus-within:text-gold-mid transition-colors">
                            Validation Phrase
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Security Key"
                                style={{
                                    width: '100%',
                                    padding: '1.25rem 1.5rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: error ? '1px solid #F43F5E' : '1px solid rgba(167, 171, 180, 0.2)',
                                    borderRadius: '9999px',
                                    fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                                    color: '#F3F4F6',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    backdropFilter: 'blur(10px)',
                                    textAlign: 'center',
                                    letterSpacing: password ? '0.5em' : 'normal'
                                }}
                                onFocus={(e) => {
                                    if (!error) {
                                        e.currentTarget.style.borderColor = '#D4AF37';
                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                        e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                                    }
                                }}
                                onBlur={(e) => {
                                    if (!error) {
                                        e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                                required
                                autoFocus
                            />
                            {password && !loading && (
                                <button
                                    type="submit"
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#D4AF37',
                                        cursor: 'pointer',
                                        padding: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-500 font-black uppercase tracking-[0.1em] text-[10px] animate-shake bg-red-500/5 py-3 px-4 rounded-full border border-red-500/10">
                            <AlertCircle className="w-4 h-4" />
                            <span className="truncate">{error}</span>
                        </div>
                    )}

                    <div className="pt-8 sm:pt-16">
                        <ButtonPrimary
                            type="submit"
                            disabled={loading || !password}
                            fullWidth
                            className={`sm:min-w-[320px] sm:w-auto ${loading ? 'opacity-50' : 'shadow-[0_25px_60px_-15px_rgba(212,175,55,0.4)]'}`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-xs sm:text-base">Synchronizing...</span>
                                </span>
                            ) : 'Initialize Access'}
                        </ButtonPrimary>
                    </div>
                </form>

                <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.5em] sm:tracking-[0.8em] text-white/10 font-black px-4">
                    End-to-End Encryption Enabled
                </p>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[75vh] max-w-2xl mx-auto px-6 text-center">
                <Loader2 className="w-12 h-12 text-gold-mid animate-spin" />
            </div>
        }>
            <AdminLoginContent />
        </Suspense>
    );
}
