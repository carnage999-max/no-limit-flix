'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

declare global {
    interface Window {
        google?: any;
    }
}

function AuthContent() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: sessionLoading, refresh } = useSession();
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const googleButtonRef = useRef<HTMLDivElement | null>(null);

    // Redirect if already authenticated (require both user + userId)
    useEffect(() => {
        if (sessionLoading) return;
        if (user) {
            const redirectUrl = searchParams.get('redirect');
            router.push(redirectUrl || '/');
        }
    }, [router, user, sessionLoading, searchParams]);

    const getDeviceInfo = useCallback(() => {
        if (typeof window === 'undefined') return {};
        const storageKey = 'nlf_device_id';
        let deviceId = window.localStorage.getItem(storageKey);
        if (!deviceId && window.crypto?.randomUUID) {
            deviceId = window.crypto.randomUUID();
            window.localStorage.setItem(storageKey, deviceId);
        }
        const ua = window.navigator.userAgent || '';
        let browser = 'Browser';
        if (ua.includes('Edg/')) browser = 'Edge';
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        const platform = window.navigator.platform || 'Web';
        const deviceName = `${platform} ${browser}`.trim();
        return { deviceId, deviceName };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const deviceInfo = getDeviceInfo();
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isLogin ? 'login' : 'signup',
                    email,
                    password,
                    username: !isLogin ? username : undefined,
                    ...deviceInfo,
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(isLogin ? 'Login successful! Redirecting...' : 'Account created! Redirecting...');
                await refresh();
                setTimeout(() => {
                    const redirectUrl = searchParams.get('redirect') || '/';
                    const showWelcome = data?.user?.showWelcomeScreen ?? true;
                    if (showWelcome) {
                        router.push(`/welcome?redirect=${encodeURIComponent(redirectUrl)}`);
                    } else {
                        router.push(redirectUrl);
                    }
                    router.refresh();
                }, 150);
            } else {
                setError(data.error || 'An error occurred');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleCredential = useCallback(async (credential: string) => {
        if (!credential) return;
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const deviceInfo = getDeviceInfo();
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'google',
                    idToken: credential,
                    ...deviceInfo,
                })
            });
            const data = await response.json();
            if (response.ok) {
                setSuccessMessage('Signed in with Google. Redirecting...');
                await refresh();
                const redirectUrl = searchParams.get('redirect') || '/';
                const showWelcome = data?.user?.showWelcomeScreen ?? true;
                setTimeout(() => {
                    if (showWelcome) {
                        router.push(`/welcome?redirect=${encodeURIComponent(redirectUrl)}`);
                    } else {
                        router.push(redirectUrl);
                    }
                    router.refresh();
                }, 150);
            } else {
                setError(data.error || 'Google sign-in failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [getDeviceInfo, refresh, router, searchParams]);

    useEffect(() => {
        if (!googleClientId) return;
        if (typeof window === 'undefined') return;
        if (window.google?.accounts?.id) {
            setGoogleReady(true);
            return;
        }
        const existing = document.querySelector('script[data-google-identity]');
        if (existing) {
            existing.addEventListener('load', () => setGoogleReady(true), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.onload = () => setGoogleReady(true);
        script.onerror = () => setError('Google sign-in unavailable right now.');
        document.body.appendChild(script);
    }, [googleClientId]);

    useEffect(() => {
        if (!googleReady || !googleClientId || !googleButtonRef.current) return;
        if (!window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response: any) => handleGoogleCredential(response?.credential),
        });
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 360,
        });
    }, [googleReady, googleClientId, handleGoogleCredential]);

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            paddingTop: '80px',
            paddingBottom: '4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '450px',
                padding: '2rem',
                borderRadius: '1.5rem',
                background: 'rgba(167, 171, 180, 0.03)',
                border: '1px solid rgba(167, 171, 180, 0.1)',
                backdropFilter: 'blur(10px)'
            }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    borderBottom: '1px solid rgba(167, 171, 180, 0.1)',
                    paddingBottom: '1rem'
                }}>
                    <button
                        onClick={() => {
                            setIsLogin(true);
                            setError('');
                            setSuccessMessage('');
                            setPassword('');
                        }}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            background: isLogin ? 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)' : 'transparent',
                            border: isLogin ? 'none' : '1px solid rgba(167, 171, 180, 0.2)',
                            color: isLogin ? '#0B0B0D' : '#A7ABB4',
                            fontWeight: isLogin ? '700' : '600',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => {
                            setIsLogin(false);
                            setError('');
                            setSuccessMessage('');
                            setPassword('');
                        }}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            background: !isLogin ? 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)' : 'transparent',
                            border: !isLogin ? 'none' : '1px solid rgba(167, 171, 180, 0.2)',
                            color: !isLogin ? '#0B0B0D' : '#A7ABB4',
                            fontWeight: !isLogin ? '700' : '600',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Create Account
                    </button>
                </div>

                {/* Header */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '0.5rem'
                    }}>
                        {isLogin ? 'Welcome Back' : 'Join Us'}
                    </h1>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#A7ABB4'
                    }}>
                        {isLogin ? 'Sign in to your No Limit Flix account' : 'Create your No Limit Flix account'}
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#FCA5A5',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(74, 222, 128, 0.1)',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        color: '#86EFAC',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                    }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle2 className="w-4 h-4" />
                            {successMessage}
                        </span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Username (signup only) */}
                    {!isLogin && (
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#D4AF37',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Username
                            </label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                borderRadius: '0.5rem',
                                padding: '0 1rem',
                                background: 'rgba(167, 171, 180, 0.05)',
                                transition: 'all 0.2s'
                            }}>
                                <User size={18} style={{ color: '#A7ABB4', marginRight: '0.75rem' }} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Choose a username"
                                    required={!isLogin}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem 0',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#F3F4F6',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#D4AF37',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Email
                        </label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            borderRadius: '0.5rem',
                            padding: '0 1rem',
                            background: 'rgba(167, 171, 180, 0.05)',
                            transition: 'all 0.2s'
                        }}>
                            <Mail size={18} style={{ color: '#A7ABB4', marginRight: '0.75rem' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                style={{
                                    flex: 1,
                                    padding: '0.75rem 0',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#F3F4F6',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#D4AF37',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Password
                        </label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            borderRadius: '0.5rem',
                            padding: '0 1rem',
                            background: 'rgba(167, 171, 180, 0.05)',
                            transition: 'all 0.2s'
                        }}>
                            <Lock size={18} style={{ color: '#A7ABB4', marginRight: '0.75rem' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    flex: 1,
                                    padding: '0.75rem 0',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#F3F4F6',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#A7ABB4',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.875rem 1.5rem',
                            borderRadius: '0.5rem',
                            background: loading ? 'rgba(212, 175, 55, 0.3)' : 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                            border: 'none',
                            color: '#0B0B0D',
                            fontWeight: '700',
                            fontSize: '1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: loading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(212, 175, 55, 0.2)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {loading && <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />}
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {googleClientId && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ height: '1px', background: 'rgba(167, 171, 180, 0.1)', marginBottom: '1.25rem' }} />
                        <div
                            ref={googleButtonRef}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                minHeight: '44px',
                                opacity: loading ? 0.7 : 1
                            }}
                        />
                    </div>
                )}

                {/* Info Text */}
                <p style={{
                    fontSize: '0.75rem',
                    color: '#A7ABB4',
                    marginTop: '1.5rem',
                    textAlign: 'center'
                }}>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#D4AF37',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textDecoration: 'underline'
                        }}
                    >
                        {isLogin ? 'Create one' : 'Sign in'}
                    </button>
                </p>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </main>
    );
}

export default function AuthPage() {
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading...
                    </div>
                </main>
            )}
        >
            <AuthContent />
        </Suspense>
    );
}
