'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, User as UserIcon } from 'lucide-react';

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
}

interface UsersResponse {
    users: User[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [promoting, setPromoting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const pageSize = 10;

    // Check if admin session exists
    useEffect(() => {
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession) {
            router.push('/admin');
            return;
        }
        fetchUsers(1);
    }, [router]);

    const fetchUsers = async (page: number = 1) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                search: searchQuery
            });
            const response = await fetch(`/api/admin/users?${queryParams}`);
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data.users || []);
            setTotalPages(data.totalPages || 1);
            setCurrentPage(page);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handlePromoteToAdmin = async () => {
        if (!selectedUserId) {
            setError('Please select a user');
            return;
        }

        setPromoting(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch('/api/admin/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUserId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to promote user');
            }

            setSuccessMessage(`User promoted to admin successfully!`);
            setSelectedUserId('');
            fetchUsers(currentPage); // Refresh users list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to promote user');
        } finally {
            setPromoting(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
        // Fetch with new search
        setTimeout(() => {
            (async () => {
                const queryParams = new URLSearchParams({
                    page: '1',
                    pageSize: pageSize.toString(),
                    search: query
                });
                try {
                    const response = await fetch(`/api/admin/users?${queryParams}`);
                    if (response.ok) {
                        const data = await response.json();
                        setUsers(data.users || []);
                        setTotalPages(data.totalPages || 1);
                    }
                } catch (err) {
                    console.error('Search error:', err);
                }
            })();
        }, 300);
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            paddingTop: '80px',
            paddingBottom: '4rem'
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '2rem',
            }}>
                {/* Header */}
                <div style={{
                    marginBottom: '3rem',
                    paddingBottom: '2rem',
                    borderBottom: '1px solid rgba(167, 171, 180, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <Link
                            href="/admin"
                            style={{
                                color: '#D4AF37',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </span>
                        </Link>
                    </div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '0.5rem'
                    }}>
                        Admin Settings
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#A7ABB4'
                    }}>
                        Manage administrator access and user roles
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#FCA5A5',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(74, 222, 128, 0.1)',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        color: '#86EFAC',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle2 className="w-4 h-4" />
                            {successMessage}
                        </span>
                    </div>
                )}

                {/* Promote User Section */}
                <div style={{
                    padding: '2rem',
                    borderRadius: '1.25rem',
                    background: 'rgba(167, 171, 180, 0.03)',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(167, 171, 180, 0.1)'
                    }}>
                        Promote User to Admin
                    </h2>

                    {/* Search Bar */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            placeholder="Search by username or email..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                background: 'rgba(167, 171, 180, 0.05)',
                                color: '#F3F4F6',
                                fontSize: '1rem',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.08)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                            }}
                        />
                    </div>                    {loading ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#A7ABB4'
                        }}>
                            Loading users...
                        </div>
                    ) : users.length === 0 ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#A7ABB4'
                        }}>
                            No users found
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#D4AF37',
                                    marginBottom: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Select User
                                </label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => {
                                        setSelectedUserId(e.target.value);
                                        setError('');
                                        setSuccessMessage('');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(167, 171, 180, 0.2)',
                                        background: 'rgba(167, 171, 180, 0.05)',
                                        color: '#F3F4F6',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.08)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                    }}
                                >
                                    <option value="">-- Choose a user --</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.username} ({user.email}) {user.role === 'admin' ? '[ADMIN]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* User Info Display */}
                            {selectedUserId && (
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(212, 175, 55, 0.05)',
                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                    marginBottom: '1.5rem'
                                }}>
                                    {(() => {
                                        const user = users.find(u => u.id === selectedUserId);
                                        return user ? (
                                            <div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                    gap: '1rem'
                                                }}>
                                                    <div>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: '#A7ABB4',
                                                            textTransform: 'uppercase',
                                                            fontWeight: '600'
                                                        }}>
                                                            Username
                                                        </span>
                                                        <div style={{
                                                            fontSize: '1rem',
                                                            color: '#F3F4F6',
                                                            fontWeight: '600',
                                                            marginTop: '0.25rem'
                                                        }}>
                                                            {user.username}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: '#A7ABB4',
                                                            textTransform: 'uppercase',
                                                            fontWeight: '600'
                                                        }}>
                                                            Email
                                                        </span>
                                                        <div style={{
                                                            fontSize: '1rem',
                                                            color: '#F3F4F6',
                                                            fontWeight: '600',
                                                            marginTop: '0.25rem'
                                                        }}>
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: '#A7ABB4',
                                                            textTransform: 'uppercase',
                                                            fontWeight: '600'
                                                        }}>
                                                            Current Role
                                                        </span>
                                                        <div style={{
                                                            fontSize: '1rem',
                                                            color: user.role === 'admin' ? '#D4AF37' : '#A7ABB4',
                                                            fontWeight: '600',
                                                            marginTop: '0.25rem',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {user.role}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}

                            <button
                                onClick={handlePromoteToAdmin}
                                disabled={!selectedUserId || promoting || users.find(u => u.id === selectedUserId)?.role === 'admin'}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    background: selectedUserId && users.find(u => u.id === selectedUserId)?.role !== 'admin'
                                        ? 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)'
                                        : 'rgba(212, 175, 55, 0.3)',
                                    border: 'none',
                                    color: selectedUserId && users.find(u => u.id === selectedUserId)?.role !== 'admin' ? '#0B0B0D' : '#A7ABB4',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    cursor: selectedUserId && users.find(u => u.id === selectedUserId)?.role !== 'admin' ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    opacity: selectedUserId && users.find(u => u.id === selectedUserId)?.role !== 'admin' ? 1 : 0.5
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedUserId && users.find(u => u.id === selectedUserId)?.role !== 'admin') {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(212, 175, 55, 0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {promoting ? 'Promoting...' : users.find(u => u.id === selectedUserId)?.role === 'admin' ? 'Already Admin' : 'Promote to Admin'}
                            </button>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div style={{
                                    marginTop: '2rem',
                                    paddingTop: '1.5rem',
                                    borderTop: '1px solid rgba(167, 171, 180, 0.1)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    <button
                                        onClick={() => fetchUsers(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                            background: currentPage === 1 ? 'rgba(212, 175, 55, 0.1)' : 'rgba(212, 175, 55, 0.15)',
                                            color: '#D4AF37',
                                            fontWeight: '600',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            opacity: currentPage === 1 ? 0.5 : 1
                                        }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <ArrowLeft className="w-4 h-4" />
                                            Previous
                                        </span>
                                    </button>

                                    <div style={{
                                        display: 'flex',
                                        gap: '0.25rem',
                                        alignItems: 'center'
                                    }}>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => fetchUsers(page)}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                                    background: page === currentPage ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.1)',
                                                    color: '#D4AF37',
                                                    fontWeight: page === currentPage ? '700' : '600',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => fetchUsers(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                            background: currentPage === totalPages ? 'rgba(212, 175, 55, 0.1)' : 'rgba(212, 175, 55, 0.15)',
                                            color: '#D4AF37',
                                            fontWeight: '600',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            opacity: currentPage === totalPages ? 0.5 : 1
                                        }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            Next
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Current Admins */}
                <div style={{
                    padding: '2rem',
                    borderRadius: '1.25rem',
                    background: 'rgba(167, 171, 180, 0.03)',
                    border: '1px solid rgba(167, 171, 180, 0.1)'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(167, 171, 180, 0.1)'
                    }}>
                        Current Administrators
                    </h2>

                    {users.filter(u => u.role === 'admin').length === 0 ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#A7ABB4'
                        }}>
                            No administrators yet. Promote a user above.
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gap: '1rem'
                        }}>
                            {users.filter(u => u.role === 'admin').map((admin) => (
                                <div
                                    key={admin.id}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        background: 'rgba(212, 175, 55, 0.05)',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#0B0B0D',
                                        fontWeight: '700',
                                        fontSize: '0.875rem'
                                    }}>
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#F3F4F6'
                                        }}>
                                            {admin.username}
                                        </div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: '#A7ABB4'
                                        }}>
                                            {admin.email}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '9999px',
                                        background: 'rgba(212, 175, 55, 0.2)',
                                        color: '#D4AF37',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase'
                                    }}>
                                        ADMIN
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
