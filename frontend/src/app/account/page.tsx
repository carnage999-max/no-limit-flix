'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AccountPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isLogin ? 'login' : 'signup',
                    email,
                    password,
                    username: !isLogin ? username : undefined
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to account dashboard
                router.push('/account/dashboard');
                router.refresh();
            } else {
                setError(data.error || 'An error occurred');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                maxWidth: '500px',
                padding: '2rem',
                borderRadius: '1.5rem',
                background: 'rgba(167, 171, 180, 0.03)',
                border: '1px solid rgba(167, 171, 180, 0.1)',
                backdropFilter: 'blur(10px)'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#A7ABB4',
                        marginTop: '0.5rem'
                    }}>
                        {isLogin ? 'Sign in to your No Limit Flix account' : 'Join No Limit Flix today'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            style={{
                                width: '100%',
                                padding: '1rem 1.25rem',
                                background: 'rgba(167, 171, 180, 0.05)',
                                border: error ? '1px solid #F43F5E' : '1px solid rgba(167, 171, 180, 0.2)',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                color: '#F3F4F6',
                                outline: 'none',
                                transition: 'all 0.3s',
                                backdropFilter: 'blur(10px)'
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
                        />
                    </div>

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
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Your username"
                                required={!isLogin}
                                style={{
                                    width: '100%',
                                    padding: '1rem 1.25rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(167, 171, 180, 0.2)',
                                    borderRadius: '0.75rem',
                                    fontSize: '1rem',
                                    color: '#F3F4F6',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    backdropFilter: 'blur(10px)'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = '#D4AF37';
                                    e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                    e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    )}

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
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%',
                                padding: '1rem 1.25rem',
                                background: 'rgba(167, 171, 180, 0.05)',
                                border: error ? '1px solid #F43F5E' : '1px solid rgba(167, 171, 180, 0.2)',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                color: '#F3F4F6',
                                outline: 'none',
                                transition: 'all 0.3s',
                                backdropFilter: 'blur(10px)'
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
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '1rem 1.25rem',
                            background: 'rgba(244, 63, 94, 0.1)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            borderRadius: '0.75rem',
                            color: '#F43F5E',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '1.125rem 2rem',
                            background: loading ? 'rgba(212, 175, 55, 0.3)' : 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                            border: 'none',
                            borderRadius: '0.75rem',
                            color: loading ? '#A7ABB4' : '#0B0B0D',
                            fontWeight: '700',
                            fontSize: '1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: '0 10px 30px rgba(212, 175, 55, 0.2)',
                            opacity: loading ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.boxShadow = '0 15px 40px rgba(212, 175, 55, 0.35)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(212, 175, 55, 0.2)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                {/* Toggle */}
                <div style={{
                    marginTop: '2rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid rgba(167, 171, 180, 0.1)',
                    textAlign: 'center'
                }}>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#A7ABB4',
                        marginBottom: '1rem'
                    }}>
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    </p>
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setEmail('');
                            setPassword('');
                            setUsername('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#D4AF37',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#F6D365';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#D4AF37';
                        }}
                    >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>

                {/* Back to Home */}
                <div style={{
                    marginTop: '2rem',
                    textAlign: 'center'
                }}>
                    <Link
                        href="/"
                        style={{
                            fontSize: '0.875rem',
                            color: '#A7ABB4',
                            textDecoration: 'none',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = '#D4AF37';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = '#A7ABB4';
                        }}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
